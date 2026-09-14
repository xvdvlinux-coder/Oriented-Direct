/**
 * Trial #25: Structural Subtyping & Sealed Struct Polymorphism (Rule XIII)
 * Proves compile-time verification of width and depth subtyping on sealed structs.
 */

import assert from 'node:assert';
import { TypeShape } from '../src/abstract_domain.js';

console.log('--- Running MathL Trial #25: Structural Subtyping & Sealed Struct Polymorphism ---');

export class StructuralSubtypeChecker {
  static isSubtype(actual, expected) {
    if (expected.kind === 'Any') return { ok: true };
    if (actual.kind === 'Bottom') return { ok: true };

    // Primitive type check
    if (actual.kind !== expected.kind) {
      // Struct can satisfy Object structural contract
      if (!(actual.kind === 'Struct' && expected.kind === 'Object')) {
        return {
          ok: false,
          error: `Type mismatch: Expected ${expected.kind}, got ${actual.kind}.`
        };
      }
    }

    // Structural width and depth subtyping for Struct/Object
    if (expected.fields && expected.fields.size > 0) {
      for (const [key, expectedFieldType] of expected.fields.entries()) {
        if (!actual.hasField(key)) {
          return {
            ok: false,
            error: `Missing required field '${key}' in structural subtyping.`
          };
        }
        const actualFieldType = actual.getField(key);
        const fieldCheck = this.isSubtype(actualFieldType, expectedFieldType);
        if (!fieldCheck.ok) {
          return {
            ok: false,
            error: `Field '${key}' incompatible: ${fieldCheck.error}`
          };
        }
      }
    }

    return { ok: true };
  }

  static verifyMutation(structType, propName) {
    if (structType.isSealed && !structType.hasField(propName)) {
      return {
        ok: false,
        error: `[MathL Violation] Cannot assign unlisted property '${propName}' to sealed struct '${structType.kind}'.`
      };
    }
    return { ok: true };
  }
}

// 1. Define Struct Point3D { x: Number, y: Number, z: Number } (Sealed)
const point3D = new TypeShape('Struct', {
  isSealed: true,
  fields: {
    'x': new TypeShape('Number'),
    'y': new TypeShape('Number'),
    'z': new TypeShape('Number')
  }
});

// 2. Define Expected Shape Point2D { x: Number, y: Number }
const point2D = new TypeShape('Object', {
  fields: {
    'x': new TypeShape('Number'),
    'y': new TypeShape('Number')
  }
});

// Test 1: Width subtyping Point3D <: Point2D
const check1 = StructuralSubtypeChecker.isSubtype(point3D, point2D);
console.log(`1. Width subtyping (Point3D <: Point2D): OK = ${check1.ok}`);
assert.strictEqual(check1.ok, true);

// 3. Define Point1D { x: Number }
const point1D = new TypeShape('Struct', {
  isSealed: true,
  fields: {
    'x': new TypeShape('Number')
  }
});

// Test 2: Point1D passed to Point2D -> Must FAIL due to missing 'y'
const check2 = StructuralSubtypeChecker.isSubtype(point1D, point2D);
console.log(`2. Missing required field (Point1D <: Point2D): OK = ${check2.ok}, Error = "${check2.error}"`);
assert.strictEqual(check2.ok, false);
assert.ok(check2.error.includes("Missing required field 'y'"));

// 4. Define Incompatible Field Type PointBad { x: String, y: Number }
const pointBad = new TypeShape('Struct', {
  isSealed: true,
  fields: {
    'x': new TypeShape('String'),
    'y': new TypeShape('Number')
  }
});

// Test 3: Depth subtyping type mismatch
const check3 = StructuralSubtypeChecker.isSubtype(pointBad, point2D);
console.log(`3. Incompatible field type: OK = ${check3.ok}, Error = "${check3.error}"`);
assert.strictEqual(check3.ok, false);
assert.ok(check3.error.includes("Field 'x' incompatible"));

// 5. Test Depth Subtyping with Nested Records
const nestedActual = new TypeShape('Struct', {
  isSealed: true,
  fields: {
    'id': new TypeShape('Number'),
    'profile': new TypeShape('Object', {
      fields: {
        'name': new TypeShape('String'),
        'role': new TypeShape('String'),
        'age': new TypeShape('Number')
      }
    })
  }
});

const nestedExpected = new TypeShape('Object', {
  fields: {
    'id': new TypeShape('Number'),
    'profile': new TypeShape('Object', {
      fields: {
        'name': new TypeShape('String')
      }
    })
  }
});

const check4 = StructuralSubtypeChecker.isSubtype(nestedActual, nestedExpected);
console.log(`4. Nested depth subtyping: OK = ${check4.ok}`);
assert.strictEqual(check4.ok, true);

// 6. Sealed Struct Mutation Safety
const mutSafe = StructuralSubtypeChecker.verifyMutation(point3D, 'x');
console.log(`5. Mutating existing field 'x' on Point3D: OK = ${mutSafe.ok}`);
assert.strictEqual(mutSafe.ok, true);

const mutUnsafe = StructuralSubtypeChecker.verifyMutation(point3D, 'w');
console.log(`6. Mutating unlisted field 'w' on sealed Point3D: OK = ${mutUnsafe.ok}, Error = "${mutUnsafe.error}"`);
assert.strictEqual(mutUnsafe.ok, false);
assert.ok(mutUnsafe.error.includes("Cannot assign unlisted property 'w' to sealed struct"));

console.log('\nTrial #25 Result: PASS (Structural subtyping & sealed struct polymorphism verified).\n');
