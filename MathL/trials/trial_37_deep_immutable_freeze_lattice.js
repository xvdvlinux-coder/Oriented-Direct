/**
 * Trial #37: Deep Recursive Freeze & Immutable Shape Lattices (Rule XXIV)
 * Formalizes deep immutability lattice L_Freeze, recursive fixed-point freezing,
 * cycle handling, and compile-time prevention of frozen property mutations matching Google V8 templates:
 * - kStrictReadOnlyProperty ("Cannot assign to read only property '%' of object '%'")
 * - kCannotFreezeArrayBufferView ("Cannot freeze array buffer views with elements")
 * - S_ShallowFreezeLeak (Nested object left mutable by shallow Object.freeze)
 * - S_FrozenArrayMutation (Calling mutating array methods on frozen collections)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #37: Deep Recursive Freeze & Immutable Shape Lattices ---');

export const FreezeState = {
  BOTTOM: 'BOTTOM',
  MUTABLE: 'MUTABLE',
  SHALLOW_FROZEN: 'SHALLOW_FROZEN',
  DEEP_FROZEN: 'DEEP_FROZEN',
  TOP: 'TOP'
};

const ArrayMutatingMethods = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'
]);

export class ImmutableShapeAnalyzer {
  static isPrimitive(val) {
    return val === null || (typeof val !== 'object' && typeof val !== 'function');
  }

  static isArrayBufferView(val) {
    if (!val || typeof val !== 'object') return false;
    return ArrayBuffer.isView(val);
  }

  static freezeShallow(obj) {
    if (this.isPrimitive(obj)) {
      return { ok: true, state: FreezeState.DEEP_FROZEN, object: obj };
    }

    if (this.isArrayBufferView(obj)) {
      return {
        ok: false,
        error: `[MathL Violation: S_CannotFreezeArrayBufferView] Cannot freeze array buffer views with elements (matches V8 kCannotFreezeArrayBufferView).`
      };
    }

    // Attach metadata lattice state
    obj.__mathl_freeze_state__ = FreezeState.SHALLOW_FROZEN;
    Object.freeze(obj);

    return { ok: true, state: FreezeState.SHALLOW_FROZEN, object: obj };
  }

  static freezeDeep(obj, visited = new Set()) {
    if (this.isPrimitive(obj)) {
      return { ok: true, state: FreezeState.DEEP_FROZEN, object: obj };
    }

    if (this.isArrayBufferView(obj)) {
      return {
        ok: false,
        error: `[MathL Violation: S_CannotFreezeArrayBufferView] Cannot freeze array buffer views with elements (matches V8 kCannotFreezeArrayBufferView).`
      };
    }

    if (visited.has(obj)) {
      return { ok: true, state: FreezeState.DEEP_FROZEN, object: obj };
    }
    visited.add(obj);

    // Recursively freeze all own properties
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
      if (name === '__mathl_freeze_state__') continue;
      const desc = Object.getOwnPropertyDescriptor(obj, name);
      if (desc && desc.value && typeof desc.value === 'object') {
        const subRes = this.freezeDeep(desc.value, visited);
        if (!subRes.ok) {
          return subRes;
        }
      }
    }

    // Freeze prototype if custom
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype && proto !== Array.prototype && !visited.has(proto)) {
      const protoRes = this.freezeDeep(proto, visited);
      if (!protoRes.ok) return protoRes;
    }

    obj.__mathl_freeze_state__ = FreezeState.DEEP_FROZEN;
    Object.freeze(obj);

    return { ok: true, state: FreezeState.DEEP_FROZEN, object: obj };
  }

  static verifyPropertyMutation(obj, path, prop, value) {
    if (!obj || typeof obj !== 'object') {
      return { ok: true };
    }

    const state = obj.__mathl_freeze_state__ || FreezeState.MUTABLE;

    if (state === FreezeState.SHALLOW_FROZEN) {
      // Direct root mutation is forbidden
      return {
        ok: false,
        error: `[MathL Violation: S_FrozenPropertyMutation] Cannot assign to read only property '${prop}' of object '${path}' (matches V8 kStrictReadOnlyProperty).`
      };
    }

    if (state === FreezeState.DEEP_FROZEN) {
      return {
        ok: false,
        error: `[MathL Violation: S_FrozenPropertyMutation] Cannot assign to read only property '${prop}' of deep frozen object '${path}' (matches V8 kStrictReadOnlyProperty).`
      };
    }

    return { ok: true };
  }

  static verifyNestedMutation(rootObj, pathSegments, newValue) {
    let current = rootObj;
    let traversedPath = 'root';
    const rootState = rootObj.__mathl_freeze_state__ || FreezeState.MUTABLE;

    for (let i = 0; i < pathSegments.length - 1; i++) {
      const seg = pathSegments[i];
      traversedPath += `.${seg}`;
      if (!current || typeof current !== 'object') break;
      current = current[seg];
    }

    const lastProp = pathSegments[pathSegments.length - 1];

    if (!current || typeof current !== 'object') {
      return { ok: false, error: `[MathL Violation: S_NullDereference] Cannot access property '${lastProp}' of undefined.` };
    }

    const targetState = current.__mathl_freeze_state__ || FreezeState.MUTABLE;

    // Deep freeze violation
    if (rootState === FreezeState.DEEP_FROZEN || targetState === FreezeState.DEEP_FROZEN) {
      return {
        ok: false,
        error: `[MathL Violation: S_FrozenPropertyMutation] Cannot assign to read only property '${lastProp}' of deep frozen object '${traversedPath}'.`
      };
    }

    // Shallow freeze leak detection
    if (rootState === FreezeState.SHALLOW_FROZEN && targetState === FreezeState.MUTABLE) {
      return {
        ok: false,
        error: `[MathL Violation: S_ShallowFreezeLeak] Latent mutation on nested property '${traversedPath}.${lastProp}' inside shallow-frozen root. Object requires recursive deep freeze.`
      };
    }

    return { ok: true };
  }

  static verifyMethodCall(obj, path, methodName, args = []) {
    if (!obj || typeof obj !== 'object') return { ok: true };

    const state = obj.__mathl_freeze_state__ || FreezeState.MUTABLE;

    if (Array.isArray(obj) && ArrayMutatingMethods.has(methodName)) {
      if (state === FreezeState.SHALLOW_FROZEN || state === FreezeState.DEEP_FROZEN) {
        return {
          ok: false,
          error: `[MathL Violation: S_FrozenArrayMutation] Cannot call mutating method '${methodName}()' on frozen array '${path}'.`
        };
      }
    }

    return { ok: true };
  }
}

// =========================================================================
// VERIFICATION SUITE
// =========================================================================

// 1. Shallow Freeze vs Deep Freeze Lattice Transitions
console.log('1. Testing Shallow Freeze vs Deep Freeze Lattice States...');
const shallowObj = {
  name: 'Config',
  database: { host: 'localhost', port: 5432 }
};

const shallowRes = ImmutableShapeAnalyzer.freezeShallow(shallowObj);
assert.strictEqual(shallowRes.ok, true);
assert.strictEqual(shallowRes.state, FreezeState.SHALLOW_FROZEN);
assert.strictEqual(shallowObj.__mathl_freeze_state__, FreezeState.SHALLOW_FROZEN);
// Nested object is not marked frozen in shallow freeze
assert.strictEqual(shallowObj.database.__mathl_freeze_state__, undefined);

// 2. Direct Root Property Mutation Rejection
console.log('2. Testing Direct Frozen Property Mutation Rejection...');
const directMutRes = ImmutableShapeAnalyzer.verifyPropertyMutation(shallowObj, 'config', 'name', 'NewConfig');
assert.strictEqual(directMutRes.ok, false);
assert.ok(directMutRes.error.includes('S_FrozenPropertyMutation'));
assert.ok(directMutRes.error.includes('kStrictReadOnlyProperty'));

// 3. Shallow Freeze Leak Detection on Nested Mutability
console.log('3. Testing Shallow Freeze Leak Detection on Nested Path...');
const nestedLeakRes = ImmutableShapeAnalyzer.verifyNestedMutation(shallowObj, ['database', 'port'], 5433);
assert.strictEqual(nestedLeakRes.ok, false);
assert.ok(nestedLeakRes.error.includes('S_ShallowFreezeLeak'));

// 4. Deep Recursive Freeze on Nested Trees
console.log('4. Testing Recursive Deep Freeze...');
const complexTree = {
  appName: 'OrientedApp',
  theme: {
    colors: {
      primary: '#0055ff',
      background: '#ffffff'
    },
    fonts: ['Inter', 'monospace']
  }
};

const deepRes = ImmutableShapeAnalyzer.freezeDeep(complexTree);
assert.strictEqual(deepRes.ok, true);
assert.strictEqual(deepRes.state, FreezeState.DEEP_FROZEN);
assert.strictEqual(complexTree.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);
assert.strictEqual(complexTree.theme.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);
assert.strictEqual(complexTree.theme.colors.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);
assert.strictEqual(complexTree.theme.fonts.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);

// Verify that mutating deeply nested property is strictly blocked
const deepMutRes = ImmutableShapeAnalyzer.verifyNestedMutation(complexTree, ['theme', 'colors', 'primary'], '#000000');
assert.strictEqual(deepMutRes.ok, false);
assert.ok(deepMutRes.error.includes('S_FrozenPropertyMutation'));

// 5. Cyclic Object Graph Handling in Deep Freeze (No Infinite Loop)
console.log('5. Testing Cyclic Object Graph Deep Freezing...');
const cyclicNodeA = { id: 'A', name: 'NodeA' };
const cyclicNodeB = { id: 'B', name: 'NodeB' };
cyclicNodeA.peer = cyclicNodeB;
cyclicNodeB.peer = cyclicNodeA; // Circular reference

const cyclicFreezeRes = ImmutableShapeAnalyzer.freezeDeep(cyclicNodeA);
assert.strictEqual(cyclicFreezeRes.ok, true);
assert.strictEqual(cyclicNodeA.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);
assert.strictEqual(cyclicNodeB.__mathl_freeze_state__, FreezeState.DEEP_FROZEN);

// 6. Cannot Freeze ArrayBufferView Rejection (Google V8 Conformance)
console.log('6. Testing TypedArray / ArrayBufferView Freeze Rejection...');
const u8View = new Uint8Array(16);
const freezeViewRes = ImmutableShapeAnalyzer.freezeDeep(u8View);
assert.strictEqual(freezeViewRes.ok, false);
assert.ok(freezeViewRes.error.includes('S_CannotFreezeArrayBufferView'));
assert.ok(freezeViewRes.error.includes('kCannotFreezeArrayBufferView'));

// 7. Mutating Array Method Gating on Frozen Collections
console.log('7. Testing Mutating Array Method Prevention...');
const frozenArray = ['alpha', 'beta', 'gamma'];
ImmutableShapeAnalyzer.freezeDeep(frozenArray);

const pushCheck = ImmutableShapeAnalyzer.verifyMethodCall(frozenArray, 'list', 'push', ['delta']);
assert.strictEqual(pushCheck.ok, false);
assert.ok(pushCheck.error.includes('S_FrozenArrayMutation'));

const spliceCheck = ImmutableShapeAnalyzer.verifyMethodCall(frozenArray, 'list', 'splice', [0, 1]);
assert.strictEqual(spliceCheck.ok, false);
assert.ok(spliceCheck.error.includes('S_FrozenArrayMutation'));

// Non-mutating methods allowed
const mapCheck = ImmutableShapeAnalyzer.verifyMethodCall(frozenArray, 'list', 'map');
assert.strictEqual(mapCheck.ok, true);

console.log('Trial #37 Result: PASS (Deep recursive freeze, cycle handling, V8 conformance, and array mutation gating verified).\n');
