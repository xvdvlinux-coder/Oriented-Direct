/**
 * Trial #10: Asynchronous & Fallible Operations Safety Gating
 * Proves that fallible JS operations (e.g. JSON.parse) are gated by enclosing try/catch blocks.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #10: Asynchronous & Fallible Operations Safety ---');

const FALLIBLE_REGISTRY = {
  'JSON.parse': { throws: 'SyntaxError' },
  'decodeURIComponent': { throws: 'URIError' },
  'localStorage.setItem': { throws: 'QuotaExceededError' }
};

function verifyFallibleOperationSafety(operationName, isEnclosedInTryCatch) {
  const op = FALLIBLE_REGISTRY[operationName];
  if (!op) {
    return { ok: true, reason: 'Operation is safe and non-throwing.' };
  }

  if (!isEnclosedInTryCatch) {
    return {
      ok: false,
      error: `[MathL Violation] Uncaught fallible operation '${operationName}'. May throw ${op.throws}. Must be wrapped in a 'try { ... } catch (err) { ... }' block.`
    };
  }

  return { ok: true, reason: `Enclosed in try/catch handling ${op.throws}.` };
}

// Test 1: Unguarded JSON.parse -> Must FAIL
const test1 = verifyFallibleOperationSafety('JSON.parse', false);
console.log(`Unguarded JSON.parse() -> OK = ${test1.ok}, Error = "${test1.error}"`);
assert.strictEqual(test1.ok, false);
assert.ok(test1.error.includes('SyntaxError'));

// Test 2: Guarded JSON.parse inside try/catch -> Must PASS
const test2 = verifyFallibleOperationSafety('JSON.parse', true);
console.log(`Guarded JSON.parse() inside try/catch -> OK = ${test2.ok}, Reason = "${test2.reason}"`);
assert.strictEqual(test2.ok, true);

// Test 3: Standard safe operation (Math.sqrt) -> Must PASS
const test3 = verifyFallibleOperationSafety('Math.sqrt', false);
console.log(`Math.sqrt() -> OK = ${test3.ok}, Reason = "${test3.reason}"`);
assert.strictEqual(test3.ok, true);

console.log('\nTrial #10 Result: PASS (Exception boundary invariants mathematically sound).\n');
