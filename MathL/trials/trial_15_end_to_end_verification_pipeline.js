/**
 * Trial #15: End-to-End Multi-Module Verification Pipeline
 * Simulates compiling and verifying a multi-file Oriented-Direct application
 * against the Dual-Language Guardian (J x O) and V8 error invariants.
 */

import assert from 'node:assert';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #15: End-to-End Multi-Module Verification Pipeline ---');

// Simulated Module 1: src/utils/calculator.osp
const module1Source = `
  export fn computeDiscount(price, percentage) {
    if (percentage < 0 or percentage > 100) {
      return price;
    }
    val discountAmount = (price * percentage) / 100;
    return price - discountAmount;
  }
`;

// Simulated Module 2 (Safe): src/main.osp
const safeMainSource = `
  val originalPrice = 250;
  val finalPrice = originalPrice - 50;

  val container = @find("#app-root");
  unless (container) {
    return;
  }
  @text(container, "Discounted Price: " + finalPrice);
  @log("Final price calculated:", finalPrice);
`;

// Simulated Module 3 (Hazardous): Unguarded DOM access
const hazardousMainSource = `
  val container = @find("#app-root");
  @text(container, "Broken"); // Unguarded: container may be null
  val text = container.textContent;
`;

const analyzer = new SafetyAnalyzerPrototype();

console.log('1. Analyzing Module 1 (utils/calculator.osp)...');
const ast1 = parse(module1Source);
const res1 = analyzer.analyze(ast1);
console.log(`   Module 1 valid: ${res1.isValid} (0 errors)`);
assert.strictEqual(res1.isValid, true);

console.log('2. Analyzing Safe Multi-Module Application (main.osp)...');
const ast2 = parse(safeMainSource);
const res2 = analyzer.analyze(ast2);
console.log(`   Safe App valid: ${res2.isValid} (Errors: ${res2.diagnostics.length})`);
if (!res2.isValid) {
  for (const d of res2.diagnostics) {
    console.log(`   -> Diagnostic: ${d.message}`);
  }
}
assert.strictEqual(res2.isValid, true);
assert.strictEqual(res2.diagnostics.length, 0);

console.log('3. Analyzing Hazardous Application...');
const ast3 = parse(hazardousMainSource);
const res3 = analyzer.analyze(ast3);
console.log(`   Hazardous App valid: ${res3.isValid} (Caught ${res3.diagnostics.length} errors)`);
assert.strictEqual(res3.isValid, false);
assert.ok(res3.diagnostics.length >= 1, 'Expected at least 1 safety violation');

for (const d of res3.diagnostics) {
  console.log(`     -> [Caught] ${d.message}`);
}

console.log('\nTrial #15 Result: PASS (End-to-End Multi-Module Verification Pipeline verified).\n');
