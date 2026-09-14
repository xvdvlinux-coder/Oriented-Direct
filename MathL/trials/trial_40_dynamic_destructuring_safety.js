/**
 * Trial #40: Dynamic Pattern Destructuring & Rest/Spread Invariance (Rule XXVII)
 * Formalizes destructuring coercibility lattice L_Coerce, deep pattern traversal,
 * rest/spread shape preservation, and compile-time prevention of non-coercible dereferencing.
 * Matches Google V8 templates:
 * - kNonCoercible ("Cannot destructure '%' as it is %")
 * - kNonCoercibleWithProperty ("Cannot destructure property '%' of '%' as it is %")
 * - kNonIterable ("% is not iterable")
 * - S_NonCoercibleDestructure (Destructuring null/undefined)
 * - S_NonIterableDestructure (Array destructuring of non-iterable primitives)
 * - S_NestedDestructureNullLeak (Nested path evaluates to null/undefined)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #40: Dynamic Pattern Destructuring & Rest/Spread Invariance ---');

export const CoerceLattice = {
  BOTTOM: 'BOTTOM',
  NON_COERCIBLE_NULL: 'NON_COERCIBLE_NULL',
  NON_COERCIBLE_UNDEFINED: 'NON_COERCIBLE_UNDEFINED',
  COERCIBLE_PRIMITIVE: 'COERCIBLE_PRIMITIVE', // number, boolean, string (can be boxed for prop read, not iterable)
  COERCIBLE_OBJECT: 'COERCIBLE_OBJECT',
  COERCIBLE_ITERABLE: 'COERCIBLE_ITERABLE',
  TOP: 'TOP'
};

export class DynamicDestructuringAnalyzer {
  static classifyValue(val) {
    if (val === null) return CoerceLattice.NON_COERCIBLE_NULL;
    if (val === undefined) return CoerceLattice.NON_COERCIBLE_UNDEFINED;
    if (Array.isArray(val) || (typeof val === 'object' && val !== null && typeof val[Symbol.iterator] === 'function')) {
      return CoerceLattice.COERCIBLE_ITERABLE;
    }
    if (typeof val === 'object') return CoerceLattice.COERCIBLE_OBJECT;
    if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string' || typeof val === 'bigint') {
      return CoerceLattice.COERCIBLE_PRIMITIVE;
    }
    return CoerceLattice.TOP;
  }

  static verifyObjectDestructuring(sourceVal, pattern, varName = 'val') {
    const classification = this.classifyValue(sourceVal);

    // Rule 1: Cannot destructure null or undefined
    if (classification === CoerceLattice.NON_COERCIBLE_NULL) {
      return {
        ok: false,
        error: `[MathL Violation: S_NonCoercibleDestructure] Cannot destructure '${varName}' as it is null (matches V8 kNonCoercible).`
      };
    }
    if (classification === CoerceLattice.NON_COERCIBLE_UNDEFINED) {
      return {
        ok: false,
        error: `[MathL Violation: S_NonCoercibleDestructure] Cannot destructure '${varName}' as it is undefined (matches V8 kNonCoercible).`
      };
    }

    // Pattern traversal and nested destructuring
    const extractedVariables = {};
    const remainingKeys = (classification === CoerceLattice.COERCIBLE_OBJECT && sourceVal) 
      ? new Set(Object.keys(sourceVal))
      : new Set();

    for (const [propKey, subPattern] of Object.entries(pattern)) {
      if (propKey === '...rest') {
        // Object rest pattern: extract unmentioned properties
        const restObj = {};
        for (const k of remainingKeys) {
          restObj[k] = sourceVal[k];
        }
        extractedVariables[subPattern] = restObj;
        continue;
      }

      remainingKeys.delete(propKey);

      const propValue = (typeof sourceVal === 'object' && sourceVal !== null) 
        ? sourceVal[propKey] 
        : (sourceVal !== null && sourceVal !== undefined ? sourceVal[propKey] : undefined);

      if (typeof subPattern === 'string') {
        // Simple binding: const { a: alias } = sourceVal;
        extractedVariables[subPattern] = propValue;
      } else if (typeof subPattern === 'object' && subPattern !== null) {
        // Nested pattern: const { a: { b } } = sourceVal;
        if (propValue === null || propValue === undefined) {
          const actualType = propValue === null ? 'null' : 'undefined';
          return {
            ok: false,
            error: `[MathL Violation: S_NestedDestructureNullLeak] Cannot destructure property '${propKey}' of '${varName}' as it is ${actualType} (matches V8 kNonCoercibleWithProperty).`
          };
        }
        // Recursively verify nested pattern
        const nestedRes = this.verifyObjectDestructuring(propValue, subPattern, `${varName}.${propKey}`);
        if (!nestedRes.ok) return nestedRes;
        Object.assign(extractedVariables, nestedRes.extractedVariables);
      }
    }

    return {
      ok: true,
      classification,
      extractedVariables
    };
  }

  static verifyArrayDestructuring(sourceVal, pattern, varName = 'arr') {
    const classification = this.classifyValue(sourceVal);

    // Rule 1: Null/undefined cannot be destructured
    if (classification === CoerceLattice.NON_COERCIBLE_NULL) {
      return {
        ok: false,
        error: `[MathL Violation: S_NonCoercibleDestructure] Cannot destructure '${varName}' as it is null (matches V8 kNonCoercible).`
      };
    }
    if (classification === CoerceLattice.NON_COERCIBLE_UNDEFINED) {
      return {
        ok: false,
        error: `[MathL Violation: S_NonCoercibleDestructure] Cannot destructure '${varName}' as it is undefined (matches V8 kNonCoercible).`
      };
    }

    // Rule 2: Non-iterables cannot be array-destructured
    if (classification !== CoerceLattice.COERCIBLE_ITERABLE && typeof sourceVal !== 'string') {
      return {
        ok: false,
        error: `[MathL Violation: S_NonIterableDestructure] ${typeof sourceVal} is not iterable (matches V8 kNonIterable).`
      };
    }

    const items = Array.isArray(sourceVal) ? sourceVal : Array.from(sourceVal);
    const extractedVariables = {};

    let index = 0;
    for (const pat of pattern) {
      if (pat.startsWith('...')) {
        // Array rest element: [...rest]
        const restVar = pat.slice(3);
        extractedVariables[restVar] = items.slice(index);
        break;
      }
      extractedVariables[pat] = items[index];
      index++;
    }

    return {
      ok: true,
      classification,
      extractedVariables
    };
  }

  static verifyFlowGuardedDestructure(sourceVal, guardCondition, pattern, isArray = false) {
    // Flow promotion: unless (val) return; eliminates NonCoercible
    if (guardCondition === 'UNLESS_NULL_RETURN' || guardCondition === 'IF_NON_NULL') {
      if (sourceVal === null || sourceVal === undefined) {
        // Guarded branch terminates early or returns, so no error reaches destructuring!
        return {
          ok: true,
          guardedPruned: true,
          message: 'Branch pruned by flow guard refinement: destructuring is unreachable for null/undefined.'
        };
      }
    }

    if (isArray) {
      return this.verifyArrayDestructuring(sourceVal, pattern);
    } else {
      return this.verifyObjectDestructuring(sourceVal, pattern);
    }
  }
}

// ==========================================
// TEST SUITE: Trial #40 Destructuring Safety
// ==========================================

console.log('1. Testing Direct Null/Undefined Object Destructuring Rejection (V8 kNonCoercible)...');
const nullObjCheck = DynamicDestructuringAnalyzer.verifyObjectDestructuring(null, { x: 'x', y: 'y' }, 'coords');
assert.strictEqual(nullObjCheck.ok, false);
assert.ok(nullObjCheck.error.includes('S_NonCoercibleDestructure'));
assert.ok(nullObjCheck.error.includes('kNonCoercible'));

const undefObjCheck = DynamicDestructuringAnalyzer.verifyObjectDestructuring(undefined, { name: 'name' }, 'user');
assert.strictEqual(undefObjCheck.ok, false);
assert.ok(undefObjCheck.error.includes('S_NonCoercibleDestructure'));

console.log('2. Testing Safe Object Destructuring with Rest Spread...');
const validConfig = { host: 'localhost', port: 8080, debug: true, timeout: 5000 };
const safeObjRes = DynamicDestructuringAnalyzer.verifyObjectDestructuring(validConfig, {
  host: 'hostName',
  port: 'portNum',
  '...rest': 'otherConfig'
});
assert.strictEqual(safeObjRes.ok, true);
assert.strictEqual(safeObjRes.extractedVariables.hostName, 'localhost');
assert.strictEqual(safeObjRes.extractedVariables.portNum, 8080);
assert.deepStrictEqual(safeObjRes.extractedVariables.otherConfig, { debug: true, timeout: 5000 });

console.log('3. Testing Nested Property Destructuring Failure on Null (V8 kNonCoercibleWithProperty)...');
const userRecord = { id: 101, profile: null };
const nestedNullCheck = DynamicDestructuringAnalyzer.verifyObjectDestructuring(userRecord, {
  id: 'userId',
  profile: {
    avatar: 'userAvatar'
  }
}, 'userRecord');
assert.strictEqual(nestedNullCheck.ok, false);
assert.ok(nestedNullCheck.error.includes('S_NestedDestructureNullLeak'));
assert.ok(nestedNullCheck.error.includes('kNonCoercibleWithProperty'));

console.log('4. Testing Valid Nested Destructuring...');
const fullRecord = { id: 102, profile: { avatar: 'avatar.png', bio: 'Developer' } };
const validNestedRes = DynamicDestructuringAnalyzer.verifyObjectDestructuring(fullRecord, {
  id: 'userId',
  profile: {
    avatar: 'userAvatar',
    bio: 'userBio'
  }
}, 'fullRecord');
assert.strictEqual(validNestedRes.ok, true);
assert.strictEqual(validNestedRes.extractedVariables.userId, 102);
assert.strictEqual(validNestedRes.extractedVariables.userAvatar, 'avatar.png');
assert.strictEqual(validNestedRes.extractedVariables.userBio, 'Developer');

console.log('5. Testing Non-Iterable Array Destructuring Rejection (V8 kNonIterable)...');
const nonIterableCheck = DynamicDestructuringAnalyzer.verifyArrayDestructuring(12345, ['a', 'b'], 'numericVal');
assert.strictEqual(nonIterableCheck.ok, false);
assert.ok(nonIterableCheck.error.includes('S_NonIterableDestructure'));
assert.ok(nonIterableCheck.error.includes('kNonIterable'));

console.log('6. Testing Safe Array Destructuring with Rest Spread...');
const colors = ['red', 'green', 'blue', 'yellow', 'cyan'];
const safeArrRes = DynamicDestructuringAnalyzer.verifyArrayDestructuring(colors, ['primary', 'secondary', '...remaining']);
assert.strictEqual(safeArrRes.ok, true);
assert.strictEqual(safeArrRes.extractedVariables.primary, 'red');
assert.strictEqual(safeArrRes.extractedVariables.secondary, 'green');
assert.deepStrictEqual(safeArrRes.extractedVariables.remaining, ['blue', 'yellow', 'cyan']);

console.log('7. Testing Flow Guard Refinement on Potentially Null Values...');
// When guarded with 'UNLESS_NULL_RETURN', null values do not trigger destructure errors because the branch exits early
const guardedNullRes = DynamicDestructuringAnalyzer.verifyFlowGuardedDestructure(null, 'UNLESS_NULL_RETURN', { token: 't' });
assert.strictEqual(guardedNullRes.ok, true);
assert.strictEqual(guardedNullRes.guardedPruned, true);

// When non-null, guarded destructuring succeeds normally
const guardedValidRes = DynamicDestructuringAnalyzer.verifyFlowGuardedDestructure({ token: 'abc-123' }, 'UNLESS_NULL_RETURN', { token: 'sessionToken' });
assert.strictEqual(guardedValidRes.ok, true);
assert.strictEqual(guardedValidRes.extractedVariables.sessionToken, 'abc-123');

console.log('Trial #40 Result: PASS (Dynamic pattern destructuring, rest/spread invariants, and V8 non-coercible prevention verified).\n');
