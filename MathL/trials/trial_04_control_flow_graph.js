/**
 * Trial #04: Control Flow Graph Branch Join & Convergence
 * Tests mathematical Join (⊔) over branching execution paths.
 */

import assert from 'node:assert';
import { NullState, NullLattice, AbstractEnvironment, TypeShape } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #04: CFG Branch Join & Convergence ---');

const baseEnv = new AbstractEnvironment();
baseEnv.define('target', new TypeShape('Object', { nullState: NullState.NON_NULL }), false);

// Simulate Branch A: target is kept NonNull
const branchA = baseEnv.clone();
branchA.refineNullability('target', NullState.NON_NULL);

// Simulate Branch B: target is set to Nullable (e.g. from an API error)
const branchB = baseEnv.clone();
branchB.refineNullability('target', NullState.NULLABLE);

// Merge branches via Lattice Join (⊔)
const mergedEnv = AbstractEnvironment.merge(branchA, branchB);
const mergedTarget = mergedEnv.get('target');

console.log(`Branch A state: NonNull`);
console.log(`Branch B state: Nullable`);
console.log(`Merged (Join ⊔) state: ${NullLattice.toString(mergedTarget.nullState)}`);

// Mathematical invariant: NonNull ⊔ Nullable === Nullable
assert.strictEqual(mergedTarget.nullState, NullState.NULLABLE);

console.log('\nTrial #04 Result: PASS (Lattice Join handles branching soundly).\n');
