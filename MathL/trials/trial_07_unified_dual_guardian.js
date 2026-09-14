/**
 * Trial #07: Unified Dual-Language Guardian (J x O) Integration Test with Inheritance
 * Verifies that the Guardian checks both Oriented-Direct rules and JavaScript Web APIs simultaneously.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Running MathL Trial #07: Unified Dual-Language Guardian (J x O) ---');

const dictPath = path.resolve(process.cwd(), 'MathL/docs/unified_guardian_dictionary.json');
const guardianDict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));

console.log(`Loaded Unified Guardian with ${guardianDict.statistics.totalUnifiedSymbolsTracked} tracked symbols.`);

// Test Subsystem 1: Oriented-Direct Directive Contract
const findDirective = guardianDict.domains.orientedDirect.directives['@find'];
console.log(`OD Directive @find: nullability = ${findDirective.nullability}, returns = ${findDirective.returns}`);
assert.strictEqual(findDirective.nullability, 'Nullable');

// Test Subsystem 2: ECMAScript Standard Prototype Verification
const mathInterface = guardianDict.domains.ecmascript.interfaces['Math'];
assert.ok(mathInterface.methods['sqrt']);
console.log(`ECMAScript Global Math: Math.sqrt params = [${mathInterface.methods['sqrt'].params}]`);

// Recursive lookup helper with interface inheritance resolution
function lookupInterfaceMember(interfaceName, memberName, visited = new Set()) {
  if (visited.has(interfaceName)) return null;
  visited.add(interfaceName);

  const iface = guardianDict.domains.webApis.interfaces[interfaceName] || guardianDict.domains.ecmascript.interfaces[interfaceName];
  if (!iface) return null;

  if (iface.methods && iface.methods[memberName]) {
    return { kind: 'method', ...iface.methods[memberName], foundIn: interfaceName };
  }
  if (iface.properties && iface.properties[memberName]) {
    return { kind: 'property', ...iface.properties[memberName], foundIn: interfaceName };
  }

  if (iface.extends && Array.isArray(iface.extends)) {
    for (const parent of iface.extends) {
      const found = lookupInterfaceMember(parent, memberName, visited);
      if (found) return found;
    }
  }

  return null;
}

// Test Subsystem 3: Web API / DOM Interface Verification (Inherited through CanvasPath)
const arcMember = lookupInterfaceMember('CanvasRenderingContext2D', 'arc');
assert.ok(arcMember);
console.log(`Web API Canvas: CanvasRenderingContext2D.arc params = [${arcMember.params}], InheritedFrom = ${arcMember.foundIn}`);

// Test Subsystem 4: Dual Verification Function
function verifyDualExpression(domain, symbol, member = null) {
  if (domain === 'OD_DIRECTIVE') {
    const dir = guardianDict.domains.orientedDirect.directives[symbol];
    return dir ? { ok: true, contract: dir } : { ok: false, error: `Unknown OD directive ${symbol}` };
  }
  if (domain === 'JS_API') {
    const iface = guardianDict.domains.webApis.interfaces[symbol] || guardianDict.domains.ecmascript.interfaces[symbol];
    if (!iface) return { ok: false, error: `Unknown JS interface ${symbol}` };
    if (member) {
      const mem = lookupInterfaceMember(symbol, member);
      if (!mem) return { ok: false, error: `Unknown member '${member}' on interface '${symbol}' or its prototypes` };
      return { ok: true, member: mem };
    }
    return { ok: true, interface: iface };
  }
  return { ok: false, error: 'Unknown domain' };
}

// 1. Check valid OD directive
const checkOD = verifyDualExpression('OD_DIRECTIVE', '@find');
assert.strictEqual(checkOD.ok, true);

// 2. Check valid JS API with prototype inheritance
const checkJS = verifyDualExpression('JS_API', 'CanvasRenderingContext2D', 'arc');
assert.strictEqual(checkJS.ok, true);

// 3. Check invalid JS API call
const checkBadJS = verifyDualExpression('JS_API', 'CanvasRenderingContext2D', 'nonExistentCanvasMethod');
assert.strictEqual(checkBadJS.ok, false);
console.log(`Invalid JS method blocked: "${checkBadJS.error}"`);

console.log('\nTrial #07 Result: PASS (Dual-Language Guardian J x O mathematically unified).\n');
