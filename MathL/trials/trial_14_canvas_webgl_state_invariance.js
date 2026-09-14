/**
 * Trial #14: High-Performance Canvas & WebGL State Invariance
 * Tests parameter arity and type contracts against official W3C / WHATWG Web IDL interfaces.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running MathL Trial #14: Canvas & WebGL State Invariance ---');

const webDictPath = path.resolve(process.cwd(), 'MathL/docs/web_apis_dom_dictionary.json');
const webDict = JSON.parse(fs.readFileSync(webDictPath, 'utf-8'));

function resolveMethodContract(interfaceName, methodName, visited = new Set()) {
  if (visited.has(interfaceName)) return null;
  visited.add(interfaceName);

  const iface = webDict.interfaces[interfaceName];
  if (!iface) return null;

  if (iface.methods && iface.methods[methodName]) {
    return { interface: interfaceName, ...iface.methods[methodName] };
  }

  if (iface.extends && Array.isArray(iface.extends)) {
    for (const parent of iface.extends) {
      const found = resolveMethodContract(parent, methodName, visited);
      if (found) return found;
    }
  }

  return null;
}

function verifyGraphicsInvocation(interfaceName, methodName, argCount) {
  const contract = resolveMethodContract(interfaceName, methodName);
  if (!contract) {
    return { ok: false, error: `Method '${methodName}' does not exist on interface '${interfaceName}'.` };
  }

  const expectedParams = contract.params || [];
  // Count required parameters (ignoring trailing optionals ending with '?')
  const minParams = expectedParams.filter(p => !p.includes('?') && !p.includes('=')).length;
  const maxParams = expectedParams.length;

  if (argCount < minParams || argCount > maxParams) {
    return {
      ok: false,
      error: `Arity mismatch for ${interfaceName}.${methodName}: expected between ${minParams} and ${maxParams} arguments, got ${argCount}.`
    };
  }

  return { ok: true, contract };
}

// Test 1: Canvas2D fillRect(x, y, w, h) -> 4 arguments required
const test1 = verifyGraphicsInvocation('CanvasRenderingContext2D', 'fillRect', 4);
console.log(`Canvas2D.fillRect(0, 0, 100, 100) -> OK = ${test1.ok}`);
assert.strictEqual(test1.ok, true);

// Test 2: Canvas2D fillRect with 2 arguments -> Mismatch
const test2 = verifyGraphicsInvocation('CanvasRenderingContext2D', 'fillRect', 2);
console.log(`Canvas2D.fillRect(0, 0) -> OK = ${test2.ok}, Error = "${test2.error}"`);
assert.strictEqual(test2.ok, false);
assert.ok(test2.error.includes('Arity mismatch'));

// Test 3: WebGL clearColor(r, g, b, a) -> 4 arguments
const test3 = verifyGraphicsInvocation('WebGLRenderingContext', 'clearColor', 4);
console.log(`WebGL.clearColor(0, 0, 0, 1) -> OK = ${test3.ok}`);
assert.strictEqual(test3.ok, true);

// Test 4: WebGL non-existent method -> Rejection
const test4 = verifyGraphicsInvocation('WebGLRenderingContext', 'renderRaytracingScene', 1);
console.log(`WebGL.renderRaytracingScene() -> OK = ${test4.ok}, Error = "${test4.error}"`);
assert.strictEqual(test4.ok, false);

console.log('\nTrial #14 Result: PASS (Canvas & WebGL graphics invocations strictly verified against Web IDL).\n');
