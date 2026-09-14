/**
 * Trial #42: Error Subtyping Hierarchy & Cause Chaining Invariance (Rule XXIX)
 * Formalizes exception typing lattice L_Exception, cause chain acyclicity,
 * AggregateError recursive unrolling, and stack trace capture safety.
 * Matches Google V8 templates:
 * - kAggregateError ("AggregateError: %")
 * - kCircularStructure ("Converting circular structure to JSON" / recursive cause loop)
 * - kInvalidErrorLHS ("Target object in Error.captureStackTrace must be an object")
 * - S_CircularErrorCauseChain (Cycle in exception cause chain)
 * - S_UnhandledErrorSubtype (AggregateError leaves uncovered error subtype)
 * - S_InvalidStackTraceTarget (Non-object passed to Error.captureStackTrace)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #42: Error Subtyping Hierarchy & Cause Chaining Invariance ---');

export const ErrorType = {
  ERROR: 'Error',
  TYPE_ERROR: 'TypeError',
  RANGE_ERROR: 'RangeError',
  REFERENCE_ERROR: 'ReferenceError',
  SYNTAX_ERROR: 'SyntaxError',
  URI_ERROR: 'URIError',
  EVAL_ERROR: 'EvalError',
  AGGREGATE_ERROR: 'AggregateError',
  SUPPRESSED_ERROR: 'SuppressedError',
  CUSTOM_DOMAIN_ERROR: 'CustomDomainError'
};

export class ExceptionHierarchyAnalyzer {
  static isSubtypeOf(sub, base) {
    if (sub === base) return true;
    if (base === ErrorType.ERROR) return true; // All error types inherit from Error
    return false;
  }

  static verifyCauseChainAcyclicity(rootError) {
    const visited = new Set();
    let current = rootError;
    const path = [];

    while (current && typeof current === 'object') {
      if (visited.has(current)) {
        return {
          ok: false,
          error: `[MathL Violation: S_CircularErrorCauseChain] Circular reference detected in error cause chain involving '${current.name || 'Error'}' (matches V8 kCircularStructure).`
        };
      }
      visited.add(current);
      path.push(current.name || 'Error');
      current = current.cause;
    }

    return {
      ok: true,
      depth: path.length,
      chain: path
    };
  }

  static unrollAggregateErrors(err) {
    const leaves = [];
    const visited = new Set();

    function recurse(e) {
      if (!e || typeof e !== 'object') return;
      if (visited.has(e)) return;
      visited.add(e);

      if (e.name === ErrorType.AGGREGATE_ERROR && Array.isArray(e.errors)) {
        for (const subErr of e.errors) {
          recurse(subErr);
        }
      } else {
        leaves.push(e);
      }
    }

    recurse(err);
    return leaves;
  }

  static verifyExceptionCoverage(thrownError, handledTypes = []) {
    const leafErrors = this.unrollAggregateErrors(thrownError);
    const uncovered = [];

    for (const leaf of leafErrors) {
      const leafTypeName = leaf.name || ErrorType.ERROR;
      const isHandled = handledTypes.some(ht => ExceptionHierarchyAnalyzer.isSubtypeOf(leafTypeName, ht));
      if (!isHandled) {
        uncovered.push(leafTypeName);
      }
    }

    if (uncovered.length > 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnhandledErrorSubtype] Unhandled exception subtype(s) in catch/match block: [${uncovered.join(', ')}] (matches V8 kAggregateError unrolling).`,
        uncovered
      };
    }

    return {
      ok: true,
      leafCount: leafErrors.length,
      handled: true
    };
  }

  static verifyStackTraceCapture(targetObj, constructorOpt) {
    if (!targetObj || (typeof targetObj !== 'object' && typeof targetObj !== 'function')) {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidStackTraceTarget] First argument to Error.captureStackTrace must be an object, received '${typeof targetObj}' (matches V8 kInvalidErrorLHS).`
      };
    }

    if (constructorOpt !== undefined && typeof constructorOpt !== 'function') {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidStackTraceTarget] Optional constructorOpt parameter to Error.captureStackTrace must be a function or undefined.`
      };
    }

    return {
      ok: true,
      message: 'Valid arguments for Error.captureStackTrace.'
    };
  }
}

// ==========================================
// TEST SUITE: Trial #42 Error Hierarchy & Cause Chaining
// ==========================================

console.log('1. Testing Subtype Relationships...');
assert.strictEqual(ExceptionHierarchyAnalyzer.isSubtypeOf(ErrorType.TYPE_ERROR, ErrorType.ERROR), true);
assert.strictEqual(ExceptionHierarchyAnalyzer.isSubtypeOf(ErrorType.RANGE_ERROR, ErrorType.ERROR), true);
assert.strictEqual(ExceptionHierarchyAnalyzer.isSubtypeOf(ErrorType.AGGREGATE_ERROR, ErrorType.ERROR), true);
assert.strictEqual(ExceptionHierarchyAnalyzer.isSubtypeOf(ErrorType.TYPE_ERROR, ErrorType.RANGE_ERROR), false);

console.log('2. Testing Acyclic Cause Chains...');
const err1 = new Error('Database connection failed');
const err2 = new Error('User authentication query failed', { cause: err1 });
const err3 = new Error('HTTP 500 Internal Server Error', { cause: err2 });

const acyclicRes = ExceptionHierarchyAnalyzer.verifyCauseChainAcyclicity(err3);
assert.strictEqual(acyclicRes.ok, true);
assert.strictEqual(acyclicRes.depth, 3);

console.log('3. Testing Circular Cause Chain Detection (V8 kCircularStructure)...');
const cyclicA = new Error('Service A error');
const cyclicB = new Error('Service B error');
cyclicA.cause = cyclicB;
cyclicB.cause = cyclicA; // Infinite circular cause chain!

const cycleRes = ExceptionHierarchyAnalyzer.verifyCauseChainAcyclicity(cyclicA);
assert.strictEqual(cycleRes.ok, false);
assert.ok(cycleRes.error.includes('S_CircularErrorCauseChain'));
assert.ok(cycleRes.error.includes('kCircularStructure'));

console.log('4. Testing AggregateError Recursive Unrolling...');
const typeErr = new TypeError('Invalid property type');
const rangeErr = new RangeError('Buffer index out of bounds');
const refErr = new ReferenceError('Variable not found');

const innerAgg = new AggregateError([rangeErr, refErr], 'Inner batch failure');
const topAgg = new AggregateError([typeErr, innerAgg], 'Top level batch failure');

const unrolled = ExceptionHierarchyAnalyzer.unrollAggregateErrors(topAgg);
assert.strictEqual(unrolled.length, 3);
assert.strictEqual(unrolled[0].name, ErrorType.TYPE_ERROR);
assert.strictEqual(unrolled[1].name, ErrorType.RANGE_ERROR);
assert.strictEqual(unrolled[2].name, ErrorType.REFERENCE_ERROR);

console.log('5. Testing Exception Coverage Verification (Catch / Match Completeness)...');
// Catch block handling both TypeError and RangeError, but missing ReferenceError
const coverageCheck1 = ExceptionHierarchyAnalyzer.verifyExceptionCoverage(topAgg, [ErrorType.TYPE_ERROR, ErrorType.RANGE_ERROR]);
assert.strictEqual(coverageCheck1.ok, false);
assert.ok(coverageCheck1.error.includes('S_UnhandledErrorSubtype'));
assert.deepStrictEqual(coverageCheck1.uncovered, [ErrorType.REFERENCE_ERROR]);

// Catch block handling Error (base type covers everything)
const coverageCheck2 = ExceptionHierarchyAnalyzer.verifyExceptionCoverage(topAgg, [ErrorType.ERROR]);
assert.strictEqual(coverageCheck2.ok, true);
assert.strictEqual(coverageCheck2.leafCount, 3);

console.log('6. Testing Error.captureStackTrace Target Validation (V8 kInvalidErrorLHS)...');
const dummyErr = { name: 'MyCustomError', message: 'Test error' };
const validCapCheck = ExceptionHierarchyAnalyzer.verifyStackTraceCapture(dummyErr, function MyCustomError() {});
assert.strictEqual(validCapCheck.ok, true);

// Invalid primitive target
const invalidCapCheck1 = ExceptionHierarchyAnalyzer.verifyStackTraceCapture(null);
assert.strictEqual(invalidCapCheck1.ok, false);
assert.ok(invalidCapCheck1.error.includes('S_InvalidStackTraceTarget'));
assert.ok(invalidCapCheck1.error.includes('kInvalidErrorLHS'));

const invalidCapCheck2 = ExceptionHierarchyAnalyzer.verifyStackTraceCapture('stringTarget');
assert.strictEqual(invalidCapCheck2.ok, false);
assert.ok(invalidCapCheck2.error.includes('S_InvalidStackTraceTarget'));

console.log('Trial #42 Result: PASS (Exception subtyping hierarchy, cause chain acyclicity, and aggregate error unrolling verified).\n');
