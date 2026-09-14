/**
 * Trial #29: Typed Array Buffer & WebAssembly Memory Invariance (Rule XVI)
 * Proves compile-time verification of ArrayBuffer attachment lattices, view boundary
 * invariants, alignment constraints, and detachment tracking matching Google V8 templates:
 * - kTypedArrayDetachedErrorOperation ("Cannot perform % on a detached ArrayBuffer")
 * - kTypedArrayOOBErrorOperation ("Cannot perform % on a out-of-bounds ArrayBuffer")
 * - kInvalidArrayLength ("Invalid array length")
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #29: Typed Array Buffer & WebAssembly Memory Invariance ---');

export const BufferState = {
  BOTTOM: 'BOTTOM',
  ATTACHED: 'ATTACHED',
  DETACHED: 'DETACHED',
  TOP: 'TOP'
};

export class ArrayBufferLattice {
  constructor(id, byteLength) {
    this.id = id;
    this.byteLength = byteLength;
    this.state = BufferState.ATTACHED;
    this.views = new Set();
  }

  detach() {
    this.state = BufferState.DETACHED;
    for (const view of this.views) {
      view.onBufferDetached();
    }
  }

  isAttached() {
    return this.state === BufferState.ATTACHED;
  }
}

export class TypedArrayViewLattice {
  constructor(id, buffer, typeName, bytesPerElement, byteOffset = 0, length = null) {
    this.id = id;
    this.buffer = buffer;
    this.typeName = typeName;
    this.bytesPerElement = bytesPerElement;
    this.byteOffset = byteOffset;

    if (length === null) {
      const remainingBytes = buffer.byteLength - byteOffset;
      this.length = Math.floor(remainingBytes / bytesPerElement);
    } else {
      this.length = length;
    }

    buffer.views.add(this);
  }

  onBufferDetached() {
    // Buffer state propagates to view
  }

  isDetached() {
    return this.buffer.state === BufferState.DETACHED;
  }
}

export class MemorySafetyAnalyzer {
  static createBuffer(id, byteLength) {
    if (typeof byteLength !== 'number' || isNaN(byteLength) || !Number.isInteger(byteLength) || byteLength < 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidArrayLength] Invalid ArrayBuffer byteLength (${byteLength}). Must be non-negative integer.`
      };
    }
    if (byteLength > Number.MAX_SAFE_INTEGER) {
      return {
        ok: false,
        error: `[MathL Violation: S_RangeError] ArrayBuffer byteLength exceeds maximum safe memory allocation.`
      };
    }
    return {
      ok: true,
      buffer: new ArrayBufferLattice(id, byteLength)
    };
  }

  static createView(id, buffer, typeName, bytesPerElement, byteOffset = 0, length = null) {
    if (!buffer.isAttached()) {
      return {
        ok: false,
        error: `[MathL Violation: S_TypedArrayDetached] Cannot create view '${id}' on detached ArrayBuffer '${buffer.id}'.`
      };
    }

    if (typeof byteOffset !== 'number' || byteOffset < 0 || !Number.isInteger(byteOffset)) {
      return {
        ok: false,
        error: `[MathL Violation: S_RangeError] Invalid byteOffset (${byteOffset}) for view '${id}'. Must be non-negative integer.`
      };
    }

    // Alignment constraint: byteOffset must be multiple of element size
    if (byteOffset % bytesPerElement !== 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_RangeError] Misaligned byteOffset (${byteOffset}) for ${typeName}. Must be multiple of ${bytesPerElement}.`
      };
    }

    const availableBytes = buffer.byteLength - byteOffset;
    if (availableBytes < 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_TypedArrayOOB] byteOffset (${byteOffset}) exceeds buffer byteLength (${buffer.byteLength}).`
      };
    }

    let calculatedLength = length;
    if (length === null) {
      if (availableBytes % bytesPerElement !== 0) {
        return {
          ok: false,
          error: `[MathL Violation: S_RangeError] Buffer remaining byteLength (${availableBytes}) is not multiple of ${bytesPerElement} for ${typeName}.`
        };
      }
      calculatedLength = availableBytes / bytesPerElement;
    } else {
      if (typeof length !== 'number' || length < 0 || !Number.isInteger(length)) {
        return {
          ok: false,
          error: `[MathL Violation: S_InvalidArrayLength] Invalid length (${length}) for view '${id}'.`
        };
      }
      const requiredBytes = length * bytesPerElement;
      if (byteOffset + requiredBytes > buffer.byteLength) {
        return {
          ok: false,
          error: `[MathL Violation: S_TypedArrayOOB] View range [${byteOffset}, ${byteOffset + requiredBytes}] exceeds buffer bounds (${buffer.byteLength}).`
        };
      }
    }

    const view = new TypedArrayViewLattice(id, buffer, typeName, bytesPerElement, byteOffset, calculatedLength);
    return { ok: true, view };
  }

  static verifyAccess(view, index) {
    if (view.isDetached()) {
      return {
        ok: false,
        error: `[MathL Violation: S_TypedArrayDetached] Cannot perform index access on detached ArrayBuffer backing view '${view.id}'. Matches V8 kTypedArrayDetachedErrorOperation.`
      };
    }

    if (typeof index === 'number') {
      if (index < 0 || index >= view.length) {
        return {
          ok: false,
          error: `[MathL Violation: S_TypedArrayOOB] Access index ${index} out of view bounds [0, ${view.length - 1}]. Matches V8 kTypedArrayOOBErrorOperation.`
        };
      }
    } else if (index && typeof index.min === 'number' && typeof index.max === 'number') {
      // Interval bounds check
      if (index.min < 0 || index.max >= view.length) {
        return {
          ok: false,
          error: `[MathL Violation: S_TypedArrayOOB] Index interval [${index.min}, ${index.max}] exceeds view bounds [0, ${view.length - 1}].`
        };
      }
    }

    return { ok: true };
  }

  static transferBuffer(buffer, targetWorkerId) {
    if (!buffer.isAttached()) {
      return {
        ok: false,
        error: `[MathL Violation: S_TypedArrayDetached] Cannot transfer already detached ArrayBuffer '${buffer.id}'.`
      };
    }
    buffer.detach();
    return {
      ok: true,
      transferredId: buffer.id,
      recipient: targetWorkerId
    };
  }

  static wasmMemoryGrow(wasmMemory, deltaPages) {
    // WebAssembly.Memory.prototype.grow detaches the previous buffer if resized
    if (deltaPages < 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_RangeError] Cannot grow Wasm memory by negative pages (${deltaPages}).`
      };
    }
    const oldBuffer = wasmMemory.buffer;
    oldBuffer.detach();
    const newByteLength = (wasmMemory.pages + deltaPages) * 65536;
    wasmMemory.pages += deltaPages;
    wasmMemory.buffer = new ArrayBufferLattice(`wasm_buf_${Date.now()}`, newByteLength);
    return {
      ok: true,
      previousBufferDetached: true,
      newByteLength
    };
  }
}

// --- Verification Tests ---

// 1. Valid Buffer and Views Allocation
console.log('1. Testing Valid Buffer and View Creation...');
const bufRes1 = MemorySafetyAnalyzer.createBuffer('buf1', 1024);
assert.ok(bufRes1.ok);
const buf1 = bufRes1.buffer;

const f32Res = MemorySafetyAnalyzer.createView('f32View', buf1, 'Float32Array', 4, 0, 256);
assert.ok(f32Res.ok);
const f32View = f32Res.view;
assert.strictEqual(f32View.length, 256);

// 2. Negative Buffer ByteLength Rejection
console.log('2. Testing Negative Buffer Length Rejection...');
const badBufRes = MemorySafetyAnalyzer.createBuffer('badBuf', -64);
assert.strictEqual(badBufRes.ok, false);
assert.ok(badBufRes.error.includes('S_InvalidArrayLength'));

// 3. Misaligned View ByteOffset Rejection
console.log('3. Testing Misaligned ByteOffset Rejection...');
const misalignedRes = MemorySafetyAnalyzer.createView('badAlign', buf1, 'Float32Array', 4, 3, 10);
assert.strictEqual(misalignedRes.ok, false);
assert.ok(misalignedRes.error.includes('Misaligned byteOffset'));

// 4. Out-of-Bounds View Range Rejection
console.log('4. Testing Out-of-Bounds View Range Rejection...');
const oobViewRes = MemorySafetyAnalyzer.createView('oobView', buf1, 'Float32Array', 4, 512, 200); // 512 + 800 = 1312 > 1024
assert.strictEqual(oobViewRes.ok, false);
assert.ok(oobViewRes.error.includes('S_TypedArrayOOB'));

// 5. In-Bounds and Out-of-Bounds Index Access
console.log('5. Testing Index Bounds Invariance...');
const access1 = MemorySafetyAnalyzer.verifyAccess(f32View, 128);
assert.ok(access1.ok);

const accessOOB = MemorySafetyAnalyzer.verifyAccess(f32View, 300);
assert.strictEqual(accessOOB.ok, false);
assert.ok(accessOOB.error.includes('S_TypedArrayOOB'));

const intervalAccessSafe = MemorySafetyAnalyzer.verifyAccess(f32View, { min: 0, max: 255 });
assert.ok(intervalAccessSafe.ok);

const intervalAccessUnsafe = MemorySafetyAnalyzer.verifyAccess(f32View, { min: 0, max: 256 });
assert.strictEqual(intervalAccessUnsafe.ok, false);
assert.ok(intervalAccessUnsafe.error.includes('S_TypedArrayOOB'));

// 6. Buffer Detachment via Transfer Invalidates All Views
console.log('6. Testing Buffer Transfer Detachment Invariant...');
const u8Res = MemorySafetyAnalyzer.createView('u8View', buf1, 'Uint8Array', 1, 0, 64);
assert.ok(u8Res.ok);
const u8View = u8Res.view;

assert.strictEqual(f32View.isDetached(), false);
assert.strictEqual(u8View.isDetached(), false);

// Perform cross-thread transfer (detaches buffer)
const transferRes = MemorySafetyAnalyzer.transferBuffer(buf1, 'worker_render');
assert.ok(transferRes.ok);
assert.strictEqual(buf1.isAttached(), false);
assert.strictEqual(f32View.isDetached(), true);
assert.strictEqual(u8View.isDetached(), true);

// Attempt access on detached views
const detachedAccess1 = MemorySafetyAnalyzer.verifyAccess(f32View, 0);
assert.strictEqual(detachedAccess1.ok, false);
assert.ok(detachedAccess1.error.includes('S_TypedArrayDetached'));

const detachedAccess2 = MemorySafetyAnalyzer.verifyAccess(u8View, 10);
assert.strictEqual(detachedAccess2.ok, false);
assert.ok(detachedAccess2.error.includes('S_TypedArrayDetached'));

// Attempt creating new view on detached buffer
const newViewOnDetached = MemorySafetyAnalyzer.createView('vDetached', buf1, 'Uint8Array', 1, 0, 10);
assert.strictEqual(newViewOnDetached.ok, false);
assert.ok(newViewOnDetached.error.includes('S_TypedArrayDetached'));

// 7. WebAssembly Memory Growth Buffer Invalidation
console.log('7. Testing WebAssembly Memory Grow Buffer Invalidation...');
const wasmMem = {
  pages: 1,
  buffer: new ArrayBufferLattice('wasm_initial', 65536)
};
const wasmViewRes = MemorySafetyAnalyzer.createView('wasmU32', wasmMem.buffer, 'Uint32Array', 4, 0, 16384);
assert.ok(wasmViewRes.ok);
const wasmU32View = wasmViewRes.view;

// Prior to grow: access is valid
assert.ok(MemorySafetyAnalyzer.verifyAccess(wasmU32View, 100).ok);

// Grow memory by 1 page (64KB)
const growRes = MemorySafetyAnalyzer.wasmMemoryGrow(wasmMem, 1);
assert.ok(growRes.ok);
assert.strictEqual(growRes.previousBufferDetached, true);

// Old view is now detached because previous linear buffer was relocated
const postGrowAccess = MemorySafetyAnalyzer.verifyAccess(wasmU32View, 100);
assert.strictEqual(postGrowAccess.ok, false);
assert.ok(postGrowAccess.error.includes('S_TypedArrayDetached'));

console.log('Trial #29 Result: PASS (Buffer detachment, OOB views, alignment, and Wasm growth invariants verified).\n');
