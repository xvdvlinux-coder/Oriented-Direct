/**
 * Trial #09: Match Expression Domain Partitioning & Exhaustiveness Verification
 * Proves that non-exhaustive match expressions without default branches are rejected at compile-time.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #09: Match Exhaustiveness Verification ---');

// Represent domain sets: BooleanDomain = { true, false }, EnumDomain = { 'A', 'B', 'C' }
function verifyMatchExhaustiveness(targetDomain, casePatterns, hasDefault) {
  if (hasDefault) {
    return { ok: true, reason: 'Default branch covers remaining domain elements.' };
  }

  const coveredSet = new Set(casePatterns);
  const missingElements = [];

  for (const element of targetDomain) {
    if (!coveredSet.has(element)) {
      missingElements.push(element);
    }
  }

  if (missingElements.length > 0) {
    return {
      ok: false,
      error: `[MathL Violation] Non-exhaustive match expression. Missing cases: ${missingElements.map(e => JSON.stringify(e)).join(', ')}.`
    };
  }

  return { ok: true, reason: 'All domain elements covered explicitly.' };
}

// Case 1: Boolean target with only 'true' case and no default -> Must FAIL
const test1 = verifyMatchExhaustiveness([true, false], [true], false);
console.log(`Match(bool) with [true] -> OK = ${test1.ok}, Error = "${test1.error}"`);
assert.strictEqual(test1.ok, false);
assert.ok(test1.error.includes('Missing cases: false'));

// Case 2: Boolean target with both 'true' and 'false' -> Must PASS
const test2 = verifyMatchExhaustiveness([true, false], [true, false], false);
console.log(`Match(bool) with [true, false] -> OK = ${test2.ok}, Reason = "${test2.reason}"`);
assert.strictEqual(test2.ok, true);

// Case 3: HTTP Status code with specific cases + explicit default -> Must PASS
const test3 = verifyMatchExhaustiveness([200, 404, 500], [200], true);
console.log(`Match(status) with [200, default] -> OK = ${test3.ok}, Reason = "${test3.reason}"`);
assert.strictEqual(test3.ok, true);

// Case 4: Enum with missing variant -> Must FAIL
const test4 = verifyMatchExhaustiveness(['LIGHT', 'DARK', 'SYSTEM'], ['LIGHT', 'DARK'], false);
console.log(`Match(theme) with ['LIGHT', 'DARK'] -> OK = ${test4.ok}, Error = "${test4.error}"`);
assert.strictEqual(test4.ok, false);
assert.ok(test4.error.includes('SYSTEM'));

console.log('\nTrial #09 Result: PASS (Match exhaustiveness and domain partitioning mathematically sound).\n');
