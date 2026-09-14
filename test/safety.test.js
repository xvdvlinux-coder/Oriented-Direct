/**
 * Oriented-Direct (.osp) Compiler - Gated Safety Test Suite (v2.0.0 ClandleLoop)
 * Strictly zero emojis.
 */

import assert from 'node:assert';
import {
  transpile,
  SafetyError,
  SafetyAnalyzer,
  NullState,
  DiagnosticFormatter
} from '../src/index.js';

console.log('--- Running Oriented-Direct (.osp) Gated Safety Tests ---\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Rule I: Strict Member Access Invariant on Nullable DOM Query
await test('Safety gate rejects unguarded nullable DOM element dereference', () => {
  const code = `
    val btn = @find("#submit-btn");
    btn.click();
  `;
  assert.throws(() => {
    transpile(code, { filename: 'test_unguarded.osp' });
  }, (err) => {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.message.includes("Variable 'btn' may be null/undefined at dereference"));
    assert.ok(err.formattedMessage.includes('Rule I'));
    assert.ok(err.formattedMessage.includes('^^^'));
    return true;
  });
});

// 2. Rule II: Flow Guard Refinement with 'unless'
await test('Safety gate accepts guarded DOM dereference using unless guard', () => {
  const code = `
    fn handleClick() {
      val btn = @find("#submit-btn");
      unless (btn) return;
      btn.click();
    }
  `;
  const js = transpile(code, { filename: 'test_guarded.osp', includeRuntime: false });
  assert.ok(js.includes('.click()'));
});

// 3. Rule II: Flow Guard Refinement with 'if (!...)'
await test('Safety gate accepts guarded DOM dereference using if (!x) return guard', () => {
  const code = `
    fn handleClick() {
      val btn = @find("#submit-btn");
      if (!btn) return;
      btn.click();
    }
  `;
  const js = transpile(code, { filename: 'test_guarded_if.osp', includeRuntime: false });
  assert.ok(js.includes('.click()'));
});

// 4. Rule VIII: Immutability Invariant for 'val'
await test('Safety gate rejects reassignment to immutable val binding', () => {
  const code = `
    val maxLimit = 100;
    maxLimit = 200;
  `;
  assert.throws(() => {
    transpile(code, { filename: 'test_val_assign.osp' });
  }, (err) => {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.message.includes("Cannot reassign immutable 'val maxLimit'"));
    assert.ok(err.formattedMessage.includes('Rule VIII'));
    return true;
  });
});

// 5. Rule XIII: Prototype Pollution Compile-Time Guard
await test('Safety gate strictly rejects __proto__ prototype pollution attempts', () => {
  const code = `
    val obj = { a: 1 };
    obj.__proto__ = null;
  `;
  assert.throws(() => {
    transpile(code, { filename: 'test_proto_pollution.osp' });
  }, (err) => {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.message.includes('strictly prohibited (Prototype Pollution Guard)'));
    assert.ok(err.formattedMessage.includes('Rule XIII'));
    return true;
  });
});

// 6. Rule III: Function Call Arity Invariant
await test('Safety gate catches wrong number of arguments for declared functions', () => {
  const code = `
    fn add(a, b) {
      return a + b;
    }
    add(1);
  `;
  assert.throws(() => {
    transpile(code, { filename: 'test_arity.osp' });
  }, (err) => {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.message.includes("Function 'add' expects 2 arguments, but was called with 1"));
    assert.ok(err.formattedMessage.includes('Rule III'));
    return true;
  });
});

// 7. Safety Bypass Flag ({ safety: false })
await test('Bypasses safety checks when safety: false is explicitly passed', () => {
  const code = `
    val btn = @find("#submit-btn");
    btn.click();
  `;
  const js = transpile(code, { safety: false, includeRuntime: false });
  assert.ok(js.includes('.click()'));
});

// 8. Diagnostic Formatter Precision
await test('Diagnostic formatter produces Rust-style carets and line numbers without emojis', () => {
  const code = "val x = @find(\"#el\");\nx.focus();";
  try {
    transpile(code, { filename: 'src/main.osp' });
    assert.fail('Expected safety error');
  } catch (err) {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.formattedMessage.includes('src/main.osp:2'));
    assert.ok(err.formattedMessage.includes('^'));
    assert.ok(err.formattedMessage.includes('hint:'));
    // Ensure no emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(err.formattedMessage), 'Formatted diagnostic must not contain emojis');
  }
});

// 9. Master Error Catalog Verification (30 Axiomatic Rules)
await test('Safety error catalog contains all 30 formal error codes with V8 and Rust mappings', async () => {
  const { SAFETY_ERROR_CATALOG, getCatalogEntry } = await import('../src/index.js');
  const codes = Object.keys(SAFETY_ERROR_CATALOG);
  assert.strictEqual(codes.length, 30, 'Catalog must contain exactly 30 error codes (E0001 to E0030)');

  for (let i = 1; i <= 30; i++) {
    const code = `E${String(i).padStart(4, '0')}`;
    const entry = getCatalogEntry(code);
    assert.ok(entry, `Entry for ${code} must exist in catalog`);
    assert.strictEqual(entry.code, code);
    assert.ok(entry.rule.startsWith('Rule '), `${code} must specify a formal MathL rule`);
    assert.ok(entry.v8Template, `${code} must map to a Google V8 C++ error template`);
    assert.ok(entry.rustEquivalent, `${code} must specify a Rust compiler equivalent`);
    assert.ok(entry.notes.length > 0, `${code} must contain diagnostic notes`);
    assert.ok(entry.hints.length > 0, `${code} must contain actionable hints`);
  }
});

// 10. Rule IV: Match Expression Exhaustiveness Invariant (Rejection)
await test('Safety gate rejects non-exhaustive match statement missing default branch', () => {
  const code = `
    val code = 2;
    match (code) {
      case 1 => @log("Started")
      case 2 => @log("Stopped")
    }
  `;
  assert.throws(() => {
    transpile(code, { filename: 'test_match_non_exhaustive.osp' });
  }, (err) => {
    assert.strictEqual(err.name, 'SafetyError');
    assert.ok(err.message.includes("Match statement is non-exhaustive"));
    assert.ok(err.formattedMessage.includes('Rule IV'));
    assert.ok(err.formattedMessage.includes('E0004'));
    return true;
  });
});

// 11. Rule IV: Match Expression Exhaustiveness Invariant (Acceptance with default)
await test('Safety gate accepts match statement with explicit default branch', () => {
  const code = `
    val code = 2;
    match (code) {
      case 1 => @log("Started")
      case 2 => @log("Stopped")
      default => @log("Unknown")
    }
  `;
  const js = transpile(code, { filename: 'test_match_exhaustive.osp', includeRuntime: false });
  assert.ok(js.includes('switch (code)'));
  assert.ok(js.includes('default:'));
});

console.log(`\nGated Safety Tests finished: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
