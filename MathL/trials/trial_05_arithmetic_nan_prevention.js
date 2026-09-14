/**
 * Trial #05: Arithmetic NaN Contamination Prevention
 * Tests detecting undefined operands in arithmetic expressions before runtime emission.
 */

import assert from 'node:assert';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #05: Arithmetic NaN Prevention ---');

// Test Case A: Valid Arithmetic
const safeMathCode = `
  val price = 100;
  val tax = 15;
  val total = price + tax;
  @log(total);
`;

const safeAst = parse(safeMathCode);
const safeAnalyzer = new SafetyAnalyzerPrototype();
const safeResult = safeAnalyzer.analyze(safeAst);

console.log(`Safe Arithmetic AST Analysis: Valid = ${safeResult.isValid}, Diagnostics = ${safeResult.diagnostics.length}`);
assert.strictEqual(safeResult.isValid, true);
assert.strictEqual(safeResult.diagnostics.length, 0);

// Test Case B: Undefined Operand Leading to NaN
const hazardousMathCode = `
  mut unassigned;
  val total = 100 + unassigned;
  @log(total);
`;

const hazardousAst = parse(hazardousMathCode);
const hazardousAnalyzer = new SafetyAnalyzerPrototype();
const hazardousResult = hazardousAnalyzer.analyze(hazardousAst);

console.log(`Hazardous Arithmetic AST Analysis: Valid = ${hazardousResult.isValid}`);
if (!hazardousResult.isValid) {
  console.log(`  Caught: ${hazardousResult.diagnostics[0].message}`);
}

assert.strictEqual(hazardousResult.isValid, false);
assert.ok(hazardousResult.diagnostics[0].message.includes('undefined operand produces NaN'));

console.log('\nTrial #05 Result: PASS (Silent NaN arithmetic bugs caught at compile time).\n');
