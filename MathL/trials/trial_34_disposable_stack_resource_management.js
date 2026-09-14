/**
 * Trial #34: Explicit Resource Management & RAII Disposable Stacks (Rule XXI)
 * Formalizes linear resource lifecycle lattice L_Resource, LIFO disposal stacks,
 * use-after-dispose static rejection, and error suppression matching Google V8 templates:
 * - kDisposableStackIsDisposed ("Cannot call % on an already-disposed DisposableStack")
 * - kNotAnAsyncDisposableStack ("% is not an async disposable stack")
 * - S_UseAfterDispose (Dereferencing resource after disposal)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #34: Explicit Resource Management & RAII Disposable Stacks ---');

export const ResourceState = {
  BOTTOM: 'BOTTOM',
  UNALLOCATED: 'UNALLOCATED',
  ACTIVE: 'ACTIVE',
  DISPOSED: 'DISPOSED',
  TOP: 'TOP'
};

export const StackState = {
  ACTIVE: 'ACTIVE',
  DISPOSED: 'DISPOSED'
};

export class DisposableResourceLattice {
  constructor(id, type = 'GenericResource', isAsync = false, customDisposer = null) {
    this.id = id;
    this.type = type;
    this.isAsync = isAsync;
    this.state = ResourceState.ACTIVE;
    this.customDisposer = customDisposer;
    this.disposedAt = null;
    this.disposalCallCount = 0;
  }

  dispose() {
    if (this.isAsync) {
      throw new Error(`Cannot synchronously dispose async resource '${this.id}'. Use Symbol.asyncDispose.`);
    }
    this.disposalCallCount++;
    this.state = ResourceState.DISPOSED;
    this.disposedAt = Date.now();
    if (this.customDisposer) {
      this.customDisposer();
    }
  }

  async disposeAsync() {
    this.disposalCallCount++;
    this.state = ResourceState.DISPOSED;
    this.disposedAt = Date.now();
    if (this.customDisposer) {
      await this.customDisposer();
    }
  }

  isActive() {
    return this.state === ResourceState.ACTIVE;
  }

  isDisposed() {
    return this.state === ResourceState.DISPOSED;
  }
}

export class DisposableStackLattice {
  constructor(id, isAsync = false) {
    this.id = id;
    this.isAsync = isAsync;
    this.state = StackState.ACTIVE;
    this.stack = []; // LIFO sequence of { resource, onDispose }
    this.disposalLog = [];
  }

  isDisposed() {
    return this.state === StackState.DISPOSED;
  }
}

export class ExplicitResourceManager {
  static createResource(id, type = 'GenericResource', isAsync = false, customDisposer = null) {
    return new DisposableResourceLattice(id, type, isAsync, customDisposer);
  }

  static createStack(id, isAsync = false) {
    return new DisposableStackLattice(id, isAsync);
  }

  static use(stack, resource) {
    if (stack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'use' on an already-disposed DisposableStack '${stack.id}' (matches V8 kDisposableStackIsDisposed).`
      };
    }
    if (!resource || typeof resource !== 'object') {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidResource] Value passed to 'use' must be an object with disposable interface.`
      };
    }
    if (resource.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_UseAfterDispose] Resource '${resource.id}' is already disposed and cannot be registered to stack '${stack.id}'.`
      };
    }
    if (resource.isAsync && !stack.isAsync) {
      return {
        ok: false,
        error: `[MathL Violation: S_AsyncDisposableMismatch] Cannot register async disposable resource '${resource.id}' to synchronous DisposableStack '${stack.id}'.`
      };
    }

    stack.stack.push({
      resource,
      onDispose: resource.isAsync ? () => resource.disposeAsync() : () => resource.dispose()
    });

    return { ok: true, resource };
  }

  static adopt(stack, value, onDispose) {
    if (stack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'adopt' on an already-disposed DisposableStack '${stack.id}' (matches V8 kDisposableStackIsDisposed).`
      };
    }
    if (typeof onDispose !== 'function') {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidDisposer] Custom disposer passed to 'adopt' must be a function.`
      };
    }

    const wrapper = new DisposableResourceLattice(`adopted_${stack.stack.length}`, 'AdoptedResource', stack.isAsync, () => onDispose(value));
    stack.stack.push({
      resource: wrapper,
      onDispose: () => onDispose(value)
    });

    return { ok: true, value };
  }

  static defer(stack, onDispose) {
    if (stack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'defer' on an already-disposed DisposableStack '${stack.id}' (matches V8 kDisposableStackIsDisposed).`
      };
    }
    if (typeof onDispose !== 'function') {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidDisposer] Callback passed to 'defer' must be a function.`
      };
    }

    const wrapper = new DisposableResourceLattice(`deferred_${stack.stack.length}`, 'DeferredCallback', stack.isAsync, onDispose);
    stack.stack.push({
      resource: wrapper,
      onDispose
    });

    return { ok: true };
  }

  static move(sourceStack, targetStackId = 'moved_target') {
    if (sourceStack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'move' on an already-disposed DisposableStack '${sourceStack.id}' (matches V8 kDisposableStackIsDisposed).`
      };
    }

    const newStack = new DisposableStackLattice(targetStackId, sourceStack.isAsync);
    newStack.stack = [...sourceStack.stack];

    // Source stack is emptied and marked disposed
    sourceStack.stack = [];
    sourceStack.state = StackState.DISPOSED;

    return { ok: true, newStack };
  }

  static access(resource, operationName = 'read') {
    if (resource.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_UseAfterDispose] Cannot perform operation '${operationName}' on already-disposed resource '${resource.id}' (disposal lifecycle violation).`
      };
    }
    return {
      ok: true,
      message: `Operation '${operationName}' on active resource '${resource.id}' permitted.`
    };
  }

  static dispose(stack) {
    if (stack.isAsync) {
      return {
        ok: false,
        error: `[MathL Violation: S_AsyncDisposableMismatch] Synchronous 'dispose' called on AsyncDisposableStack '${stack.id}'. Use 'disposeAsync' instead (matches V8 kNotAnAsyncDisposableStack).`
      };
    }
    if (stack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'dispose' on an already-disposed DisposableStack '${stack.id}'.`
      };
    }

    let primaryError = null;
    const errors = [];

    // LIFO unwind
    while (stack.stack.length > 0) {
      const item = stack.stack.pop();
      try {
        item.onDispose();
        stack.disposalLog.push(item.resource.id);
      } catch (err) {
        errors.push(err);
      }
    }

    stack.state = StackState.DISPOSED;

    if (errors.length > 0) {
      primaryError = errors.reduce((acc, err) => {
        if (!acc) return err;
        const supp = new Error(`SuppressedError: ${err.message}`);
        supp.error = acc;
        supp.suppressed = err;
        return supp;
      }, null);

      return {
        ok: false,
        suppressedError: primaryError,
        disposalLog: stack.disposalLog
      };
    }

    return {
      ok: true,
      disposalLog: stack.disposalLog
    };
  }

  static async disposeAsync(stack) {
    if (stack.isDisposed()) {
      return {
        ok: false,
        error: `[MathL Violation: S_DisposableStackAlreadyDisposed] Cannot call 'disposeAsync' on an already-disposed DisposableStack '${stack.id}'.`
      };
    }

    const errors = [];

    // LIFO unwind
    while (stack.stack.length > 0) {
      const item = stack.stack.pop();
      try {
        await item.onDispose();
        stack.disposalLog.push(item.resource.id);
      } catch (err) {
        errors.push(err);
      }
    }

    stack.state = StackState.DISPOSED;

    if (errors.length > 0) {
      const compound = errors.reduce((acc, err) => {
        if (!acc) return err;
        const supp = new Error(`SuppressedError: ${err.message}`);
        supp.error = acc;
        supp.suppressed = err;
        return supp;
      }, null);

      return {
        ok: false,
        suppressedError: compound,
        disposalLog: stack.disposalLog
      };
    }

    return {
      ok: true,
      disposalLog: stack.disposalLog
    };
  }

  static runScopedBlock(scopeId, blockFn) {
    const stack = this.createStack(`scope_${scopeId}`, false);
    let blockError = null;
    let blockResult = null;

    try {
      blockResult = blockFn(stack);
    } catch (err) {
      blockError = err;
    }

    // Unwind stack automatically upon scope exit
    const disposeRes = this.dispose(stack);

    if (blockError) {
      if (!disposeRes.ok && disposeRes.suppressedError) {
        const supp = new Error(`SuppressedError: ${disposeRes.suppressedError.message}`);
        supp.error = blockError;
        supp.suppressed = disposeRes.suppressedError;
        return { ok: false, error: supp, disposalLog: stack.disposalLog };
      }
      return { ok: false, error: blockError, disposalLog: stack.disposalLog };
    }

    if (!disposeRes.ok) {
      return { ok: false, error: disposeRes.suppressedError, disposalLog: stack.disposalLog };
    }

    return { ok: true, result: blockResult, disposalLog: stack.disposalLog };
  }
}

// =========================================================================
// VERIFICATION SUITE
// =========================================================================

// 1. Strict LIFO Disposal Order Invariant
console.log('1. Testing LIFO Resource Disposal Invariant...');
const stack1 = ExplicitResourceManager.createStack('stack_lifo', false);
const resA = ExplicitResourceManager.createResource('res_A', 'FileHandle');
const resB = ExplicitResourceManager.createResource('res_B', 'DatabaseConnection');
const resC = ExplicitResourceManager.createResource('res_C', 'NetworkSocket');

ExplicitResourceManager.use(stack1, resA);
ExplicitResourceManager.use(stack1, resB);
ExplicitResourceManager.use(stack1, resC);

assert.strictEqual(resA.isActive(), true);
assert.strictEqual(resB.isActive(), true);
assert.strictEqual(resC.isActive(), true);

const dispRes1 = ExplicitResourceManager.dispose(stack1);
assert.strictEqual(dispRes1.ok, true);
// Verify LIFO order: res_C disposed first, then res_B, then res_A
assert.deepStrictEqual(dispRes1.disposalLog, ['res_C', 'res_B', 'res_A']);
assert.strictEqual(resA.isDisposed(), true);
assert.strictEqual(resB.isDisposed(), true);
assert.strictEqual(resC.isDisposed(), true);

// 2. Use-After-Dispose Static Violation
console.log('2. Testing Use-After-Dispose Static Detection...');
const accessBeforeDisposal = ExplicitResourceManager.access(resA, 'read');
// resA is already disposed from test 1
const accessAfterDisposal = ExplicitResourceManager.access(resA, 'read');
assert.strictEqual(accessAfterDisposal.ok, false);
assert.ok(accessAfterDisposal.error.includes('S_UseAfterDispose'));

const resFresh = ExplicitResourceManager.createResource('res_fresh', 'Buffer');
assert.strictEqual(ExplicitResourceManager.access(resFresh, 'write').ok, true);

// 3. Operations on Already-Disposed Stack
console.log('3. Testing Rejection of Operations on Already-Disposed Stack...');
assert.strictEqual(stack1.isDisposed(), true);

const reUseRes = ExplicitResourceManager.use(stack1, resFresh);
assert.strictEqual(reUseRes.ok, false);
assert.ok(reUseRes.error.includes('S_DisposableStackAlreadyDisposed'));
assert.ok(reUseRes.error.includes('kDisposableStackIsDisposed'));

const reAdoptRes = ExplicitResourceManager.adopt(stack1, {}, () => {});
assert.strictEqual(reAdoptRes.ok, false);
assert.ok(reAdoptRes.error.includes('S_DisposableStackAlreadyDisposed'));

const reDeferRes = ExplicitResourceManager.defer(stack1, () => {});
assert.strictEqual(reDeferRes.ok, false);
assert.ok(reDeferRes.error.includes('S_DisposableStackAlreadyDisposed'));

const reDisposeRes = ExplicitResourceManager.dispose(stack1);
assert.strictEqual(reDisposeRes.ok, false);
assert.ok(reDisposeRes.error.includes('S_DisposableStackAlreadyDisposed'));

// 4. Stack Move Ownership Transfer Invariant
console.log('4. Testing Stack Move Ownership Transfer...');
const sourceStack = ExplicitResourceManager.createStack('source_stack', false);
const resM1 = ExplicitResourceManager.createResource('res_m1', 'Mutex');
const resM2 = ExplicitResourceManager.createResource('res_m2', 'Semaphore');
ExplicitResourceManager.use(sourceStack, resM1);
ExplicitResourceManager.use(sourceStack, resM2);

const moveRes = ExplicitResourceManager.move(sourceStack, 'destination_stack');
assert.strictEqual(moveRes.ok, true);
const destStack = moveRes.newStack;

// Source stack is disposed and empty
assert.strictEqual(sourceStack.isDisposed(), true);
assert.strictEqual(sourceStack.stack.length, 0);

// Target stack holds the active resources
assert.strictEqual(destStack.isDisposed(), false);
assert.strictEqual(destStack.stack.length, 2);
assert.strictEqual(resM1.isActive(), true);
assert.strictEqual(resM2.isActive(), true);

// Disposing destination stack cleans up resources
const destDisp = ExplicitResourceManager.dispose(destStack);
assert.strictEqual(destDisp.ok, true);
assert.deepStrictEqual(destDisp.disposalLog, ['res_m2', 'res_m1']);
assert.strictEqual(resM1.isDisposed(), true);
assert.strictEqual(resM2.isDisposed(), true);

// 5. AsyncDisposableStack Safety & Mismatch Invariance
console.log('5. Testing AsyncDisposableStack Safety...');
const asyncStack = ExplicitResourceManager.createStack('async_stack_1', true);
const asyncRes1 = ExplicitResourceManager.createResource('async_db_conn', 'AsyncConnection', true, async () => {
  // Simulating async cleanup
});
const syncRes1 = ExplicitResourceManager.createResource('sync_file', 'SyncFile', false);

// Cannot use async resource in sync stack
const syncStack = ExplicitResourceManager.createStack('sync_stack_2', false);
const badAsyncReg = ExplicitResourceManager.use(syncStack, asyncRes1);
assert.strictEqual(badAsyncReg.ok, false);
assert.ok(badAsyncReg.error.includes('S_AsyncDisposableMismatch'));

// Cannot call sync dispose on async stack
const badSyncDispose = ExplicitResourceManager.dispose(asyncStack);
assert.strictEqual(badSyncDispose.ok, false);
assert.ok(badSyncDispose.error.includes('S_AsyncDisposableMismatch'));
assert.ok(badSyncDispose.error.includes('kNotAnAsyncDisposableStack'));

// Valid async registration and disposal
ExplicitResourceManager.use(asyncStack, asyncRes1);
const asyncDispRes = await ExplicitResourceManager.disposeAsync(asyncStack);
assert.strictEqual(asyncDispRes.ok, true);
assert.strictEqual(asyncRes1.isDisposed(), true);
assert.deepStrictEqual(asyncDispRes.disposalLog, ['async_db_conn']);

// 6. Scoped RAII Block Execution & SuppressedError Aggregation
console.log('6. Testing Scoped RAII Block with SuppressedError Handling...');
let outerResHandle = null;

const scopedSuccess = ExplicitResourceManager.runScopedBlock('success_test', (stack) => {
  const r = ExplicitResourceManager.createResource('scoped_r1', 'ScopedSocket');
  ExplicitResourceManager.use(stack, r);
  outerResHandle = r;
  assert.strictEqual(r.isActive(), true);
  return 42;
});

assert.strictEqual(scopedSuccess.ok, true);
assert.strictEqual(scopedSuccess.result, 42);
// Automatically disposed on scope exit
assert.strictEqual(outerResHandle.isDisposed(), true);

// Test SuppressedError when both body and disposer throw
const scopedFault = ExplicitResourceManager.runScopedBlock('fault_test', (stack) => {
  const faultyRes = ExplicitResourceManager.createResource('faulty_res', 'FaultyResource', false, () => {
    throw new Error('Disposal failed: cleanup timeout');
  });
  ExplicitResourceManager.use(stack, faultyRes);
  throw new Error('Body operation failed: syntax error');
});

assert.strictEqual(scopedFault.ok, false);
assert.strictEqual(scopedFault.error.message.includes('SuppressedError'), true);
assert.strictEqual(scopedFault.error.error.message, 'Body operation failed: syntax error');
assert.strictEqual(scopedFault.error.suppressed.message, 'Disposal failed: cleanup timeout');

console.log('Trial #34 Result: PASS (Explicit resource management, LIFO order, use-after-dispose rejection, and SuppressedError verified).\n');
