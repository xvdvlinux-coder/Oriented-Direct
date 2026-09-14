/**
 * Trial #36: Dynamic Feature Detection & Fallback Gating for Experimental Web APIs (Rule XXIII)
 * Formalizes guarded feature detection lattice L_Feature, branch-sensitive refinement,
 * secure context invariants, and static fallback verification matching runtime error states:
 * - S_UnguardedExperimentalAPI (Invoking experimental Web API without presence check)
 * - S_UnavailableAPIAccess (Calling API inside branch proven unavailable)
 * - S_InsecureContextAccess (API requiring isSecureContext invoked in insecure origin)
 * - S_MissingCrossOriginIsolation (SharedArrayBuffer invoked without crossOriginIsolated)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #36: Dynamic Feature Detection & Fallback Gating ---');

export const FeatureState = {
  BOTTOM: 'BOTTOM',
  UNGUARDED: 'UNGUARDED',
  GUARDED_AVAILABLE: 'GUARDED_AVAILABLE',
  GUARDED_UNAVAILABLE: 'GUARDED_UNAVAILABLE',
  TOP: 'TOP'
};

export const ExperimentalAPICatalog = {
  'WebGPU': {
    id: 'WebGPU',
    accessor: 'navigator.gpu',
    methods: ['requestAdapter'],
    requiresSecureContext: true,
    requiresIsolation: false,
    guards: ["'gpu' in navigator", "navigator.gpu !== undefined", "typeof navigator.gpu !== 'undefined'"]
  },
  'WebAudio': {
    id: 'WebAudio',
    accessor: 'window.AudioContext',
    methods: ['createOscillator', 'createGain'],
    requiresSecureContext: false,
    requiresIsolation: false,
    guards: ["'AudioContext' in window", "typeof AudioContext !== 'undefined'", "'webkitAudioContext' in window"]
  },
  'CompressionStream': {
    id: 'CompressionStream',
    accessor: 'CompressionStream',
    methods: ['constructor'],
    requiresSecureContext: false,
    requiresIsolation: false,
    guards: ["typeof CompressionStream !== 'undefined'", "'CompressionStream' in globalThis"]
  },
  'SharedArrayBuffer': {
    id: 'SharedArrayBuffer',
    accessor: 'SharedArrayBuffer',
    methods: ['constructor'],
    requiresSecureContext: true,
    requiresIsolation: true,
    guards: ["typeof SharedArrayBuffer !== 'undefined'", "'SharedArrayBuffer' in globalThis"]
  },
  'FileSystemAccess': {
    id: 'FileSystemAccess',
    accessor: 'window.showOpenFilePicker',
    methods: ['call'],
    requiresSecureContext: true,
    requiresIsolation: false,
    guards: ["'showOpenFilePicker' in window", "typeof window.showOpenFilePicker === 'function'"]
  }
};

export class FeatureDetectionEnvironment {
  constructor(contextConfig = { isSecureContext: true, crossOriginIsolated: true }) {
    this.context = {
      isSecureContext: contextConfig.isSecureContext ?? true,
      crossOriginIsolated: contextConfig.crossOriginIsolated ?? true
    };
    this.featureMap = new Map();

    for (const key of Object.keys(ExperimentalAPICatalog)) {
      this.featureMap.set(key, FeatureState.UNGUARDED);
    }
  }

  clone() {
    const copy = new FeatureDetectionEnvironment(this.context);
    for (const [k, v] of this.featureMap.entries()) {
      copy.featureMap.set(k, v);
    }
    return copy;
  }

  getFeatureState(featureId) {
    return this.featureMap.get(featureId) || FeatureState.UNGUARDED;
  }

  setFeatureState(featureId, state) {
    this.featureMap.set(featureId, state);
  }
}

export class FeatureGuardAnalyzer {
  static refineBranch(env, conditionString, branchType = 'THEN') {
    const branchEnv = env.clone();

    for (const [featureId, apiSpec] of Object.entries(ExperimentalAPICatalog)) {
      const matchesGuard = apiSpec.guards.some(g => conditionString.includes(g) || g.includes(conditionString));
      if (matchesGuard) {
        if (branchType === 'THEN') {
          branchEnv.setFeatureState(featureId, FeatureState.GUARDED_AVAILABLE);
        } else {
          branchEnv.setFeatureState(featureId, FeatureState.GUARDED_UNAVAILABLE);
        }
      }
    }

    return branchEnv;
  }

  static verifyInvocation(env, featureId, methodName, isOptionalChained = false) {
    const spec = ExperimentalAPICatalog[featureId];
    if (!spec) {
      return { ok: false, error: `[MathL Violation: S_UnknownAPI] Unknown API '${featureId}'.` };
    }

    // Optional chaining automatically guards against undefined dereference at runtime
    if (isOptionalChained) {
      return {
        ok: true,
        guarded: true,
        optional: true,
        message: `Optional chained invocation '${spec.accessor}?.${methodName}' safely short-circuits.`
      };
    }

    // Context prerequisite checks
    if (spec.requiresSecureContext && !env.context.isSecureContext) {
      return {
        ok: false,
        error: `[MathL Violation: S_InsecureContextAccess] API '${featureId}' (${spec.accessor}) requires a Secure Context (HTTPS or localhost).`
      };
    }

    if (spec.requiresIsolation && !env.context.crossOriginIsolated) {
      return {
        ok: false,
        error: `[MathL Violation: S_MissingCrossOriginIsolation] API '${featureId}' (${spec.accessor}) requires 'crossOriginIsolated' headers (COOP/COEP).`
      };
    }

    const state = env.getFeatureState(featureId);

    if (state === FeatureState.UNGUARDED) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnguardedExperimentalAPI] Unchecked call to experimental API '${spec.accessor}.${methodName}()'. Guard check required (e.g. '${spec.guards[0]}').`
      };
    }

    if (state === FeatureState.GUARDED_UNAVAILABLE) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnavailableAPIAccess] Cannot call '${spec.accessor}.${methodName}()' in branch where feature was proven unavailable.`
      };
    }

    if (state === FeatureState.GUARDED_AVAILABLE) {
      return {
        ok: true,
        guarded: true,
        message: `Invocation '${spec.accessor}.${methodName}()' verified safe via active feature guard.`
      };
    }

    return { ok: false, error: `[MathL Violation: S_InvalidFeatureState] Unexpected feature state '${state}'.` };
  }

  static registerPolyfill(env, featureId) {
    if (!ExperimentalAPICatalog[featureId]) {
      return { ok: false, error: `Unknown API '${featureId}'` };
    }
    env.setFeatureState(featureId, FeatureState.GUARDED_AVAILABLE);
    return {
      ok: true,
      message: `Polyfill registered for '${featureId}'. Feature refined to GUARDED_AVAILABLE.`
    };
  }
}

// =========================================================================
// VERIFICATION SUITE
// =========================================================================

// 1. Unguarded Experimental API Access Rejection
console.log('1. Testing Unguarded API Invocation Rejection...');
const rootEnv = new FeatureDetectionEnvironment({ isSecureContext: true, crossOriginIsolated: true });

// Direct call to WebGPU without guard
const unguardedGpuRes = FeatureGuardAnalyzer.verifyInvocation(rootEnv, 'WebGPU', 'requestAdapter');
assert.strictEqual(unguardedGpuRes.ok, false);
assert.ok(unguardedGpuRes.error.includes('S_UnguardedExperimentalAPI'));
assert.ok(unguardedGpuRes.error.includes('navigator.gpu.requestAdapter'));

// Direct call to CompressionStream without guard
const unguardedCompressRes = FeatureGuardAnalyzer.verifyInvocation(rootEnv, 'CompressionStream', 'constructor');
assert.strictEqual(unguardedCompressRes.ok, false);
assert.ok(unguardedCompressRes.error.includes('S_UnguardedExperimentalAPI'));

// 2. Branch-Sensitive Guard Refinement (THEN branch)
console.log('2. Testing THEN Branch Guard Refinement...');
const thenEnvGpu = FeatureGuardAnalyzer.refineBranch(rootEnv, "'gpu' in navigator", 'THEN');
assert.strictEqual(thenEnvGpu.getFeatureState('WebGPU'), FeatureState.GUARDED_AVAILABLE);

const guardedGpuRes = FeatureGuardAnalyzer.verifyInvocation(thenEnvGpu, 'WebGPU', 'requestAdapter');
assert.strictEqual(guardedGpuRes.ok, true);
assert.strictEqual(guardedGpuRes.guarded, true);

// 3. Branch-Sensitive Guard Refinement (ELSE branch & Fallback Enforcement)
console.log('3. Testing ELSE Branch Unavailable Refinement...');
const elseEnvGpu = FeatureGuardAnalyzer.refineBranch(rootEnv, "'gpu' in navigator", 'ELSE');
assert.strictEqual(elseEnvGpu.getFeatureState('WebGPU'), FeatureState.GUARDED_UNAVAILABLE);

const invalidElseCall = FeatureGuardAnalyzer.verifyInvocation(elseEnvGpu, 'WebGPU', 'requestAdapter');
assert.strictEqual(invalidElseCall.ok, false);
assert.ok(invalidElseCall.error.includes('S_UnavailableAPIAccess'));

// 4. Secure Context Prerequisite Invariant
console.log('4. Testing Secure Context Prerequisite Enclosure...');
const insecureEnv = new FeatureDetectionEnvironment({ isSecureContext: false, crossOriginIsolated: true });
const insecureThenEnv = FeatureGuardAnalyzer.refineBranch(insecureEnv, "'showOpenFilePicker' in window", 'THEN');

const insecureAccessRes = FeatureGuardAnalyzer.verifyInvocation(insecureThenEnv, 'FileSystemAccess', 'call');
assert.strictEqual(insecureAccessRes.ok, false);
assert.ok(insecureAccessRes.error.includes('S_InsecureContextAccess'));

// Secure context allows access once guarded
const secureEnv = new FeatureDetectionEnvironment({ isSecureContext: true, crossOriginIsolated: true });
const secureThenEnv = FeatureGuardAnalyzer.refineBranch(secureEnv, "'showOpenFilePicker' in window", 'THEN');
const secureAccessRes = FeatureGuardAnalyzer.verifyInvocation(secureThenEnv, 'FileSystemAccess', 'call');
assert.strictEqual(secureAccessRes.ok, true);

// 5. Cross-Origin Isolation Prerequisite (SharedArrayBuffer)
console.log('5. Testing Cross-Origin Isolation Requirement...');
const nonIsolatedEnv = new FeatureDetectionEnvironment({ isSecureContext: true, crossOriginIsolated: false });
const nonIsolatedGuarded = FeatureGuardAnalyzer.refineBranch(nonIsolatedEnv, "typeof SharedArrayBuffer !== 'undefined'", 'THEN');

const badSABAccess = FeatureGuardAnalyzer.verifyInvocation(nonIsolatedGuarded, 'SharedArrayBuffer', 'constructor');
assert.strictEqual(badSABAccess.ok, false);
assert.ok(badSABAccess.error.includes('S_MissingCrossOriginIsolation'));

// Isolated context passes once guarded
const isolatedEnv = new FeatureDetectionEnvironment({ isSecureContext: true, crossOriginIsolated: true });
const isolatedGuarded = FeatureGuardAnalyzer.refineBranch(isolatedEnv, "typeof SharedArrayBuffer !== 'undefined'", 'THEN');
const safeSABAccess = FeatureGuardAnalyzer.verifyInvocation(isolatedGuarded, 'SharedArrayBuffer', 'constructor');
assert.strictEqual(safeSABAccess.ok, true);

// 6. Optional Chaining Gating Refinement
console.log('6. Testing Optional Chaining Gated Evaluation...');
// Even in root unguarded env, optional chaining is safe against crash
const optChainedRes = FeatureGuardAnalyzer.verifyInvocation(rootEnv, 'WebGPU', 'requestAdapter', true);
assert.strictEqual(optChainedRes.ok, true);
assert.strictEqual(optChainedRes.optional, true);

// 7. Polyfill Registration State Elevation
console.log('7. Testing Polyfill State Elevation...');
const polyfillEnv = rootEnv.clone();
assert.strictEqual(polyfillEnv.getFeatureState('WebAudio'), FeatureState.UNGUARDED);

FeatureGuardAnalyzer.registerPolyfill(polyfillEnv, 'WebAudio');
assert.strictEqual(polyfillEnv.getFeatureState('WebAudio'), FeatureState.GUARDED_AVAILABLE);

const polyfilledCall = FeatureGuardAnalyzer.verifyInvocation(polyfillEnv, 'WebAudio', 'createOscillator');
assert.strictEqual(polyfilledCall.ok, true);

console.log('Trial #36 Result: PASS (Guarded feature detection lattice, branch refinement, and context invariants verified).\n');
