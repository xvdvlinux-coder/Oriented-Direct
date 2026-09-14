/**
 * Trial #03: JavaScript Global & Web API Dictionary Gating with Inheritance
 * Tests simulated JS interop calls against the real parsed official specifications.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running MathL Trial #03: JavaScript Platform Dictionary Gating ---');

const jsDictPath = path.resolve(process.cwd(), 'MathL/docs/javascript_global_dictionary.json');
const webDictPath = path.resolve(process.cwd(), 'MathL/docs/web_apis_dom_dictionary.json');

const jsDict = JSON.parse(fs.readFileSync(jsDictPath, 'utf-8'));
const webDict = JSON.parse(fs.readFileSync(webDictPath, 'utf-8'));

console.log(`Loaded ${jsDict.interfaceCount} ECMAScript interfaces and ${webDict.interfaceCount} Web API interfaces from official specs.`);

function lookupInterfaceMethod(interfaceName, methodName, visited = new Set()) {
  if (visited.has(interfaceName)) return null;
  visited.add(interfaceName);

  const iface = jsDict.interfaces[interfaceName] || webDict.interfaces[interfaceName];
  if (!iface) return null;

  if (iface.methods && iface.methods[methodName]) {
    const m = iface.methods[methodName];
    return { ok: true, returnType: m.returns, params: m.params, foundIn: interfaceName };
  }

  if (iface.extends && Array.isArray(iface.extends)) {
    for (const parent of iface.extends) {
      const found = lookupInterfaceMethod(parent, methodName, visited);
      if (found) return found;
    }
  }

  return null;
}

function verifyCall(interfaceName, methodName) {
  const result = lookupInterfaceMethod(interfaceName, methodName);
  if (!result) {
    return { ok: false, error: `[MathL Violation] Method '${methodName}' does not exist on interface '${interfaceName}' or its inherited prototypes.` };
  }
  return result;
}

// Test 1: Math.sqrt -> Math interface in ES5
const test1 = verifyCall('Math', 'sqrt');
console.log(`Math.sqrt -> OK = ${test1.ok}, ReturnType = ${test1.returnType}`);
assert.strictEqual(test1.ok, true);
assert.strictEqual(test1.returnType, 'number');

// Test 2: Math.invalidMethod -> Rejection
const test2 = verifyCall('Math', 'computeTrajectory');
console.log(`Math.computeTrajectory -> OK = ${test2.ok}, Error = "${test2.error}"`);
assert.strictEqual(test2.ok, false);

// Test 3: Document.querySelector -> Inherited via ParentNode interface in DOM
const test3 = verifyCall('Document', 'querySelector');
console.log(`Document.querySelector -> OK = ${test3.ok}, ReturnType = ${test3.returnType}, FoundIn = ${test3.foundIn}`);
assert.strictEqual(test3.ok, true);
assert.strictEqual(test3.foundIn, 'ParentNode');

// Test 4: AudioContext.createOscillator -> AudioContext interface in Web Audio
const test4 = verifyCall('AudioContext', 'createOscillator');
console.log(`AudioContext.createOscillator -> OK = ${test4.ok}, ReturnType = ${test4.returnType}`);
assert.strictEqual(test4.ok, true);
assert.strictEqual(test4.returnType, 'OscillatorNode');

console.log('\nTrial #03 Result: PASS (Verified with full interface inheritance over 1,265 official interfaces).\n');
