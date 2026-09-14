/**
 * Trial #23: Full Real-World Component Stress Test (FontState.osp & controls.osp)
 * Evaluates full interactive UI components with nested DOM generation, sliders,
 * event handlers, and application state models.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #23: Full UI Component Stress Test ---');

const resolveFile = (relPath) => {
  const possiblePaths = [
    path.resolve(process.cwd(), '../../.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app', relPath),
    path.resolve(process.cwd(), '../.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app', relPath),
    path.resolve('C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app', relPath)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  }
  return null;
};

// 1. Verify FontState.osp
console.log('1. Analyzing FontState.osp...');
const fontStateCode = resolveFile('src/models/FontState.osp');
assert.ok(fontStateCode, 'FontState.osp must exist');
const fontStateAst = parse(fontStateCode);
const analyzer1 = new SafetyAnalyzerPrototype();
const res1 = analyzer1.analyze(fontStateAst);

console.log(`   FontState.osp: Valid = ${res1.isValid}, Errors = ${res1.diagnostics.length}`);
assert.strictEqual(res1.isValid, true);
assert.strictEqual(res1.diagnostics.length, 0);

// 2. Verify controls.osp (138 lines of DOM elements, events, range sliders)
console.log('2. Analyzing controls.osp (Interactive UI Component)...');
const controlsCode = resolveFile('src/components/controls.osp');
assert.ok(controlsCode, 'controls.osp must exist');
const controlsAst = parse(controlsCode);
const analyzer2 = new SafetyAnalyzerPrototype();
const res2 = analyzer2.analyze(controlsAst);

console.log(`   controls.osp: Valid = ${res2.isValid}, Errors = ${res2.diagnostics.length}`);
if (!res2.isValid) {
  for (const d of res2.diagnostics) {
    console.log(`     -> [Diagnostic] Line ${d.line}:${d.col} - ${d.message}`);
  }
}
assert.strictEqual(res2.isValid, true);
assert.strictEqual(res2.diagnostics.length, 0);

console.log('\nTrial #23 Result: PASS (Full real-world UI components verified with 0 false positives).\n');
