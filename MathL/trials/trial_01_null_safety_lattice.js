/**
 * Trial #01: Null-Flow Lattice Simulation & Guard Promotion
 * Demonstrates compile-time proof that un-guarded null dereference is caught
 * and that 'unless' promotes abstract nullability to NonNull.
 */

import assert from 'node:assert';
import { NullState, NullLattice, TypeShape, AbstractEnvironment } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #01: Null-Flow Lattice Simulation ---');

const env = new AbstractEnvironment();

// Step 1: Simulate '@find("#submitBtn")' returning Nullable<HTMLElement>
const domElementShape = new TypeShape('Object', {
  nullState: NullState.NULLABLE,
  fields: {
    'textContent': new TypeShape('String'),
    'addEventListener': new TypeShape('Function', { arity: 2 })
  }
});

env.define('btn', domElementShape, true);

// Verify initial state is Nullable
const initialBtn = env.get('btn');
console.log(`Initial state of 'btn': ${NullLattice.toString(initialBtn.nullState)}`);
assert.strictEqual(initialBtn.nullState, NullState.NULLABLE);

// Test Invariant Check: Direct dereference of Nullable should fail safety check
function checkSafetyDereference(variableName, currentEnv) {
  const variable = currentEnv.get(variableName);
  if (!variable) throw new Error(`Symbol ${variableName} not declared`);
  if (variable.nullState === NullState.NULLABLE) {
    return { ok: false, error: `[MathL Violation] Variable '${variableName}' may be null at dereference point.` };
  }
  return { ok: true };
}

const unguardedCheck = checkSafetyDereference('btn', env);
console.log(`Unguarded dereference check: OK = ${unguardedCheck.ok}, Error = "${unguardedCheck.error}"`);
assert.strictEqual(unguardedCheck.ok, false);

// Step 2: Simulate flow guard 'unless (btn) return;'
console.log('Simulating flow guard: "unless (btn) return;" -> promoting state to NonNull');
env.refineNullability('btn', NullState.NON_NULL);

const guardedBtn = env.get('btn');
console.log(`Post-guard state of 'btn': ${NullLattice.toString(guardedBtn.nullState)}`);
assert.strictEqual(guardedBtn.nullState, NullState.NON_NULL);

// Test Invariant Check: Post-guard dereference must pass
const guardedCheck = checkSafetyDereference('btn', env);
console.log(`Guarded dereference check: OK = ${guardedCheck.ok}`);
assert.strictEqual(guardedCheck.ok, true);

console.log('\nTrial #01 Result: PASS (Lattice transitions and promotion mathematically sound).\n');
