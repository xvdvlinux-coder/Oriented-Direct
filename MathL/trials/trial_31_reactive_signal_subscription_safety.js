/**
 * Trial #31: Reactive Signal Primitives & Subscription Graph Invariance (Rule XVIII)
 * Proves compile-time detection of reactive dependency cycles, glitch-freedom via
 * topological execution ordering, and uncleaned subscription memory leak prevention.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #31: Reactive Signal Primitives & Subscription Graph Invariance ---');

export const NodeType = {
  SIGNAL: 'SIGNAL',
  COMPUTED: 'COMPUTED',
  EFFECT: 'EFFECT'
};

export class ReactiveNode {
  constructor(id, type, scope = 'global') {
    this.id = id;
    this.type = type;
    this.scope = scope;
    this.dependencies = new Set(); // Nodes this node reads from
    this.subscribers = new Set();  // Nodes that read from this node
    this.writtenSignals = new Set(); // For EFFECT nodes: signals written by this effect
    this.hasCleanup = false;
  }

  addDependency(sourceNode) {
    this.dependencies.add(sourceNode);
    sourceNode.subscribers.add(this);
  }

  addWrite(signalNode) {
    if (this.type !== NodeType.EFFECT) {
      throw new Error(`Only EFFECT nodes may have write edges. Node ${this.id} is ${this.type}.`);
    }
    this.writtenSignals.add(signalNode);
  }
}

export class ReactiveGraphAnalyzer {
  constructor() {
    this.nodes = new Map();
  }

  registerNode(node) {
    this.nodes.set(node.id, node);
  }

  /**
   * Detects cycles in the reactive graph.
   * Directed edges represent data flow:
   * 1. If B reads from A: edge A -> B (data flows from A to B)
   * 2. If Effect E writes to Signal S: edge E -> S (data flows from E to S)
   */
  detectCycles() {
    // Build adjacency list: source -> array of targets
    const adj = new Map();
    for (const [id, node] of this.nodes.entries()) {
      if (!adj.has(id)) adj.set(id, []);

      // Readers receive data from this node
      for (const sub of node.subscribers) {
        adj.get(id).push(sub.id);
      }

      // If this node is an effect writing to signals, data flows from effect to signal
      if (node.type === NodeType.EFFECT) {
        for (const targetSignal of node.writtenSignals) {
          adj.get(id).push(targetSignal.id);
        }
      }
    }

    // Depth-First Search with 3-color cycle detection
    const visited = new Map(); // id -> 0: unvisited, 1: visiting, 2: visited
    for (const id of this.nodes.keys()) {
      visited.set(id, 0);
    }

    const currentPath = [];

    const dfs = (currId) => {
      visited.set(currId, 1);
      currentPath.push(currId);

      const neighbors = adj.get(currId) || [];
      for (const neighborId of neighbors) {
        if (visited.get(neighborId) === 1) {
          // Cycle found!
          const cycleStartIdx = currentPath.indexOf(neighborId);
          const cycleTrace = currentPath.slice(cycleStartIdx).concat([neighborId]).join(' -> ');
          return {
            hasCycle: true,
            cycleTrace
          };
        }
        if (visited.get(neighborId) === 0) {
          const res = dfs(neighborId);
          if (res.hasCycle) return res;
        }
      }

      currentPath.pop();
      visited.set(currId, 2);
      return { hasCycle: false };
    };

    for (const id of this.nodes.keys()) {
      if (visited.get(id) === 0) {
        const res = dfs(id);
        if (res.hasCycle) {
          return {
            ok: false,
            error: `[MathL Violation: S_ReactiveDependencyCycle] Detected reactive dependency cycle: ${res.cycleTrace}. Leads to infinite evaluation recursion or stack overflow.`
          };
        }
      }
    }

    return { ok: true };
  }

  /**
   * Computes topological evaluation order of computed and effect nodes for glitch-free propagation.
   */
  computeGlitchFreeOrder() {
    const inDegree = new Map();
    const adj = new Map();

    for (const [id, node] of this.nodes.entries()) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }

    for (const [id, node] of this.nodes.entries()) {
      for (const sub of node.subscribers) {
        adj.get(id).push(sub.id);
        inDegree.set(sub.id, (inDegree.get(sub.id) || 0) + 1);
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sortedOrder = [];
    while (queue.length > 0) {
      const u = queue.shift();
      sortedOrder.push(u);

      for (const v of (adj.get(u) || [])) {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (sortedOrder.length !== this.nodes.size) {
      return { ok: false, error: 'Cannot compute topological order on cyclic graph.' };
    }

    return { ok: true, order: sortedOrder };
  }

  /**
   * Verifies that scoped effects subscribing to outer/global signals register cleanup handlers.
   */
  verifySubscriptionLifecycles() {
    for (const [id, node] of this.nodes.entries()) {
      if (node.type === NodeType.EFFECT && node.scope !== 'global') {
        // Check if any dependency lives outside node's scope
        let subscribesToOuter = false;
        for (const dep of node.dependencies) {
          if (dep.scope === 'global' || dep.scope !== node.scope) {
            subscribesToOuter = true;
            break;
          }
        }

        if (subscribesToOuter && !node.hasCleanup) {
          return {
            ok: false,
            error: `[MathL Violation: S_UncleanedSignalSubscription] Effect '${node.id}' in scope '${node.scope}' subscribes to outer reactive state without onCleanup() handler. Causes detached closure memory leak.`
          };
        }
      }
    }

    return { ok: true };
  }
}

// --- Verification Tests ---

// 1. Valid Acyclic Reactive Graph (Diamond Shape)
console.log('1. Testing Valid Acyclic Diamond Graph...');
const graph1 = new ReactiveGraphAnalyzer();
const sigA = new ReactiveNode('sigA', NodeType.SIGNAL);
const compB = new ReactiveNode('compB', NodeType.COMPUTED);
const compC = new ReactiveNode('compC', NodeType.COMPUTED);
const compD = new ReactiveNode('compD', NodeType.COMPUTED);

// sigA -> compB, sigA -> compC, (compB, compC) -> compD
compB.addDependency(sigA);
compC.addDependency(sigA);
compD.addDependency(compB);
compD.addDependency(compC);

graph1.registerNode(sigA);
graph1.registerNode(compB);
graph1.registerNode(compC);
graph1.registerNode(compD);

const cycleCheck1 = graph1.detectCycles();
assert.ok(cycleCheck1.ok);

const topoRes = graph1.computeGlitchFreeOrder();
assert.ok(topoRes.ok);
// sigA must be evaluated before compB and compC; compD must be evaluated last
assert.strictEqual(topoRes.order[0], 'sigA');
assert.strictEqual(topoRes.order[3], 'compD');

// 2. Direct Circular Dependency (comp1 -> comp2 -> comp1)
console.log('2. Testing Direct Circular Computed Dependency...');
const graph2 = new ReactiveGraphAnalyzer();
const c1 = new ReactiveNode('c1', NodeType.COMPUTED);
const c2 = new ReactiveNode('c2', NodeType.COMPUTED);

c1.addDependency(c2);
c2.addDependency(c1);

graph2.registerNode(c1);
graph2.registerNode(c2);

const cycleCheck2 = graph2.detectCycles();
assert.strictEqual(cycleCheck2.ok, false);
assert.ok(cycleCheck2.error.includes('S_ReactiveDependencyCycle'));

// 3. Self-Referencing Computed Dependency (cSelf -> cSelf)
console.log('3. Testing Self-Referencing Dependency...');
const graph3 = new ReactiveGraphAnalyzer();
const cSelf = new ReactiveNode('cSelf', NodeType.COMPUTED);
cSelf.addDependency(cSelf);
graph3.registerNode(cSelf);

const cycleCheck3 = graph3.detectCycles();
assert.strictEqual(cycleCheck3.ok, false);
assert.ok(cycleCheck3.error.includes('S_ReactiveDependencyCycle'));

// 4. Reactive Effect Feedback Cycle
console.log('4. Testing Effect Feedback Loop (Effect reads A, writes B, A depends on B)...');
const graph4 = new ReactiveGraphAnalyzer();
const sInput = new ReactiveNode('sInput', NodeType.SIGNAL);
const cDerived = new ReactiveNode('cDerived', NodeType.COMPUTED);
const effFeedback = new ReactiveNode('effFeedback', NodeType.EFFECT);

cDerived.addDependency(sInput);
effFeedback.addDependency(cDerived);
effFeedback.addWrite(sInput); // Writes back to sInput

graph4.registerNode(sInput);
graph4.registerNode(cDerived);
graph4.registerNode(effFeedback);

const cycleCheck4 = graph4.detectCycles();
assert.strictEqual(cycleCheck4.ok, false);
assert.ok(cycleCheck4.error.includes('S_ReactiveDependencyCycle'));

// 5. Safe One-Way Effect (No Feedback)
console.log('5. Testing Safe One-Way Effect...');
const graph5 = new ReactiveGraphAnalyzer();
const sCount = new ReactiveNode('sCount', NodeType.SIGNAL);
const effLog = new ReactiveNode('effLog', NodeType.EFFECT);
const sOutputLog = new ReactiveNode('sOutputLog', NodeType.SIGNAL);

effLog.addDependency(sCount);
effLog.addWrite(sOutputLog);

graph5.registerNode(sCount);
graph5.registerNode(effLog);
graph5.registerNode(sOutputLog);

const cycleCheck5 = graph5.detectCycles();
assert.ok(cycleCheck5.ok);

// 6. Uncleaned Subscription in Scoped Component (Memory Leak Rejection)
console.log('6. Testing Uncleaned Subscription Leak Rejection...');
const graph6 = new ReactiveGraphAnalyzer();
const sGlobalTheme = new ReactiveNode('sGlobalTheme', NodeType.SIGNAL, 'global');
const effComponent = new ReactiveNode('effComponent', NodeType.EFFECT, 'UserProfileComponent');

effComponent.addDependency(sGlobalTheme);
effComponent.hasCleanup = false; // No cleanup registered!

graph6.registerNode(sGlobalTheme);
graph6.registerNode(effComponent);

const leakCheck1 = graph6.verifySubscriptionLifecycles();
assert.strictEqual(leakCheck1.ok, false);
assert.ok(leakCheck1.error.includes('S_UncleanedSignalSubscription'));

// 7. Scoped Component with onCleanup Handler (Safe)
console.log('7. Testing Scoped Component with Cleanup Handler...');
effComponent.hasCleanup = true;
const leakCheck2 = graph6.verifySubscriptionLifecycles();
assert.ok(leakCheck2.ok);

console.log('Trial #31 Result: PASS (Reactive signal dependency acyclicity, glitch-free order, and subscription cleanup verified).\n');
