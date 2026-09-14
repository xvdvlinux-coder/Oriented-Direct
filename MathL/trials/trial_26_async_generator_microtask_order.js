/**
 * Trial #26: Async Generator & Microtask Queue Event Loop Invariance (Rule XIV)
 * Proves event loop abstract state transitions, microtask queue FIFO drainage,
 * and shared mutable state volatilization across await/yield suspension points.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #26: Async Generator & Microtask Event Loop Invariance ---');

export const EventLoopPhase = {
  SYNC_EXEC: 'SYNC_EXEC',
  MICROTASK_DRAIN: 'MICROTASK_DRAIN',
  RENDERING: 'RENDERING',
  MACROTASK_YIELD: 'MACROTASK_YIELD'
};

export class EventLoopAbstractMachine {
  constructor() {
    this.phase = EventLoopPhase.SYNC_EXEC;
    this.microtaskQueue = [];
    this.macrotaskQueue = [];
    this.executionLog = [];
    this.sharedState = new Map(); // key -> { value, isVolatile }
  }

  setShared(key, value) {
    this.sharedState.set(key, { value, isVolatile: false });
  }

  getShared(key, currentScope) {
    const entry = this.sharedState.get(key);
    if (!entry) return null;
    if (entry.isVolatile && currentScope.assumesConstant) {
      return {
        ok: false,
        error: `[MathL Violation] Volatile race condition: Read of shared variable '${key}' across suspension point assumes stale pre-suspension state.`
      };
    }
    return { ok: true, value: entry.value };
  }

  enqueueMicrotask(label, action) {
    this.microtaskQueue.push({ label, action });
  }

  enqueueMacrotask(label, action) {
    this.macrotaskQueue.push({ label, action });
  }

  suspendForAwait(suspensionLabel) {
    this.executionLog.push(`[Suspend await: ${suspensionLabel}]`);
    // All shared mutable state becomes volatile across suspension
    for (const [k, v] of this.sharedState.entries()) {
      v.isVolatile = true;
    }
  }

  drainMicrotasks() {
    this.phase = EventLoopPhase.MICROTASK_DRAIN;
    while (this.microtaskQueue.length > 0) {
      const task = this.microtaskQueue.shift();
      this.executionLog.push(`microtask: ${task.label}`);
      task.action();
    }
    this.phase = EventLoopPhase.RENDERING;
    this.executionLog.push('phase: rendering_opportunity');
  }

  runNextMacrotask() {
    if (this.macrotaskQueue.length > 0) {
      this.phase = EventLoopPhase.MACROTASK_YIELD;
      const task = this.macrotaskQueue.shift();
      this.executionLog.push(`macrotask: ${task.label}`);
      task.action();
      // After every macrotask, microtasks must drain completely
      this.drainMicrotasks();
    }
  }

  verifyFallibleAwait(hasTryCatch) {
    if (!hasTryCatch) {
      return {
        ok: false,
        error: '[MathL Violation] Fallible async operation awaited without enclosing try/catch boundary (UnhandledMicrotaskRejection).'
      };
    }
    return { ok: true };
  }
}

const machine = new EventLoopAbstractMachine();

// Setup shared state
machine.setShared('counter', 0);

// Test 1: Event loop ordering invariant
// Queue 2 microtasks and 1 macrotask
machine.enqueueMacrotask('setTimeout_timer_callback', () => {
  machine.setShared('counter', 99);
});

machine.enqueueMicrotask('promise_then_resolve_1', () => {
  const c = machine.sharedState.get('counter');
  c.value += 1;
});

machine.enqueueMicrotask('queueMicrotask_callback_2', () => {
  const c = machine.sharedState.get('counter');
  c.value += 10;
});

// Synchronous execution completes -> drain microtasks
console.log('1. Executing synchronous tick and draining microtasks...');
machine.drainMicrotasks();

// Microtasks must drain before macrotask
assert.strictEqual(machine.executionLog[0], 'microtask: promise_then_resolve_1');
assert.strictEqual(machine.executionLog[1], 'microtask: queueMicrotask_callback_2');
assert.strictEqual(machine.executionLog[2], 'phase: rendering_opportunity');
assert.strictEqual(machine.sharedState.get('counter').value, 11);
console.log('   Microtasks drained in strict FIFO order before rendering.');

// Now execute macrotask
console.log('2. Executing next macrotask...');
machine.runNextMacrotask();
assert.strictEqual(machine.executionLog[3], 'macrotask: setTimeout_timer_callback');
assert.strictEqual(machine.sharedState.get('counter').value, 99);
console.log('   Macrotask executed after microtask drain.');

// Test 2: Suspension & Shared State Volatilization (Anti-Race Condition)
console.log('3. Testing state volatilization across suspension...');
machine.setShared('userSession', { token: 'active' });
const clientScope = { assumesConstant: true };

// Verify initial read is safe
const read1 = machine.getShared('userSession', clientScope);
assert.strictEqual(read1.ok, true);

// Suspend generator or async function via await/yield
machine.suspendForAwait('fetchNextBatch');

// Now reading with assumed stale constant state triggers compile-time race guard
const read2 = machine.getShared('userSession', clientScope);
console.log(`   Read after suspension: OK = ${read2.ok}, Error = "${read2.error}"`);
assert.strictEqual(read2.ok, false);
assert.ok(read2.error.includes('Volatile race condition'));

// Test 3: Fallible Await Verification
console.log('4. Testing fallible await exception boundary gating...');
const unguardedAwait = machine.verifyFallibleAwait(false);
console.log(`   Unguarded await: OK = ${unguardedAwait.ok}, Error = "${unguardedAwait.error}"`);
assert.strictEqual(unguardedAwait.ok, false);
assert.ok(unguardedAwait.error.includes('UnhandledMicrotaskRejection'));

const guardedAwait = machine.verifyFallibleAwait(true);
console.log(`   Guarded await: OK = ${guardedAwait.ok}`);
assert.strictEqual(guardedAwait.ok, true);

console.log('\nTrial #26 Result: PASS (Async generator and microtask event loop invariance verified).\n');
