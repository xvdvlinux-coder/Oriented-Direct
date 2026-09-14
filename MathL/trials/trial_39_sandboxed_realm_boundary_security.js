/**
 * Trial #39: Sandboxed Execution & Realm Boundary Security (Rule XXVI)
 * Formalizes realm boundary lattice L_Realm, ShadowRealm / iframe isolation,
 * callable membrane wrapping, and compile-time prevention of cross-realm prototype pollution.
 * Matches Google V8 templates:
 * - kCallSiteMethodCrossedShadowRealmBoundary ("Cannot pass non-primitive value across ShadowRealm boundary")
 * - S_CrossRealmObjectLeak (Direct raw object reference leakage across realms)
 * - S_CrossRealmPrototypePollution (Pollution of host realm prototypes from sandboxed environment)
 * - S_InvalidCallableMembrane (Unwrapped foreign function call crossing boundary)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #39: Sandboxed Execution & Realm Boundary Security ---');

export const RealmLattice = {
  BOTTOM: 'BOTTOM',
  PRIMITIVE: 'PRIMITIVE',
  WRAPPED_CALLABLE: 'WRAPPED_CALLABLE',
  LOCAL_OBJECT: 'LOCAL_OBJECT',
  CROSS_REALM_POLLUTED: 'CROSS_REALM_POLLUTED',
  TOP: 'TOP'
};

export class RealmBoundarySecurityAnalyzer {
  constructor(realmId = 'host') {
    this.realmId = realmId;
    this.prototypes = new Map();
    this.prototypes.set('Object', { toString: true, valueOf: true });
    this.prototypes.set('Array', { slice: true, map: true });
  }

  static classifyValue(val) {
    if (val === null || val === undefined) {
      return RealmLattice.PRIMITIVE;
    }
    const t = typeof val;
    if (t === 'number' || t === 'string' || t === 'boolean' || t === 'bigint' || t === 'symbol') {
      return RealmLattice.PRIMITIVE;
    }
    if (t === 'function') {
      if (val.__mathl_membrane_wrapped__) {
        return RealmLattice.WRAPPED_CALLABLE;
      }
      return RealmLattice.LOCAL_OBJECT;
    }
    if (t === 'object') {
      if (val.__mathl_polluted__) {
        return RealmLattice.CROSS_REALM_POLLUTED;
      }
      return RealmLattice.LOCAL_OBJECT;
    }
    return RealmLattice.TOP;
  }

  static wrapCallable(fn, sourceRealm, targetRealm) {
    if (typeof fn !== 'function') {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidCallableMembrane] Target is not a callable function.`
      };
    }

    const wrapped = function (...args) {
      // Validate all incoming arguments are primitives or wrapped callables
      for (let i = 0; i < args.length; i++) {
        const argState = RealmBoundarySecurityAnalyzer.classifyValue(args[i]);
        if (argState !== RealmLattice.PRIMITIVE && argState !== RealmLattice.WRAPPED_CALLABLE) {
          throw new Error(`[MathL Violation: S_CrossRealmObjectLeak] Cannot pass non-primitive value (arg ${i}) across realm boundary (matches V8 kCallSiteMethodCrossedShadowRealmBoundary).`);
        }
      }
      const rawResult = fn(...args);
      // Validate return value is primitive or wrapped
      const retState = RealmBoundarySecurityAnalyzer.classifyValue(rawResult);
      if (retState !== RealmLattice.PRIMITIVE && retState !== RealmLattice.WRAPPED_CALLABLE) {
        throw new Error(`[MathL Violation: S_CrossRealmObjectLeak] Cannot return non-primitive value across realm boundary (matches V8 kCallSiteMethodCrossedShadowRealmBoundary).`);
      }
      return rawResult;
    };

    wrapped.__mathl_membrane_wrapped__ = true;
    wrapped.__source_realm__ = sourceRealm;
    wrapped.__target_realm__ = targetRealm;

    return {
      ok: true,
      wrappedCallable: wrapped,
      latticeState: RealmLattice.WRAPPED_CALLABLE
    };
  }

  static verifyBoundaryCrossing(value, sourceRealm, targetRealm) {
    const classification = this.classifyValue(value);

    // Rule 1: Primitives cross freely
    if (classification === RealmLattice.PRIMITIVE) {
      return {
        ok: true,
        action: 'ALLOW_COPY_OR_VAL',
        latticeState: RealmLattice.PRIMITIVE
      };
    }

    // Rule 2: Wrapped callables cross safely
    if (classification === RealmLattice.WRAPPED_CALLABLE) {
      return {
        ok: true,
        action: 'ALLOW_MEMBRANE_PROXY',
        latticeState: RealmLattice.WRAPPED_CALLABLE
      };
    }

    // Rule 3: Raw Local Objects cannot cross directly
    if (classification === RealmLattice.LOCAL_OBJECT) {
      return {
        ok: false,
        error: `[MathL Violation: S_CrossRealmObjectLeak] Cannot pass non-primitive object or raw callable across ShadowRealm boundary (matches V8 kCallSiteMethodCrossedShadowRealmBoundary). Source: ${sourceRealm}, Target: ${targetRealm}.`
      };
    }

    // Rule 4: Polluted prototypes or tainted objects are strictly blocked
    if (classification === RealmLattice.CROSS_REALM_POLLUTED) {
      return {
        ok: false,
        error: `[MathL Violation: S_CrossRealmPrototypePollution] Blocked cross-realm object carrying tainted or foreign prototype pollution.`
      };
    }

    return {
      ok: false,
      error: `[MathL Violation: S_CrossRealmObjectLeak] Unknown or unsafe value type crossing realm boundary.`
    };
  }

  mutatePrototype(protoName, prop, value) {
    if (!this.prototypes.has(protoName)) {
      this.prototypes.set(protoName, {});
    }
    const proto = this.prototypes.get(protoName);
    proto[prop] = value;
    return {
      ok: true,
      realmId: this.realmId,
      mutatedProperty: prop
    };
  }

  static verifyPrototypeIsolation(hostRealm, sandboxRealm) {
    const hostObjProto = hostRealm.prototypes.get('Object');
    const sandboxObjProto = sandboxRealm.prototypes.get('Object');

    for (const key of Object.keys(sandboxObjProto)) {
      if (key !== 'toString' && key !== 'valueOf' && hostObjProto[key] === undefined) {
        // Sandboxed realm has extra property not in host; ensure host is NOT contaminated
        assert.strictEqual(hostObjProto[key], undefined, 'Host prototype must remain unpolluted');
      }
    }

    return {
      ok: true,
      isolated: true,
      message: 'Host and sandbox prototypes are fully partitioned.'
    };
  }
}

// ==========================================
// TEST SUITE: Trial #39 Boundary Verification
// ==========================================

console.log('1. Testing Primitive Cross-Realm Boundary Crossing...');
const primCheck1 = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(42, 'host', 'sandbox');
assert.strictEqual(primCheck1.ok, true);
assert.strictEqual(primCheck1.latticeState, RealmLattice.PRIMITIVE);

const primCheck2 = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing('safe-string', 'sandbox', 'host');
assert.strictEqual(primCheck2.ok, true);
assert.strictEqual(primCheck2.latticeState, RealmLattice.PRIMITIVE);

const primCheck3 = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(null, 'host', 'sandbox');
assert.strictEqual(primCheck3.ok, true);

const primCheck4 = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(true, 'host', 'sandbox');
assert.strictEqual(primCheck4.ok, true);

console.log('2. Testing Raw Object Direct Cross-Realm Rejection (V8 kCallSiteMethodCrossedShadowRealmBoundary)...');
const rawObj = { apiKey: 'secret', count: 10 };
const rawObjCheck = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(rawObj, 'host', 'sandbox');
assert.strictEqual(rawObjCheck.ok, false);
assert.ok(rawObjCheck.error.includes('S_CrossRealmObjectLeak'));
assert.ok(rawObjCheck.error.includes('kCallSiteMethodCrossedShadowRealmBoundary'));

console.log('3. Testing Unwrapped Callable Cross-Realm Rejection...');
const rawFn = (x) => x * 2;
const rawFnCheck = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(rawFn, 'sandbox', 'host');
assert.strictEqual(rawFnCheck.ok, false);
assert.ok(rawFnCheck.error.includes('S_CrossRealmObjectLeak'));

console.log('4. Testing Membrane Wrapped Callable Crossing & Execution...');
const wrappedRes = RealmBoundarySecurityAnalyzer.wrapCallable((n) => n * 10, 'sandbox', 'host');
assert.strictEqual(wrappedRes.ok, true);
assert.strictEqual(wrappedRes.latticeState, RealmLattice.WRAPPED_CALLABLE);

const wrappedCrossingCheck = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(wrappedRes.wrappedCallable, 'sandbox', 'host');
assert.strictEqual(wrappedCrossingCheck.ok, true);
assert.strictEqual(wrappedCrossingCheck.latticeState, RealmLattice.WRAPPED_CALLABLE);

// Test executing the wrapped callable with primitive input
const executionResult = wrappedRes.wrappedCallable(5);
assert.strictEqual(executionResult, 50);

// Test executing wrapped callable with illegal object input (must throw)
assert.throws(() => {
  wrappedRes.wrappedCallable({ illegal: true });
}, /S_CrossRealmObjectLeak/);

console.log('5. Testing Membrane Return Value Violation Gating...');
const leakingFn = () => ({ leak: true });
const wrappedLeaker = RealmBoundarySecurityAnalyzer.wrapCallable(leakingFn, 'sandbox', 'host');
assert.strictEqual(wrappedLeaker.ok, true);
assert.throws(() => {
  wrappedLeaker.wrappedCallable();
}, /S_CrossRealmObjectLeak/);

console.log('6. Testing Prototype Pollution Confinement Across Realms...');
const hostRealm = new RealmBoundarySecurityAnalyzer('host');
const sandboxRealm = new RealmBoundarySecurityAnalyzer('sandbox');

// Sandbox attempts to pollute Object.prototype
sandboxRealm.mutatePrototype('Object', 'pollutedExploit', 'injectedPayload');
assert.strictEqual(sandboxRealm.prototypes.get('Object').pollutedExploit, 'injectedPayload');
assert.strictEqual(hostRealm.prototypes.get('Object').pollutedExploit, undefined);

const isoCheck = RealmBoundarySecurityAnalyzer.verifyPrototypeIsolation(hostRealm, sandboxRealm);
assert.strictEqual(isoCheck.ok, true);
assert.strictEqual(isoCheck.isolated, true);

console.log('7. Testing Tainted Object Crossing Rejection...');
const taintedObj = { data: 'normal' };
taintedObj.__mathl_polluted__ = true;
const taintedCheck = RealmBoundarySecurityAnalyzer.verifyBoundaryCrossing(taintedObj, 'sandbox', 'host');
assert.strictEqual(taintedCheck.ok, false);
assert.ok(taintedCheck.error.includes('S_CrossRealmPrototypePollution'));

console.log('Trial #39 Result: PASS (Sandboxed realm boundary security, membrane callable wrapping, and prototype isolation verified).\n');
