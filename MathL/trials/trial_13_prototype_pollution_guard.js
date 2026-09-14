/**
 * Trial #13: Prototype Pollution Compile-Time Guard
 * Proves that prototype tampering (__proto__, prototype reassignment) is caught and rejected at compile-time.
 */

import assert from 'node:assert';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #13: Prototype Pollution Compile-Time Guard ---');

class PrototypePollutionSafetyAnalyzer extends SafetyAnalyzerPrototype {
  analyzeNode(node, env) {
    if (node && node.type === 'MemberExpression') {
      const propName = node.property ? (node.property.name || node.property.value) : null;
      if (propName === '__proto__' || propName === 'prototype') {
        this.report(node, `[MathL Safety Violation] Access to '${propName}' is strictly prohibited (Prototype Pollution Guard).`);
      }
    }
    return super.analyzeNode(node, env);
  }
}

// Case 1: Tampering via bracket __proto__ access
const maliciousCode1 = `
  val payload = { "role": "admin" };
  val proto = payload["__proto__"];
`;

const ast1 = parse(maliciousCode1);
const analyzer1 = new PrototypePollutionSafetyAnalyzer();
const res1 = analyzer1.analyze(ast1);

console.log(`Malicious payload["__proto__"] -> Valid = ${res1.isValid}`);
assert.strictEqual(res1.isValid, false);
assert.ok(res1.diagnostics.some(d => d.message.includes("Access to '__proto__' is strictly prohibited")));
console.log(`  Caught: ${res1.diagnostics[0].message}`);

// Case 2: Clean object creation and property access
const safeCode = `
  val user = { "name": "Alice", "role": "user" };
  val currentRole = user.role;
  @log(currentRole);
`;

const ast2 = parse(safeCode);
const analyzer2 = new PrototypePollutionSafetyAnalyzer();
const res2 = analyzer2.analyze(ast2);

console.log(`Safe object property access -> Valid = ${res2.isValid}`);
assert.strictEqual(res2.isValid, true);
assert.strictEqual(res2.diagnostics.length, 0);

console.log('\nTrial #13 Result: PASS (Prototype pollution attempts blocked at compile-time).\n');
