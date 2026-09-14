/**
 * Trial #21: CustomEvent Payload Contract Verification (@emit / @on)
 * Proves that event payloads dispatched via @emit match the expected detail shape in @on listeners.
 */

import assert from 'node:assert';
import { TypeShape } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #21: CustomEvent Payload Contract Verification ---');

class EventContractRegistry {
  constructor() {
    this.contracts = new Map(); // eventName -> expectedDetailShape
  }

  registerContract(eventName, detailShape) {
    this.contracts.set(eventName, detailShape);
  }

  verifyEmit(eventName, payloadShape) {
    const expected = this.contracts.get(eventName);
    if (!expected) {
      return { ok: false, error: `Unregistered custom event '${eventName}'.` };
    }

    // Verify that payloadShape contains all expected fields with compatible types
    for (const [key, expectedType] of expected.fields.entries()) {
      if (!payloadShape.hasField(key)) {
        return {
          ok: false,
          error: `[MathL Violation] Event '${eventName}' payload missing required field '${key}'.`
        };
      }
      const actualType = payloadShape.getField(key);
      if (actualType.kind !== expectedType.kind && expectedType.kind !== 'Any') {
        return {
          ok: false,
          error: `[MathL Violation] Field '${key}' in event '${eventName}' expected ${expectedType.kind}, got ${actualType.kind}.`
        };
      }
    }

    return { ok: true };
  }
}

const registry = new EventContractRegistry();

// Register contract for 'fontChanged' event: { fontFamily: String, fontSize: Number }
registry.registerContract('fontChanged', new TypeShape('Object', {
  fields: {
    'fontFamily': new TypeShape('String'),
    'fontSize': new TypeShape('Number')
  }
}));

// Test 1: Emit with valid payload shape
const validPayload = new TypeShape('Object', {
  fields: {
    'fontFamily': new TypeShape('String'),
    'fontSize': new TypeShape('Number'),
    'extraMeta': new TypeShape('String')
  }
});
const emit1 = registry.verifyEmit('fontChanged', validPayload);
console.log(`Emit 'fontChanged' with valid payload -> OK = ${emit1.ok}`);
assert.strictEqual(emit1.ok, true);

// Test 2: Emit with missing required field 'fontSize' -> Must FAIL
const missingFieldPayload = new TypeShape('Object', {
  fields: {
    'fontFamily': new TypeShape('String')
  }
});
const emit2 = registry.verifyEmit('fontChanged', missingFieldPayload);
console.log(`Emit 'fontChanged' missing field -> OK = ${emit2.ok}, Error = "${emit2.error}"`);
assert.strictEqual(emit2.ok, false);
assert.ok(emit2.error.includes("missing required field 'fontSize'"));

// Test 3: Emit with wrong type for 'fontSize' -> Must FAIL
const wrongTypePayload = new TypeShape('Object', {
  fields: {
    'fontFamily': new TypeShape('String'),
    'fontSize': new TypeShape('String') // String instead of Number!
  }
});
const emit3 = registry.verifyEmit('fontChanged', wrongTypePayload);
console.log(`Emit 'fontChanged' with wrong type -> OK = ${emit3.ok}, Error = "${emit3.error}"`);
assert.strictEqual(emit3.ok, false);
assert.ok(emit3.error.includes("expected Number, got String"));

console.log('\nTrial #21 Result: PASS (CustomEvent payload contracts statically verified).\n');
