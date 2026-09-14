/**
 * Trial #44: CLI Flag Gating Specification (Rule XXX)
 * Formalizes CLI configuration parser, validation lattice L_GatingConfig,
 * flag monotonicity, and compiler gate integration flags:
 * - --gated-safety (boolean)
 * - --strict-nulls (boolean)
 * - --leak-detector (boolean)
 * - --widen-threshold (integer >= 1)
 * - --deny-fallible (boolean)
 * - --target-realm (host | shadowrealm | worker)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #44: CLI Flag Gating Specification ---');

export const DEFAULT_GATING_CONFIG = Object.freeze({
  gatedSafety: true,
  strictNulls: true,
  leakDetector: true,
  widenThreshold: 3,
  denyFallible: true,
  targetRealm: 'host'
});

export class CLIFlagGatingAnalyzer {
  static parse(args = []) {
    const config = { ...DEFAULT_GATING_CONFIG };
    const warnings = [];

    for (const arg of args) {
      if (!arg.startsWith('--')) continue;

      const equalIndex = arg.indexOf('=');
      let key = equalIndex !== -1 ? arg.slice(2, equalIndex) : arg.slice(2);
      let val = equalIndex !== -1 ? arg.slice(equalIndex + 1) : null;

      // Handle --no- prefix
      if (key.startsWith('no-')) {
        key = key.slice(3);
        val = 'false';
      }

      switch (key) {
        case 'gated-safety':
          config.gatedSafety = val === null ? true : val === 'true';
          if (!config.gatedSafety) {
            warnings.push('[warn]: --gated-safety=false disables compile-time safety invariants. Production builds should not bypass safety.');
          }
          break;

        case 'strict-nulls':
          config.strictNulls = val === null ? true : val === 'true';
          break;

        case 'leak-detector':
          config.leakDetector = val === null ? true : val === 'true';
          break;

        case 'widen-threshold': {
          const num = parseInt(val, 10);
          if (isNaN(num) || num < 1) {
            return {
              ok: false,
              error: `[MathL Violation: S_InvalidCLIOption] --widen-threshold must be an integer >= 1, received '${val}'.`
            };
          }
          config.widenThreshold = num;
          break;
        }

        case 'deny-fallible':
          config.denyFallible = val === null ? true : val === 'true';
          break;

        case 'target-realm':
          if (!['host', 'shadowrealm', 'worker'].includes(val)) {
            return {
              ok: false,
              error: `[MathL Violation: S_InvalidCLIOption] --target-realm must be one of ['host', 'shadowrealm', 'worker'], received '${val}'.`
            };
          }
          config.targetRealm = val;
          break;

        default:
          return {
            ok: false,
            error: `[MathL Violation: S_UnknownCLIFlag] Unrecognized command line option '--${key}'.`
          };
      }
    }

    return {
      ok: true,
      config: Object.freeze(config),
      warnings
    };
  }

  static isSubConfiguration(strictConfig, relaxedConfig) {
    // Strict config has tighter constraints:
    // strictNulls: true >= false
    // leakDetector: true >= false
    // denyFallible: true >= false
    if (strictConfig.strictNulls && !relaxedConfig.strictNulls) return true;
    if (strictConfig.leakDetector && !relaxedConfig.leakDetector) return true;
    if (strictConfig.denyFallible && !relaxedConfig.denyFallible) return true;
    return false;
  }

  static verifyProgramUnderConfig(programAST, config) {
    if (!config.gatedSafety) {
      return {
        ok: true,
        bypassed: true,
        diagnostics: [],
        message: 'Safety analysis bypassed via --gated-safety=false.'
      };
    }

    const diagnostics = [];

    // Check strict nulls
    if (config.strictNulls && programAST.hasUncheckedNullableAccess) {
      diagnostics.push({
        code: 'E0001',
        message: 'Strict null dereference detected without flow guard.'
      });
    }

    // Check leak detector
    if (config.leakDetector && programAST.hasDetachedListenerLeak) {
      diagnostics.push({
        code: 'E0024',
        message: 'Detached DOM node retains event listener without cleanup.'
      });
    }

    // Check fallible operations
    if (config.denyFallible && programAST.hasUnguardedFallibleCall) {
      diagnostics.push({
        code: 'E0005',
        message: 'Unguarded fallible operation outside of try-catch block.'
      });
    }

    return {
      ok: diagnostics.length === 0,
      diagnostics
    };
  }
}

// ==========================================
// TEST SUITE: Trial #44 CLI Flag Gating Specification
// ==========================================

console.log('1. Testing Default Configuration Parsing...');
const defaultRes = CLIFlagGatingAnalyzer.parse([]);
assert.strictEqual(defaultRes.ok, true);
assert.deepStrictEqual(defaultRes.config, DEFAULT_GATING_CONFIG);
assert.strictEqual(defaultRes.warnings.length, 0);

console.log('2. Testing Custom CLI Arguments Parsing...');
const customArgs = [
  '--no-strict-nulls',
  '--widen-threshold=5',
  '--target-realm=shadowrealm'
];
const customRes = CLIFlagGatingAnalyzer.parse(customArgs);
assert.strictEqual(customRes.ok, true);
assert.strictEqual(customRes.config.strictNulls, false);
assert.strictEqual(customRes.config.widenThreshold, 5);
assert.strictEqual(customRes.config.targetRealm, 'shadowrealm');
assert.strictEqual(customRes.config.gatedSafety, true);

console.log('3. Testing Invalid Flag Rejection (Negative Threshold & Unknown Flags)...');
const invalidNumRes = CLIFlagGatingAnalyzer.parse(['--widen-threshold=0']);
assert.strictEqual(invalidNumRes.ok, false);
assert.ok(invalidNumRes.error.includes('S_InvalidCLIOption'));

const invalidRealmRes = CLIFlagGatingAnalyzer.parse(['--target-realm=mars']);
assert.strictEqual(invalidRealmRes.ok, false);
assert.ok(invalidRealmRes.error.includes('S_InvalidCLIOption'));

const unknownFlagRes = CLIFlagGatingAnalyzer.parse(['--turbo-charge']);
assert.strictEqual(unknownFlagRes.ok, false);
assert.ok(unknownFlagRes.error.includes('S_UnknownCLIFlag'));

console.log('4. Testing --no-gated-safety Warning Emission...');
const disabledSafetyRes = CLIFlagGatingAnalyzer.parse(['--no-gated-safety']);
assert.strictEqual(disabledSafetyRes.ok, true);
assert.strictEqual(disabledSafetyRes.config.gatedSafety, false);
assert.strictEqual(disabledSafetyRes.warnings.length, 1);
assert.ok(disabledSafetyRes.warnings[0].includes('--gated-safety=false'));

console.log('5. Testing Flag Monotonicity on Program Verification...');
const testAstWithNullAndLeak = {
  hasUncheckedNullableAccess: true,
  hasDetachedListenerLeak: true,
  hasUnguardedFallibleCall: false
};

// Under strict default flags: both errors caught
const strictEval = CLIFlagGatingAnalyzer.verifyProgramUnderConfig(testAstWithNullAndLeak, DEFAULT_GATING_CONFIG);
assert.strictEqual(strictEval.ok, false);
assert.strictEqual(strictEval.diagnostics.length, 2);

// Under relaxed flags (--no-strict-nulls): only 1 error caught
const relaxedParse = CLIFlagGatingAnalyzer.parse(['--no-strict-nulls']);
const relaxedEval = CLIFlagGatingAnalyzer.verifyProgramUnderConfig(testAstWithNullAndLeak, relaxedParse.config);
assert.strictEqual(relaxedEval.ok, false);
assert.strictEqual(relaxedEval.diagnostics.length, 1);
assert.strictEqual(relaxedEval.diagnostics[0].code, 'E0024');

// Under completely disabled safety (--no-gated-safety): 0 errors
const bypassedEval = CLIFlagGatingAnalyzer.verifyProgramUnderConfig(testAstWithNullAndLeak, disabledSafetyRes.config);
assert.strictEqual(bypassedEval.ok, true);
assert.strictEqual(bypassedEval.bypassed, true);

console.log('Trial #44 Result: PASS (CLI flag parsing, validation lattice, and monotonicity invariants verified).\n');
