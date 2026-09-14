/**
 * Trial #38: Multi-File Incremental Analysis Cache & Invalidation Invariant (Rule XXV)
 * Formalizes incremental cache consistency theorem, topological re-analysis,
 * early cut-off stabilization, and mathematical equivalence to whole-program fixpoint:
 * lfp(F^#_incremental) === lfp(F^#_whole_program)
 */

import assert from 'node:assert';
import crypto from 'node:crypto';

console.log('--- Running MathL Trial #38: Multi-File Incremental Analysis Cache ---');

export class ModuleAST {
  constructor(id, sourceCode, imports = [], exports = {}, internalBody = '') {
    this.id = id;
    this.sourceCode = sourceCode;
    this.imports = imports;   // Array of { symbol, from }
    this.exports = exports;   // Map of symbol -> { type, arity }
    this.internalBody = internalBody;
    this.hash = this._computeHash();
  }

  _computeHash() {
    return crypto.createHash('sha256').update(this.sourceCode).digest('hex');
  }

  updateSource(newCode, newImports = null, newExports = null, newBody = null) {
    this.sourceCode = newCode;
    if (newImports) this.imports = newImports;
    if (newExports) this.exports = newExports;
    if (newBody !== null) this.internalBody = newBody;
    this.hash = this._computeHash();
  }
}

export class DependencyGraph {
  constructor() {
    this.modules = new Map(); // id -> ModuleAST
    this.dependencies = new Map(); // id -> Set of dependency ids
    this.reverseDependencies = new Map(); // id -> Set of dependent ids
  }

  addModule(module) {
    this.modules.set(module.id, module);
    if (!this.dependencies.has(module.id)) this.dependencies.set(module.id, new Set());
    if (!this.reverseDependencies.has(module.id)) this.reverseDependencies.set(module.id, new Set());

    for (const imp of module.imports) {
      this.dependencies.get(module.id).add(imp.from);
      if (!this.reverseDependencies.has(imp.from)) {
        this.reverseDependencies.set(imp.from, new Set());
      }
      this.reverseDependencies.get(imp.from).add(module.id);
    }
  }

  getDirectDependents(moduleId) {
    return this.reverseDependencies.get(moduleId) || new Set();
  }

  getTransitiveDependents(moduleId) {
    const visited = new Set();
    const queue = [moduleId];

    while (queue.length > 0) {
      const current = queue.shift();
      const direct = this.getDirectDependents(current);
      for (const dep of direct) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }

    return visited;
  }

  getTopologicalOrder(subset = null) {
    const targetSet = subset ? new Set(subset) : new Set(this.modules.keys());
    const visited = new Set();
    const order = [];

    const visit = (modId) => {
      if (visited.has(modId)) return;
      visited.add(modId);

      const deps = this.dependencies.get(modId) || new Set();
      for (const depId of deps) {
        if (targetSet.has(depId)) {
          visit(depId);
        }
      }

      order.push(modId);
    };

    for (const modId of targetSet) {
      visit(modId);
    }

    return order;
  }
}

export class IncrementalAnalysisEngine {
  constructor(graph) {
    this.graph = graph;
    this.cache = new Map(); // moduleId -> { hash, interfaceSummary, diagnostics, analyzedAt }
  }

  _computeInterfaceSummary(module) {
    // Structural serialization of exported signatures
    return JSON.stringify(module.exports);
  }

  _analyzeSingleModule(module, projectInterfaces) {
    const diagnostics = [];

    // Verify imported symbols against provider interfaces
    for (const imp of module.imports) {
      const providerInterface = projectInterfaces.get(imp.from);
      if (!providerInterface) {
        diagnostics.push({
          severity: 'ERROR',
          code: 'S_MissingModule',
          message: `Module '${module.id}' imports from non-existent module '${imp.from}'.`
        });
        continue;
      }

      const exportedSymbols = providerInterface.exports || {};
      if (!exportedSymbols[imp.symbol]) {
        diagnostics.push({
          severity: 'ERROR',
          code: 'S_UnresolvedImportSpecifier',
          message: `Module '${module.id}' imports '${imp.symbol}' which is not exported by '${imp.from}'.`
        });
      } else {
        // Arity / contract check
        const expSpec = exportedSymbols[imp.symbol];
        if (imp.expectedArity !== undefined && expSpec.arity !== imp.expectedArity) {
          diagnostics.push({
            severity: 'ERROR',
            code: 'S_ArityMismatch',
            message: `Module '${module.id}' expects arity ${imp.expectedArity} for '${imp.symbol}', but '${imp.from}' exports arity ${expSpec.arity}.`
          });
        }
      }
    }

    // Check internal body syntax / error markers
    if (module.internalBody.includes('__SYNTAX_ERROR__')) {
      diagnostics.push({
        severity: 'ERROR',
        code: 'S_SyntaxError',
        message: `Syntax error detected in '${module.id}'.`
      });
    }

    return {
      moduleId: module.id,
      hash: module.hash,
      interfaceSummary: this._computeInterfaceSummary(module),
      exports: module.exports,
      diagnostics
    };
  }

  runFullProgramAnalysis() {
    const startTime = performance.now();
    const order = this.graph.getTopologicalOrder();
    const projectInterfaces = new Map();
    const allDiagnostics = [];
    let modulesAnalyzedCount = 0;

    for (const modId of order) {
      const mod = this.graph.modules.get(modId);
      const result = this._analyzeSingleModule(mod, projectInterfaces);
      modulesAnalyzedCount++;

      // Cache result
      this.cache.set(modId, {
        hash: mod.hash,
        interfaceSummary: result.interfaceSummary,
        exports: result.exports,
        diagnostics: result.diagnostics,
        analyzedAt: Date.now()
      });

      projectInterfaces.set(modId, { exports: result.exports });
      allDiagnostics.push(...result.diagnostics);
    }

    const durationMs = performance.now() - startTime;
    return {
      diagnostics: allDiagnostics,
      modulesAnalyzedCount,
      cacheHits: 0,
      durationMs
    };
  }

  runIncrementalAnalysis(changedModuleId = null) {
    const startTime = performance.now();
    let modulesAnalyzedCount = 0;
    let cacheHits = 0;
    const allDiagnostics = [];

    // If no module specified, check hashes of all modules
    const modulesToInvestigate = changedModuleId ? [changedModuleId] : Array.from(this.graph.modules.keys());
    const invalidatedModules = new Set();

    for (const modId of modulesToInvestigate) {
      const mod = this.graph.modules.get(modId);
      const cached = this.cache.get(modId);

      if (!cached || cached.hash !== mod.hash) {
        invalidatedModules.add(modId);
      } else {
        cacheHits++;
      }
    }

    if (invalidatedModules.size === 0) {
      // Complete cache hit
      for (const cached of this.cache.values()) {
        allDiagnostics.push(...cached.diagnostics);
      }
      return {
        diagnostics: allDiagnostics,
        modulesAnalyzedCount: 0,
        cacheHits: this.graph.modules.size,
        durationMs: performance.now() - startTime
      };
    }

    // Topological re-analysis of invalidated subgraph
    const topoOrder = this.graph.getTopologicalOrder();
    const projectInterfaces = new Map();

    for (const modId of topoOrder) {
      const cached = this.cache.get(modId);
      if (cached && !invalidatedModules.has(modId)) {
        projectInterfaces.set(modId, { exports: cached.exports });
      }
    }

    // Process invalidated modules
    for (const modId of topoOrder) {
      if (!invalidatedModules.has(modId)) {
        continue;
      }

      const mod = this.graph.modules.get(modId);
      const prevCached = this.cache.get(modId);
      const result = this._analyzeSingleModule(mod, projectInterfaces);
      modulesAnalyzedCount++;

      // Check Early Cut-off Property:
      // If exported interface summary is identical to previous cache,
      // downstream dependents do NOT need invalidation!
      if (prevCached && prevCached.interfaceSummary === result.interfaceSummary) {
        // Interface stable: Do not invalidate downstream reverse dependencies!
      } else {
        // Interface changed: Invalidate direct and transitive reverse dependencies
        const dependents = this.graph.getTransitiveDependents(modId);
        for (const depId of dependents) {
          invalidatedModules.add(depId);
        }
      }

      // Update cache
      this.cache.set(modId, {
        hash: mod.hash,
        interfaceSummary: result.interfaceSummary,
        exports: result.exports,
        diagnostics: result.diagnostics,
        analyzedAt: Date.now()
      });

      projectInterfaces.set(modId, { exports: result.exports });
    }

    // Aggregate diagnostics from all modules (cached + newly analyzed)
    for (const modId of topoOrder) {
      const cached = this.cache.get(modId);
      if (cached) {
        allDiagnostics.push(...cached.diagnostics);
      }
    }

    const durationMs = performance.now() - startTime;
    return {
      diagnostics: allDiagnostics,
      modulesAnalyzedCount,
      cacheHits: this.graph.modules.size - modulesAnalyzedCount,
      durationMs
    };
  }
}

// =========================================================================
// VERIFICATION SUITE
// =========================================================================

console.log('1. Constructing 8-Module Dependency Graph...');
const graph = new DependencyGraph();

// Leaf modules
const mUtils = new ModuleAST('utils.osp', 'export fun add(a, b) => a + b', [], { add: { type: 'function', arity: 2 } });
const mTypes = new ModuleAST('types.osp', 'export struct User { id, name }', [], { User: { type: 'struct', arity: 2 } });

// Intermediate layers
const mDb = new ModuleAST('db.osp', 'import { add } from "utils.osp"', [{ symbol: 'add', from: 'utils.osp', expectedArity: 2 }], { query: { type: 'function', arity: 1 } });
const mAuth = new ModuleAST('auth.osp', 'import { User } from "types.osp"', [{ symbol: 'User', from: 'types.osp' }], { verifyToken: { type: 'function', arity: 1 } });
const mUserModel = new ModuleAST('userModel.osp', 'import { query } from "db.osp"', [{ symbol: 'query', from: 'db.osp', expectedArity: 1 }], { getUser: { type: 'function', arity: 1 } });

// Services and Controllers
const mUserService = new ModuleAST('userService.osp', 'import { getUser } from "userModel.osp"; import { verifyToken } from "auth.osp"', [
  { symbol: 'getUser', from: 'userModel.osp', expectedArity: 1 },
  { symbol: 'verifyToken', from: 'auth.osp', expectedArity: 1 }
], { authenticateAndGet: { type: 'function', arity: 2 } });

const mApiController = new ModuleAST('apiController.osp', 'import { authenticateAndGet } from "userService.osp"', [
  { symbol: 'authenticateAndGet', from: 'userService.osp', expectedArity: 2 }
], { handleRequest: { type: 'function', arity: 1 } });

const mMain = new ModuleAST('main.osp', 'import { handleRequest } from "apiController.osp"', [
  { symbol: 'handleRequest', from: 'apiController.osp', expectedArity: 1 }
], { run: { type: 'function', arity: 0 } });

graph.addModule(mUtils);
graph.addModule(mTypes);
graph.addModule(mDb);
graph.addModule(mAuth);
graph.addModule(mUserModel);
graph.addModule(mUserService);
graph.addModule(mApiController);
graph.addModule(mMain);

const engine = new IncrementalAnalysisEngine(graph);

// 2. Cold Whole-Program Analysis Baseline
console.log('2. Running Baseline Cold Whole-Program Analysis...');
const coldRes = engine.runFullProgramAnalysis();
assert.strictEqual(coldRes.modulesAnalyzedCount, 8);
assert.strictEqual(coldRes.diagnostics.length, 0);

// 3. Zero-Change Incremental Cache Hit Invariant
console.log('3. Testing Zero-Change Complete Cache Hit Invariant...');
const zeroChangeRes = engine.runIncrementalAnalysis();
assert.strictEqual(zeroChangeRes.modulesAnalyzedCount, 0);
assert.strictEqual(zeroChangeRes.cacheHits, 8);
assert.strictEqual(zeroChangeRes.diagnostics.length, 0);

// 4. Early Cut-Off Stabilization Invariant (Internal Function Body Change)
console.log('4. Testing Early Cut-Off Stabilization (Leaf Body Change)...');
// Modify body of utils.osp, but leave exported interface (add: arity 2) completely identical
mUtils.updateSource(
  'export fun add(a, b) => { const sum = a + b; return sum; }',
  [],
  { add: { type: 'function', arity: 2 } }, // Exactly same interface
  'internal implementation details changed'
);

const earlyCutoffRes = engine.runIncrementalAnalysis('utils.osp');
// Invariant: ONLY utils.osp is re-analyzed. The 6 downstream dependents are NOT re-analyzed!
assert.strictEqual(earlyCutoffRes.modulesAnalyzedCount, 1);
assert.strictEqual(earlyCutoffRes.cacheHits, 7);
assert.strictEqual(earlyCutoffRes.diagnostics.length, 0);

// Verify bit-for-bit equivalence with cold analysis
const freshColdEngine = new IncrementalAnalysisEngine(graph);
const freshColdRes = freshColdEngine.runFullProgramAnalysis();
assert.deepStrictEqual(earlyCutoffRes.diagnostics, freshColdRes.diagnostics);

// 5. Interface-Breaking Change & Transitive Invalidation
console.log('5. Testing Interface-Breaking Invalidation & Error Propagation...');
// Change arity of add from 2 to 3 in utils.osp -> breaks db.osp which expects arity 2!
mUtils.updateSource(
  'export fun add(a, b, c) => a + b + c',
  [],
  { add: { type: 'function', arity: 3 } }, // Changed arity!
  'signature changed'
);

const breakingRes = engine.runIncrementalAnalysis('utils.osp');
// Interface changed: utils.osp plus transitive dependents (db.osp, userModel.osp, userService.osp, apiController.osp, main.osp) re-analyzed
assert.strictEqual(breakingRes.modulesAnalyzedCount > 1, true);
assert.strictEqual(breakingRes.diagnostics.length, 1);
assert.strictEqual(breakingRes.diagnostics[0].code, 'S_ArityMismatch');
assert.ok(breakingRes.diagnostics[0].message.includes("Module 'db.osp' expects arity 2 for 'add', but 'utils.osp' exports arity 3"));

// Verify mathematical equivalence with fresh whole-program analysis
const coldBreakingRes = freshColdEngine.runFullProgramAnalysis();
assert.deepStrictEqual(breakingRes.diagnostics, coldBreakingRes.diagnostics);

// 6. Fix breaking change and verify restoration to 0 diagnostics
console.log('6. Testing Resolution and Cache Recovery...');
mUtils.updateSource(
  'export fun add(a, b) => a + b',
  [],
  { add: { type: 'function', arity: 2 } },
  'reverted to arity 2'
);

const recoveryRes = engine.runIncrementalAnalysis('utils.osp');
assert.strictEqual(recoveryRes.diagnostics.length, 0);

console.log('Trial #38 Result: PASS (Incremental analysis cache, early cut-off, and whole-program fixpoint equivalence verified).\n');
