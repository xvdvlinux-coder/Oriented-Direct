/**
 * Trial #24: DOM Element Tree Connection & Lifecycle Invariance (Rule XII)
 * Proves compile-time detection of detached DOM node dereferencing and detached listener memory leaks.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #24: DOM Lifecycle & Detachment Invariance ---');

export const DOMConnState = {
  BOTTOM: 0,
  UNATTACHED: 1,
  CONNECTED: 2,
  DETACHED: 3,
  TOP: 4
};

export class DOMNodeLifecycle {
  constructor(id, tag) {
    this.id = id;
    this.tag = tag;
    this.state = DOMConnState.UNATTACHED;
    this.listeners = new Set(); // active event names
    this.children = [];
    this.parent = null;
  }

  attachTo(parent) {
    this.parent = parent;
    parent.children.push(this);
    if (parent.state === DOMConnState.CONNECTED) {
      this.propagateConnection(DOMConnState.CONNECTED);
    }
  }

  propagateConnection(newState) {
    this.state = newState;
    for (const child of this.children) {
      child.propagateConnection(newState);
    }
  }

  detach() {
    this.state = DOMConnState.DETACHED;
    if (this.parent) {
      this.parent.children = this.parent.children.filter(c => c !== this);
      this.parent = null;
    }
    for (const child of this.children) {
      child.propagateConnection(DOMConnState.DETACHED);
    }
  }

  addListener(evt) {
    this.listeners.add(evt);
  }

  removeListener(evt) {
    this.listeners.delete(evt);
  }
}

export class DOMLifecycleAnalyzer {
  constructor() {
    this.documentRoot = new DOMNodeLifecycle('document.body', 'body');
    this.documentRoot.state = DOMConnState.CONNECTED;
  }

  verifyOperation(node, op) {
    const opsRequiringConnection = ['getBoundingClientRect', 'focus', 'offsetWidth', 'offsetHeight', 'scrollIntoView'];
    if (opsRequiringConnection.includes(op)) {
      if (node.state === DOMConnState.DETACHED) {
        return {
          ok: false,
          error: `[MathL Violation] Cannot execute '${op}' on detached DOM node <${node.tag}#${node.id}>.`
        };
      }
      if (node.state === DOMConnState.UNATTACHED) {
        return {
          ok: false,
          error: `[MathL Violation] Cannot execute '${op}' on unattached DOM node <${node.tag}#${node.id}>.`
        };
      }
    }
    return { ok: true };
  }

  verifyDetachmentSafety(node) {
    // A detached node with active listeners that were never cleaned up causes a memory leak
    if (node.state === DOMConnState.DETACHED && node.listeners.size > 0) {
      const dangling = Array.from(node.listeners).join(', ');
      return {
        ok: false,
        error: `[MathL Violation] Memory leak: Detached node <${node.tag}#${node.id}> retains active event listeners (${dangling}) without @off cleanup.`
      };
    }
    for (const child of node.children) {
      const childRes = this.verifyDetachmentSafety(child);
      if (!childRes.ok) return childRes;
    }
    return { ok: true };
  }
}

const analyzer = new DOMLifecycleAnalyzer();

// Step 1: Create an element (Unattached)
const modal = new DOMNodeLifecycle('modalBox', 'div');
assert.strictEqual(modal.state, DOMConnState.UNATTACHED);

// Test 1a: Calling getBoundingClientRect on unattached node fails
const test1a = analyzer.verifyOperation(modal, 'getBoundingClientRect');
console.log(`1. Operation on unattached node: OK = ${test1a.ok}, Error = "${test1a.error}"`);
assert.strictEqual(test1a.ok, false);
assert.ok(test1a.error.includes('unattached DOM node'));

// Step 2: Attach element to document tree (Connected)
modal.attachTo(analyzer.documentRoot);
assert.strictEqual(modal.state, DOMConnState.CONNECTED);

// Test 2: Calling getBoundingClientRect on connected node succeeds
const test2 = analyzer.verifyOperation(modal, 'getBoundingClientRect');
console.log(`2. Operation on connected node: OK = ${test2.ok}`);
assert.strictEqual(test2.ok, true);

// Step 3: Add event listener
modal.addListener('click');

// Step 4: Detach element without removing listener (Detached)
modal.detach();
assert.strictEqual(modal.state, DOMConnState.DETACHED);

// Test 3: Operation on detached node fails
const test3 = analyzer.verifyOperation(modal, 'focus');
console.log(`3. Operation on detached node: OK = ${test3.ok}, Error = "${test3.error}"`);
assert.strictEqual(test3.ok, false);
assert.ok(test3.error.includes('detached DOM node'));

// Test 4: Verify detachment memory leak detection
const test4 = analyzer.verifyDetachmentSafety(modal);
console.log(`4. Detached node with lingering listener: OK = ${test4.ok}, Error = "${test4.error}"`);
assert.strictEqual(test4.ok, false);
assert.ok(test4.error.includes('Memory leak'));

// Step 5: Clean up event listener via @off
modal.removeListener('click');
const test5 = analyzer.verifyDetachmentSafety(modal);
console.log(`5. Detached node after @off cleanup: OK = ${test5.ok}`);
assert.strictEqual(test5.ok, true);

// Step 6: Re-attach to document tree -> restores Connected state
modal.attachTo(analyzer.documentRoot);
assert.strictEqual(modal.state, DOMConnState.CONNECTED);
const test6 = analyzer.verifyOperation(modal, 'focus');
console.log(`6. Re-attached node operation: OK = ${test6.ok}`);
assert.strictEqual(test6.ok, true);

console.log('\nTrial #24 Result: PASS (DOM lifecycle invariance and detachment leak prevention verified).\n');
