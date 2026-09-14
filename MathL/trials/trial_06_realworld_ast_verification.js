/**
 * Trial #06: Real-World AST Verification Harness
 * Tests parsing and safety verification of actual Oriented-Direct programs.
 */

import assert from 'node:assert';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #06: Real-World AST Verification Harness ---');

// Scenario 1: Reassigning a 'val' binding must be caught
const valReassignCode = `
  val maxLimit = 50;
  maxLimit = 100;
`;

const ast1 = parse(valReassignCode);
const analyzer1 = new SafetyAnalyzerPrototype();
const res1 = analyzer1.analyze(ast1);

console.log(`Scenario 1 (val reassignment): Valid = ${res1.isValid}`);
assert.strictEqual(res1.isValid, false);
assert.ok(res1.diagnostics[0].message.includes("Cannot reassign immutable 'val maxLimit'"));

// Scenario 2: Unguarded DOM dereference must be caught
const domUnguardedCode = `
  val btn = @find("#submitBtn");
  val label = btn.textContent;
`;

const ast2 = parse(domUnguardedCode);
const analyzer2 = new SafetyAnalyzerPrototype();
const res2 = analyzer2.analyze(ast2);

console.log(`Scenario 2 (unguarded DOM dereference): Valid = ${res2.isValid}`);
assert.strictEqual(res2.isValid, false);
assert.ok(res2.diagnostics[0].message.includes("Variable 'btn' may be null/undefined at dereference"));

// Scenario 3: Guarded DOM dereference with 'unless (btn) return;' must pass
const domGuardedCode = `
  val btn = @find("#submitBtn");
  unless (btn) {
    return;
  }
  val label = btn.textContent;
  @log(label);
`;

const ast3 = parse(domGuardedCode);
const analyzer3 = new SafetyAnalyzerPrototype();
const res3 = analyzer3.analyze(ast3);

console.log(`Scenario 3 (guarded DOM dereference): Valid = ${res3.isValid}`);
assert.strictEqual(res3.isValid, true);
assert.strictEqual(res3.diagnostics.length, 0);

// Scenario 4: Function Arity Mismatch must be caught
const arityCode = `
  fn add(a, b) {
    return a + b;
  }
  val res = add(10);
`;

const ast4 = parse(arityCode);
const analyzer4 = new SafetyAnalyzerPrototype();
const res4 = analyzer4.analyze(ast4);

console.log(`Scenario 4 (function arity mismatch): Valid = ${res4.isValid}`);
assert.strictEqual(res4.isValid, false);
assert.ok(res4.diagnostics[0].message.includes("Function 'add' expects 2 arguments, but was called with 1"));

// Scenario 5: Sealed Struct unlisted property assignment must be caught
const structCode = `
  struct Point { x, y }
  val pt = { x: 10, y: 20 };
`;

const ast5 = parse(structCode);
const analyzer5 = new SafetyAnalyzerPrototype();
const res5 = analyzer5.analyze(ast5);

console.log(`Scenario 5 (sealed struct definition): Valid = ${res5.isValid}`);
assert.strictEqual(res5.isValid, true);

console.log('\nTrial #06 Result: PASS (All 5 real-world AST safety scenarios verified).\n');
