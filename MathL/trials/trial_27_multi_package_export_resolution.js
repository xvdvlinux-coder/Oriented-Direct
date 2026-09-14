/**
 * Trial #27: Multi-Package Export/Import Linking Resolution (Rule XV)
 * Proves compile-time transitive export environment computation,
 * star-export collision detection (Google V8 kSyntaxError), and named/default linking invariants.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #27: Multi-Package Export Resolution ---');

export class ModuleResolutionEngine {
  constructor() {
    this.modules = new Map(); // modulePath -> ModuleDefinition
  }

  registerModule(path, def) {
    this.modules.set(path, {
      path,
      localExports: new Set(def.localExports || []),
      hasDefault: !!def.hasDefault,
      starExports: def.starExports || [], // array of module paths
      namedReExports: def.namedReExports || {} // localName -> { fromPath, importedName }
    });
  }

  computeExportEnvironment(modulePath, visited = new Set()) {
    if (visited.has(modulePath)) {
      return { ok: true, exports: new Set(), starSources: new Map() };
    }
    visited.add(modulePath);

    const mod = this.modules.get(modulePath);
    if (!mod) {
      return { ok: false, error: `Module not found: '${modulePath}'.` };
    }

    const exportedSymbols = new Set(mod.localExports);
    if (mod.hasDefault) exportedSymbols.add('default');

    for (const [localName] of Object.entries(mod.namedReExports)) {
      exportedSymbols.add(localName);
    }

    // Track which star export provided each symbol: symbol -> Set of originating module paths
    const starSourceMap = new Map();

    for (const starTarget of mod.starExports) {
      const childRes = this.computeExportEnvironment(starTarget, new Set(visited));
      if (!childRes.ok) return childRes;

      for (const sym of childRes.exports) {
        if (sym === 'default') continue; // Star exports do NOT re-export default
        if (!mod.localExports.has(sym)) {
          if (!starSourceMap.has(sym)) {
            starSourceMap.set(sym, new Set());
          }
          starSourceMap.get(sym).add(starTarget);
          exportedSymbols.add(sym);
        }
      }
    }

    return {
      ok: true,
      exports: exportedSymbols,
      starSources: starSourceMap,
      localExports: mod.localExports,
      hasDefault: mod.hasDefault
    };
  }

  resolveImport(importingPath, sourcePath, importedSymbol) {
    const envRes = this.computeExportEnvironment(sourcePath);
    if (!envRes.ok) return envRes;

    // Check default export
    if (importedSymbol === 'default') {
      if (!envRes.hasDefault) {
        return {
          ok: false,
          error: `[MathL Violation] Module '${sourcePath}' does not provide a default export.`
        };
      }
      return { ok: true, symbol: 'default', sourceModule: sourcePath };
    }

    // Check if symbol is an ambiguous star export
    const sources = envRes.starSources.get(importedSymbol);
    if (sources && sources.size > 1 && !envRes.localExports.has(importedSymbol)) {
      const sourceList = Array.from(sources).join(', ');
      return {
        ok: false,
        error: `[MathL Violation] Ambiguous export collision: The requested module '${sourcePath}' contains conflicting star exports for name '${importedSymbol}' from [${sourceList}].`
      };
    }

    // Check if symbol exists in export environment
    if (!envRes.exports.has(importedSymbol)) {
      return {
        ok: false,
        error: `[MathL Violation] The requested module '${sourcePath}' does not provide an export named '${importedSymbol}'.`
      };
    }

    return { ok: true, symbol: importedSymbol, sourceModule: sourcePath };
  }
}

const engine = new ModuleResolutionEngine();

// 1. Module 'pkg/math.osp': exports add, subtract
engine.registerModule('pkg/math.osp', {
  localExports: ['add', 'subtract'],
  hasDefault: false
});

// 2. Module 'pkg/geometry.osp': exports area, perimeter
engine.registerModule('pkg/geometry.osp', {
  localExports: ['area', 'perimeter'],
  hasDefault: false
});

// 3. Module 'pkg/index.osp': Star re-exports math and geometry
engine.registerModule('pkg/index.osp', {
  starExports: ['pkg/math.osp', 'pkg/geometry.osp']
});

// Test 1: Transitive multi-hop star import
console.log('1. Resolving transitive export from pkg/index.osp...');
const res1 = engine.resolveImport('app.osp', 'pkg/index.osp', 'add');
console.log(`   Import 'add' from 'pkg/index.osp': OK = ${res1.ok}`);
assert.strictEqual(res1.ok, true);
assert.strictEqual(res1.symbol, 'add');

// Test 2: Unresolved import specifier
console.log('2. Testing unresolved import specifier...');
const res2 = engine.resolveImport('app.osp', 'pkg/index.osp', 'multiply');
console.log(`   Import 'multiply': OK = ${res2.ok}, Error = "${res2.error}"`);
assert.strictEqual(res2.ok, false);
assert.ok(res2.error.includes("does not provide an export named 'multiply'"));

// 4. Ambiguous Star Export Collision Scenario
// Module 'pkg/intlA.osp': exports formatDate
engine.registerModule('pkg/intlA.osp', {
  localExports: ['formatDate', 'formatCurrency']
});

// Module 'pkg/intlB.osp': ALSO exports formatDate
engine.registerModule('pkg/intlB.osp', {
  localExports: ['formatDate', 'formatTime']
});

// Module 'pkg/intlBundle.osp': Star re-exports both intlA and intlB without shadowing
engine.registerModule('pkg/intlBundle.osp', {
  starExports: ['pkg/intlA.osp', 'pkg/intlB.osp']
});

// Test 3: Ambiguous star collision detection
console.log('3. Testing ambiguous star-export collision...');
const res3 = engine.resolveImport('app.osp', 'pkg/intlBundle.osp', 'formatDate');
console.log(`   Import 'formatDate': OK = ${res3.ok}, Error = "${res3.error}"`);
assert.strictEqual(res3.ok, false);
assert.ok(res3.error.includes('conflicting star exports for name \'formatDate\''));

// 5. Explicit Shadowing Resolution Scenario
// Module 'pkg/intlShadowed.osp': Star re-exports both, but explicitly defines its own formatDate
engine.registerModule('pkg/intlShadowed.osp', {
  localExports: ['formatDate'], // Explicit shadowing!
  starExports: ['pkg/intlA.osp', 'pkg/intlB.osp']
});

// Test 4: Explicit shadowing resolves the collision
console.log('4. Testing explicit shadowing of star-export collision...');
const res4 = engine.resolveImport('app.osp', 'pkg/intlShadowed.osp', 'formatDate');
console.log(`   Import 'formatDate' with explicit shadowing: OK = ${res4.ok}`);
assert.strictEqual(res4.ok, true);
assert.strictEqual(res4.symbol, 'formatDate');

// Test 5: Missing default export
console.log('5. Testing missing default export verification...');
const res5 = engine.resolveImport('app.osp', 'pkg/math.osp', 'default');
console.log(`   Import default from 'pkg/math.osp': OK = ${res5.ok}, Error = "${res5.error}"`);
assert.strictEqual(res5.ok, false);
assert.ok(res5.error.includes('does not provide a default export'));

console.log('\nTrial #27 Result: PASS (Multi-package transitive export resolution verified).\n');
