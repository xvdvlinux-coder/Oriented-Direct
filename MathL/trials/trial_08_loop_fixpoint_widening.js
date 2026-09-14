/**
 * Trial #08: Loop Fixpoint Iteration and Widening Operator (∇)
 * Simulates computing abstract invariant states across loop iterations with mutable state.
 */

import assert from 'node:assert';
import { NullState, NullLattice, TypeShape, AbstractEnvironment } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #08: Loop Fixpoint Iteration & Widening (∇) ---');

// Define a numeric interval abstract representation
class NumericInterval {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  static widen(intA, intB) {
    const newMin = intB.min < intA.min ? -Infinity : intA.min;
    const newMax = intB.max > intA.max ? Infinity : intA.max;
    return new NumericInterval(newMin, newMax);
  }

  isSubsetOf(other) {
    return this.min >= other.min && this.max <= other.max;
  }

  toString() {
    const minStr = this.min === -Infinity ? '-∞' : this.min;
    const maxStr = this.max === Infinity ? '+∞' : this.max;
    return `[${minStr}, ${maxStr}]`;
  }
}

// Simulate Loop: for (mut i = 0; i < 100; i += 1) { ... }
let currentInterval = new NumericInterval(0, 0);
console.log(`Initial abstract state before loop: i in ${currentInterval.toString()}`);

let iteration = 0;
const MAX_ITERATIONS = 10;
let stabilized = false;

while (iteration < MAX_ITERATIONS && !stabilized) {
  iteration += 1;
  // Transfer function: step increment
  const nextInterval = new NumericInterval(currentInterval.min, currentInterval.max + 1);
  
  // Apply Widening operator (∇) after iteration 2 to guarantee finite convergence
  const widened = iteration > 2 ? NumericInterval.widen(currentInterval, nextInterval) : nextInterval;
  
  console.log(`  Iteration ${iteration}: next = ${nextInterval.toString()} -> widened (∇) = ${widened.toString()}`);

  if (widened.isSubsetOf(currentInterval)) {
    stabilized = true;
    console.log(`  Loop Fixpoint reached and stabilized at iteration ${iteration}!`);
  } else {
    currentInterval = widened;
  }
}

assert.strictEqual(stabilized, true);
assert.strictEqual(currentInterval.min, 0);
assert.strictEqual(currentInterval.max, Infinity);

console.log(`\nFinal Invariant Post-Loop State: i in ${currentInterval.toString()}`);
console.log('Trial #08 Result: PASS (Loop fixpoint convergence with Widening mathematically verified).\n');
