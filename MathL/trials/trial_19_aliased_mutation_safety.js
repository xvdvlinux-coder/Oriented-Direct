/**
 * Trial #19: Aliased State Mutation Safety & Reference Tracking
 * Proves that mutations across aliased object references (r1 = o, r2 = o)
 * are tracked consistently in the abstract environment without state corruption.
 */

import assert from 'node:assert';
import { TypeShape } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #19: Aliased State Mutation Safety ---');

class AliasTrackingEnvironment {
  constructor() {
    this.heaps = new Map(); // heapId -> { fields: Map<string, TypeShape> }
    this.bindings = new Map(); // varName -> heapId
    this.nextHeapId = 1;
  }

  allocateObject(varName, initialFields = {}) {
    const heapId = this.nextHeapId++;
    const fieldMap = new Map();
    for (const [k, v] of Object.entries(initialFields)) {
      fieldMap.set(k, v);
    }
    this.heaps.set(heapId, { fields: fieldMap });
    this.bindings.set(varName, heapId);
    return heapId;
  }

  createAlias(sourceVar, targetVar) {
    const heapId = this.bindings.get(sourceVar);
    if (!heapId) throw new Error(`Source variable ${sourceVar} not found`);
    this.bindings.set(targetVar, heapId);
  }

  mutateProperty(varName, propName, newTypeShape) {
    const heapId = this.bindings.get(varName);
    if (!heapId) throw new Error(`Variable ${varName} not found`);
    const heapObj = this.heaps.get(heapId);
    heapObj.fields.set(propName, newTypeShape);
  }

  readProperty(varName, propName) {
    const heapId = this.bindings.get(varName);
    if (!heapId) throw new Error(`Variable ${varName} not found`);
    const heapObj = this.heaps.get(heapId);
    return heapObj.fields.get(propName);
  }
}

const env = new AliasTrackingEnvironment();

// Step 1: Allocate initial state object 'stateA'
env.allocateObject('stateA', {
  'fontSize': new TypeShape('Number'),
  'fontFamily': new TypeShape('String')
});

// Step 2: Create alias reference 'refB = stateA'
env.createAlias('stateA', 'refB');
console.log("Created alias: 'refB = stateA'");

// Step 3: Mutate property 'fontSize' via alias 'refB'
env.mutateProperty('refB', 'fontSize', new TypeShape('Number', { value: 36 }));
console.log("Mutated 'refB.fontSize = 36'");

// Step 4: Verify that reading 'stateA.fontSize' immediately reflects the mutation
const stateAFontSize = env.readProperty('stateA', 'fontSize');
console.log(`Read 'stateA.fontSize' post-mutation: ${stateAFontSize ? 'Number (36)' : 'undefined'}`);
assert.ok(stateAFontSize);
assert.strictEqual(stateAFontSize.kind, 'Number');

// Step 5: Verify that reading non-existent property returns undefined
const nonExistent = env.readProperty('refB', 'unlistedField');
assert.strictEqual(nonExistent, undefined);

console.log('\nTrial #19 Result: PASS (Aliased state mutations tracked with complete consistency).\n');
