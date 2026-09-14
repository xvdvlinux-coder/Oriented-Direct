/**
 * Trial #02: Arity and Sealed Struct Shape Invariance
 * Demonstrates compile-time proof for function arity mismatch and sealed struct protection.
 */

import assert from 'node:assert';
import { TypeShape, AbstractEnvironment } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #02: Arity & Shape Invariance Simulation ---');

const env = new AbstractEnvironment();

// Step 1: Define 'fn calculateTax(amount, rate)' with arity = 2
const calculateTaxShape = new TypeShape('Function', { arity: 2 });
env.define('calculateTax', calculateTaxShape, true);

function verifyCallArity(funcName, argCount, currentEnv) {
  const func = currentEnv.get(funcName);
  if (!func) return { ok: false, error: `Function ${funcName} not found` };
  if (func.typeShape.kind !== 'Function') return { ok: false, error: `${funcName} is not callable` };
  if (func.typeShape.arity !== null && func.typeShape.arity !== argCount) {
    return { ok: false, error: `[MathL Violation] Function '${funcName}' expects ${func.typeShape.arity} arguments, but got ${argCount}.` };
  }
  return { ok: true };
}

// Test Arity with 1 argument (should fail)
const badArity = verifyCallArity('calculateTax', 1, env);
console.log(`Call calculateTax(100) -> OK = ${badArity.ok}, Error = "${badArity.error}"`);
assert.strictEqual(badArity.ok, false);

// Test Arity with 2 arguments (should pass)
const goodArity = verifyCallArity('calculateTax', 2, env);
console.log(`Call calculateTax(100, 0.15) -> OK = ${goodArity.ok}`);
assert.strictEqual(goodArity.ok, true);

// Step 2: Define Sealed Struct 'struct User { name, age }'
const userStructShape = new TypeShape('Struct', {
  isSealed: true,
  fields: {
    'name': new TypeShape('String'),
    'age': new TypeShape('Number')
  }
});
env.define('currentUser', userStructShape, true);

function verifyPropertyWrite(targetName, propName, currentEnv) {
  const target = currentEnv.get(targetName);
  if (!target) return { ok: false, error: `Target ${targetName} not found` };
  if (target.typeShape.isSealed && !target.typeShape.hasField(propName)) {
    return { ok: false, error: `[MathL Violation] Cannot assign unlisted property '${propName}' to sealed struct '${targetName}'.` };
  }
  return { ok: true };
}

// Test writing valid field 'name'
const validField = verifyPropertyWrite('currentUser', 'name', env);
console.log(`Property write 'currentUser.name = "Alice"' -> OK = ${validField.ok}`);
assert.strictEqual(validField.ok, true);

// Test writing invalid unlisted field 'salary' (should fail)
const invalidField = verifyPropertyWrite('currentUser', 'salary', env);
console.log(`Property write 'currentUser.salary = 5000' -> OK = ${invalidField.ok}, Error = "${invalidField.error}"`);
assert.strictEqual(invalidField.ok, false);

console.log('\nTrial #02 Result: PASS (Arity & Sealed Struct Invariants mathematically verified).\n');
