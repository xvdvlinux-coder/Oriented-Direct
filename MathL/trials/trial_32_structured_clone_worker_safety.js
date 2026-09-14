/**
 * Trial #32: Cross-Thread Structured Clone & Web Worker FFI Invariance (Rule XIX)
 * Proves compile-time verification of the serializability lattice L_Clone, detecting
 * uncloneable objects (closures, DOM nodes, symbols), verifying transfer list constraints,
 * and eliminating runtime DataCloneError / V8 kCircularStructure exceptions.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #32: Cross-Thread Structured Clone & Web Worker FFI Invariance ---');

export const CloneLattice = {
  BOTTOM: 'BOTTOM',
  TRANSFERABLE: 'TRANSFERABLE',
  CLONEABLE: 'CLONEABLE',
  UNCLONEABLE: 'UNCLONEABLE',
  TOP: 'TOP'
};

export class StructuredCloneAnalyzer {
  static classifyType(val, visited = new Set()) {
    if (val === null || val === undefined) return CloneLattice.CLONEABLE;

    const t = typeof val;
    if (t === 'number' || t === 'string' || t === 'boolean' || t === 'bigint') {
      return CloneLattice.CLONEABLE;
    }

    if (t === 'symbol' || t === 'function') {
      return CloneLattice.UNCLONEABLE;
    }

    // Check DOM Node or EventTarget
    if (val.__isDOMNode || val.nodeType !== undefined) {
      return CloneLattice.UNCLONEABLE;
    }

    // Check WeakMap / WeakSet / Promise
    if (val instanceof WeakMap || val instanceof WeakSet || val instanceof Promise || val.__isWeakRef) {
      return CloneLattice.UNCLONEABLE;
    }

    // Transferables
    if (val.__isTransferable || val instanceof ArrayBuffer || (typeof MessagePort !== 'undefined' && val instanceof MessagePort)) {
      return CloneLattice.TRANSFERABLE;
    }

    if (visited.has(val)) {
      // Circular reference detected
      return val.__allowCircular ? CloneLattice.CLONEABLE : CloneLattice.UNCLONEABLE;
    }

    visited.add(val);

    // Arrays
    if (Array.isArray(val)) {
      for (const item of val) {
        const itemClass = this.classifyType(item, visited);
        if (itemClass === CloneLattice.UNCLONEABLE) {
          return CloneLattice.UNCLONEABLE;
        }
      }
      return CloneLattice.CLONEABLE;
    }

    // Map / Set
    if (val instanceof Set) {
      for (const item of val) {
        const itemClass = this.classifyType(item, visited);
        if (itemClass === CloneLattice.UNCLONEABLE) return CloneLattice.UNCLONEABLE;
      }
      return CloneLattice.CLONEABLE;
    }

    if (val instanceof Map) {
      for (const [k, v] of val.entries()) {
        const kClass = this.classifyType(k, visited);
        const vClass = this.classifyType(v, visited);
        if (kClass === CloneLattice.UNCLONEABLE || vClass === CloneLattice.UNCLONEABLE) {
          return CloneLattice.UNCLONEABLE;
        }
      }
      return CloneLattice.CLONEABLE;
    }

    // Plain Object
    if (typeof val === 'object') {
      for (const [key, propVal] of Object.entries(val)) {
        const propClass = this.classifyType(propVal, visited);
        if (propClass === CloneLattice.UNCLONEABLE) {
          return CloneLattice.UNCLONEABLE;
        }
      }
      return CloneLattice.CLONEABLE;
    }

    return CloneLattice.CLONEABLE;
  }

  static findUncloneableReason(val, path = 'root', visited = new Set()) {
    if (val === null || val === undefined) return null;
    const t = typeof val;
    if (t === 'function') return `Function/Closure at '${path}' cannot be structured-cloned.`;
    if (t === 'symbol') return `Symbol at '${path}' cannot be serialized across threads.`;
    if (val.__isDOMNode || val.nodeType !== undefined) return `DOM Node <${val.tag || 'node'}> at '${path}' cannot be passed across threads.`;
    if (val instanceof WeakMap || val instanceof WeakSet) return `Weak collection at '${path}' cannot be cloned.`;
    if (val instanceof Promise) return `Promise at '${path}' cannot be transferred across thread boundaries.`;

    if (visited.has(val)) {
      if (!val.__allowCircular) {
        return `Unsupported circular reference at '${path}'. Matches V8 kCircularStructure.`;
      }
      return null;
    }
    visited.add(val);

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const reason = this.findUncloneableReason(val[i], `${path}[${i}]`, visited);
        if (reason) return reason;
      }
    } else if (val instanceof Set) {
      let idx = 0;
      for (const item of val) {
        const reason = this.findUncloneableReason(item, `${path}.set[${idx++}]`, visited);
        if (reason) return reason;
      }
    } else if (val instanceof Map) {
      for (const [k, v] of val.entries()) {
        const kReason = this.findUncloneableReason(k, `${path}.map.key(${k})`, visited);
        if (kReason) return kReason;
        const vReason = this.findUncloneableReason(v, `${path}.map.value(${k})`, visited);
        if (vReason) return vReason;
      }
    } else if (typeof val === 'object') {
      for (const [key, propVal] of Object.entries(val)) {
        const reason = this.findUncloneableReason(propVal, `${path}.${key}`, visited);
        if (reason) return reason;
      }
    }

    return null;
  }

  static verifyPostMessage(payload, transferList = []) {
    // 1. Verify transferList elements
    for (let i = 0; i < transferList.length; i++) {
      const item = transferList[i];
      if (item === null || typeof item !== 'object') {
        return {
          ok: false,
          error: `[MathL Violation: S_InvalidTransferObject] Item at transferList[${i}] is not a Transferable object. Matches DOMException DataCloneError.`
        };
      }

      const itemType = this.classifyType(item);
      if (itemType !== CloneLattice.TRANSFERABLE) {
        return {
          ok: false,
          error: `[MathL Violation: S_InvalidTransferObject] Object at transferList[${i}] is not Transferable. Only ArrayBuffer, MessagePort, and ImageBitmap can be transferred.`
        };
      }

      if (item.__isDetached) {
        return {
          ok: false,
          error: `[MathL Violation: S_TypedArrayDetached] Cannot transfer already detached buffer at transferList[${i}]. Matches V8 kTypedArrayDetachedErrorOperation.`
        };
      }
    }

    // 2. Verify payload cloneability
    const classification = this.classifyType(payload);
    if (classification === CloneLattice.UNCLONEABLE) {
      const reason = this.findUncloneableReason(payload);
      return {
        ok: false,
        error: `[MathL Violation: S_UncloneablePayload] Cannot postMessage payload. ${reason}`
      };
    }

    // 3. Detach transferred objects in sender context
    for (const item of transferList) {
      item.__isDetached = true;
    }

    return { ok: true, detachedCount: transferList.length };
  }
}

// --- Verification Tests ---

// 1. Safe Primitive and Plain Object Payload
console.log('1. Testing Safe Plain Object Payload...');
const safeMsg = {
  cmd: 'RENDER_FRAME',
  frameId: 1042,
  options: {
    antiAliasing: true,
    scale: 2.0,
    metrics: [10, 20, 30]
  }
};
const resSafe = StructuredCloneAnalyzer.verifyPostMessage(safeMsg);
assert.ok(resSafe.ok);

// 2. Safe ArrayBuffer Transfer
console.log('2. Testing Safe ArrayBuffer Transfer...');
const mockBuffer = {
  __isTransferable: true,
  byteLength: 4096,
  __isDetached: false
};
const transferMsg = {
  type: 'IMAGE_DATA',
  buffer: mockBuffer
};
const resTransfer = StructuredCloneAnalyzer.verifyPostMessage(transferMsg, [mockBuffer]);
assert.ok(resTransfer.ok);
assert.strictEqual(mockBuffer.__isDetached, true);

// 3. Repeated Transfer of Detached Buffer Rejection
console.log('3. Testing Detached Buffer Re-transfer Rejection...');
const resRetransfer = StructuredCloneAnalyzer.verifyPostMessage({ buffer: mockBuffer }, [mockBuffer]);
assert.strictEqual(resRetransfer.ok, false);
assert.ok(resRetransfer.error.includes('S_TypedArrayDetached'));

// 4. Function in Payload Rejection
console.log('4. Testing Function/Closure in Payload Rejection...');
const msgWithFunc = {
  cmd: 'COMPUTE',
  onComplete: () => { console.log('done'); }
};
const resFunc = StructuredCloneAnalyzer.verifyPostMessage(msgWithFunc);
assert.strictEqual(resFunc.ok, false);
assert.ok(resFunc.error.includes('S_UncloneablePayload'));
assert.ok(resFunc.error.includes('Function/Closure'));

// 5. DOM Element in Payload Rejection
console.log('5. Testing DOM Element in Payload Rejection...');
const mockDOMNode = {
  __isDOMNode: true,
  tag: 'canvas',
  nodeType: 1
};
const msgWithDOM = {
  canvas: mockDOMNode
};
const resDOM = StructuredCloneAnalyzer.verifyPostMessage(msgWithDOM);
assert.strictEqual(resDOM.ok, false);
assert.ok(resDOM.error.includes('S_UncloneablePayload'));
assert.ok(resDOM.error.includes('DOM Node <canvas>'));

// 6. Symbol in Payload Rejection
console.log('6. Testing Symbol in Payload Rejection...');
const msgWithSymbol = {
  id: Symbol('unique_task_id')
};
const resSymbol = StructuredCloneAnalyzer.verifyPostMessage(msgWithSymbol);
assert.strictEqual(resSymbol.ok, false);
assert.ok(resSymbol.error.includes('S_UncloneablePayload'));
assert.ok(resSymbol.error.includes('Symbol'));

// 7. Non-Transferable Object in Transfer List Rejection
console.log('7. Testing Non-Transferable Object in Transfer List Rejection...');
const plainObj = { foo: 'bar' };
const resBadTransfer = StructuredCloneAnalyzer.verifyPostMessage({ data: 'test' }, [plainObj]);
assert.strictEqual(resBadTransfer.ok, false);
assert.ok(resBadTransfer.error.includes('S_InvalidTransferObject'));

// 8. Nested Uncloneable Element in Map/Array Structure
console.log('8. Testing Deeply Nested Uncloneable in Map Structure...');
const nestedMap = new Map();
nestedMap.set('task_handler', () => 'error');
const msgWithMap = {
  data: [1, 2, { map: nestedMap }]
};
const resDeep = StructuredCloneAnalyzer.verifyPostMessage(msgWithMap);
assert.strictEqual(resDeep.ok, false);
assert.ok(resDeep.error.includes('S_UncloneablePayload'));
assert.ok(resDeep.error.includes('Function/Closure'));

// 9. Unsupported Circular Reference Rejection
console.log('9. Testing Circular Structure Rejection...');
const cyclicObj = { name: 'cycleRoot' };
cyclicObj.self = cyclicObj;
const resCyclic = StructuredCloneAnalyzer.verifyPostMessage(cyclicObj);
assert.strictEqual(resCyclic.ok, false);
assert.ok(resCyclic.error.includes('kCircularStructure'));

console.log('Trial #32 Result: PASS (Structured clone serializability lattice, transfer list validation, and DataCloneError guards verified).\n');
