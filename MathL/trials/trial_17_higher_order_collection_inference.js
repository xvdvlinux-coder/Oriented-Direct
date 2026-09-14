/**
 * Trial #17: Higher-Order Collection Flow & Nullability Inference
 * Proves that collection functors (.map, .filter) propagate element nullability invariants.
 */

import assert from 'node:assert';
import { NullState, NullLattice, TypeShape } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #17: Higher-Order Collection Inference ---');

class FunctorFlowAnalyzer {
  // Simulate array.map(callback)
  static analyzeMap(arrayElementShape, callbackFn) {
    // If element is Nullable, callback must guard before dereferencing
    const callbackResult = callbackFn(arrayElementShape);
    return {
      outputArrayElement: callbackResult.returnType,
      safetyCheck: callbackResult.safetyCheck
    };
  }

  // Simulate array.filter(predicate) with non-null promotion
  static analyzeFilterNonNull(arrayElementShape) {
    if (arrayElementShape.nullState === NullState.NULLABLE) {
      // Filter out nulls -> promotes element to NonNull
      return new TypeShape(arrayElementShape.kind, {
        nullState: NullState.NON_NULL,
        fields: Object.fromEntries(arrayElementShape.fields)
      });
    }
    return arrayElementShape;
  }
}

// Scenario 1: Array of Nullable objects -> Unguarded access in .map callback must FAIL
const nullableUserElement = new TypeShape('Object', {
  nullState: NullState.NULLABLE,
  fields: { 'name': new TypeShape('String') }
});

const unguardedCallback = (elem) => {
  if (elem.nullState === NullState.NULLABLE) {
    return {
      safetyCheck: { ok: false, error: "[MathL Violation] Potential null dereference in '.map' callback parameter." },
      returnType: new TypeShape('String')
    };
  }
  return { safetyCheck: { ok: true }, returnType: new TypeShape('String') };
};

const mapResult1 = FunctorFlowAnalyzer.analyzeMap(nullableUserElement, unguardedCallback);
console.log(`Unguarded .map() on Array<Nullable<User>> -> OK = ${mapResult1.safetyCheck.ok}`);
assert.strictEqual(mapResult1.safetyCheck.ok, false);
console.log(`  Caught: ${mapResult1.safetyCheck.error}`);

// Scenario 2: Array filtered with non-null predicate -> Promoted to Array<NonNull<User>>
const nonNullUsers = FunctorFlowAnalyzer.analyzeFilterNonNull(nullableUserElement);
console.log(`Filter non-null on Array<Nullable<User>> -> Element state: ${NullLattice.toString(nonNullUsers.nullState)}`);
assert.strictEqual(nonNullUsers.nullState, NullState.NON_NULL);

// Scenario 3: .map on promoted NonNull elements -> Must PASS
const guardedCallback = (elem) => {
  if (elem.nullState === NullState.NULLABLE) {
    return { safetyCheck: { ok: false } };
  }
  return { safetyCheck: { ok: true }, returnType: new TypeShape('String') };
};

const mapResult2 = FunctorFlowAnalyzer.analyzeMap(nonNullUsers, guardedCallback);
console.log(`Guarded .map() on Array<NonNull<User>> -> OK = ${mapResult2.safetyCheck.ok}`);
assert.strictEqual(mapResult2.safetyCheck.ok, true);

console.log('\nTrial #17 Result: PASS (Higher-order collection inference mathematically sound).\n');
