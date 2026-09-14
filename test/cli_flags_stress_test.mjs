/**
 * Oriented-Direct CLI Flags Comprehensive Stress Test Suite
 * Tests every CLI flag, command, and safety bypass permutation in ospc.
 * Strictly zero emojis.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

console.log('=================================================================');
console.log('       ORIENTED-DIRECT CLI FLAGS COMPREHENSIVE STRESS TEST       ');
console.log('=================================================================\n');

const OSPC_BIN = path.resolve(process.cwd(), 'bin/ospc.js');
const TMP_DIR = path.resolve(process.cwd(), 'test/.tmp_cli_test');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function runOspc(args = [], options = {}) {
  const result = spawnSync(process.execPath, [OSPC_BIN, ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf-8',
    env: { ...process.env, ...options.env }
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
  }
}

try {
  // 1. Version Flags
  test('--version prints 2.0.0 and exits cleanly', () => {
    const res = runOspc(['--version']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('2.0.0'));
  });

  test('-v alias prints 2.0.0 and exits cleanly', () => {
    const res = runOspc(['-v']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('2.0.0'));
  });

  test('version command prints 2.0.0', () => {
    const res = runOspc(['version']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('2.0.0'));
  });

  // 2. Help Flags
  test('--help prints comprehensive CLI usage guide', () => {
    const res = runOspc(['--help']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('Oriented-Direct CLI Compiler & Bundler (ospc)'));
    assert.ok(res.stdout.includes('--no-safety'));
    assert.ok(res.stdout.includes('--strict-nulls'));
  });

  test('-h alias prints help', () => {
    const res = runOspc(['-h']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('USAGE:'));
  });

  // 3. Compile Command with Gated Safety (Default = Block Unsafe)
  const unsafeFile = path.join(TMP_DIR, 'unsafe_dom.osp');
  fs.writeFileSync(unsafeFile, 'val btn = @find("#btn");\nbtn.click();\n', 'utf-8');

  test('ospc compile rejects unguarded DOM access with exit code 1 and formatted carets', () => {
    const res = runOspc(['compile', unsafeFile]);
    assert.strictEqual(res.code, 1);
    const combined = res.stderr + res.stdout;
    assert.ok(combined.includes('Variable \'btn\' may be null/undefined at dereference'));
    assert.ok(combined.includes('Rule I'));
    assert.ok(combined.includes('^^^'));
  });

  // 4. Compile Command with --no-safety (Bypass Safety Gate)
  test('ospc compile --no-safety bypasses safety gate and generates JavaScript output', () => {
    const outFile = path.join(TMP_DIR, 'unsafe_out.js');
    const res = runOspc(['compile', unsafeFile, '--no-safety', '-o', outFile]);
    assert.strictEqual(res.code, 0, `stderr: ${res.stderr}`);
    assert.ok(fs.existsSync(outFile), 'Output file must exist');
    const js = fs.readFileSync(outFile, 'utf-8');
    assert.ok(js.includes('.click()'));
  });

  test('ospc compile --no-gated-safety alias bypasses safety gate', () => {
    const outFile = path.join(TMP_DIR, 'unsafe_out_gated.js');
    const res = runOspc(['compile', unsafeFile, '--no-gated-safety', '-o', outFile]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(outFile));
  });

  // 5. Compile Safe Code with Gated Safety Enabled
  const safeFile = path.join(TMP_DIR, 'safe_code.osp');
  fs.writeFileSync(safeFile, 'val x = 10;\nval y = 20;\nval sum = x + y;\n@log(sum);\n', 'utf-8');

  test('ospc compile passes safe code and produces output .js file', () => {
    const outFile = path.join(TMP_DIR, 'safe_out.js');
    const res = runOspc(['compile', safeFile, '-o', outFile]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(outFile));
    const js = fs.readFileSync(outFile, 'utf-8');
    assert.ok(js.includes('const sum = (x + y);') || js.includes('const sum ='));
  });

  // 6. Output to stdout (--stdout)
  test('ospc compile --stdout writes generated JavaScript directly to stdout stream', () => {
    const res = runOspc(['compile', safeFile, '--stdout']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('const sum = (x + y);') || res.stdout.includes('const sum ='));
    assert.ok(res.stdout.includes('console.log(sum);'));
  });

  // 7. Source Map Flags (-s inline, -s external)
  test('ospc compile -s inline appends base64 data URI comment', () => {
    const res = runOspc(['compile', safeFile, '-s', 'inline', '--stdout']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('//# sourceMappingURL=data:application/json;charset=utf-8;base64,'));
  });

  test('ospc compile -s external emits separate .js.map file', () => {
    const outFile = path.join(TMP_DIR, 'map_test.js');
    const res = runOspc(['compile', safeFile, '-s', 'external', '-o', outFile]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(outFile));
    assert.ok(fs.existsSync(`${outFile}.map`));
    const mapContent = fs.readFileSync(`${outFile}.map`, 'utf-8');
    const mapJson = JSON.parse(mapContent);
    assert.strictEqual(mapJson.version, 3);
  });

  // 8. Multi-Module Bundling (ospc build --bundle)
  const modA = path.join(TMP_DIR, 'modA.osp');
  const modB = path.join(TMP_DIR, 'modB.osp');
  fs.writeFileSync(modB, 'export fn multiply(a, b) {\n  return a * b;\n}\n', 'utf-8');
  fs.writeFileSync(modA, 'import { multiply } from "./modB.osp";\nval res = multiply(6, 7);\n@log(res);\n', 'utf-8');

  let unminifiedLen = 0;
  test('ospc build --bundle bundles imported modules into monolithic file', () => {
    const outBundle = path.join(TMP_DIR, 'bundle.js');
    const res = runOspc(['build', modA, '--bundle', '-o', outBundle]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(outBundle));
    const bundleJs = fs.readFileSync(outBundle, 'utf-8');
    unminifiedLen = bundleJs.length;
    assert.ok(bundleJs.includes('function multiply(a, b)'));
    assert.ok(bundleJs.includes('const res = multiply(6, 7);'));
  });

  test('ospc build --bundle --minify minifies output JavaScript', () => {
    const outMin = path.join(TMP_DIR, 'bundle.min.js');
    const res = runOspc(['build', modA, '--bundle', '--minify', '-o', outMin]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(outMin));
    const minJs = fs.readFileSync(outMin, 'utf-8');
    assert.ok(minJs.length < unminifiedLen, `Minified length (${minJs.length}) should be less than unminified (${unminifiedLen})`);
  });

  // 9. Public Distribution Directory (--public <dir>)
  test('ospc build --public generates assets and bundle in designated directory', () => {
    const pubDir = path.join(TMP_DIR, 'dist_output');
    const res = runOspc(['build', modA, '--public', pubDir]);
    assert.strictEqual(res.code, 0);
    assert.ok(fs.existsSync(pubDir));
    assert.ok(fs.existsSync(path.join(pubDir, 'app.js')));
  });

  // 10. Run Command (ospc run)
  const execFile = path.join(TMP_DIR, 'exec_test.osp');
  fs.writeFileSync(execFile, '@log("ORIENTED_DIRECT_SUCCESS_200");\n', 'utf-8');

  test('ospc run compiles and immediately executes code with Node.js', () => {
    const res = runOspc(['run', execFile]);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('ORIENTED_DIRECT_SUCCESS_200'));
  });

  test('ospc run on unsafe code triggers compile-time safety error before execution', () => {
    const res = runOspc(['run', unsafeFile]);
    assert.strictEqual(res.code, 1);
    const combined = res.stderr + res.stdout;
    assert.ok(combined.includes('Variable \'btn\' may be null/undefined at dereference'));
  });

  test('ospc run --no-safety bypasses safety check during execution', () => {
    const bypassExec = path.join(TMP_DIR, 'bypass_exec.osp');
    // Using val x = null; x?.prop allows execution without runtime error
    fs.writeFileSync(bypassExec, 'val x = null;\nval y = x?.prop;\n@log("BYPASSED_AND_RAN");\n', 'utf-8');
    const res = runOspc(['run', bypassExec, '--no-safety']);
    assert.strictEqual(res.code, 0);
    assert.ok(res.stdout.includes('BYPASSED_AND_RAN'));
  });

  // 11. Invalid Commands and Malformed Arguments
  test('Unknown command exits with code 1 and helpful error message', () => {
    const res = runOspc(['invalid_command_xyz']);
    assert.strictEqual(res.code, 1);
    assert.ok(res.stderr.includes('Unknown command'));
  });

  test('Missing entry file for build exits with error', () => {
    const emptyDir = path.join(TMP_DIR, 'empty_dir');
    if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir);
    const res = runOspc(['build', 'nonexistent_file.osp'], { cwd: emptyDir });
    assert.strictEqual(res.code, 1);
    assert.ok(res.stderr.includes('Entry file not found'));
  });

} finally {
  // Clean up temporary test files
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

console.log('\n=================================================================');
console.log(`  CLI FLAGS STRESS TEST SUMMARY: ${passed} / ${total} PASSED`);
if (passed === total) {
  console.log('  All CLI commands, flags, and safety overrides are 100% stable!');
} else {
  console.log(`  WARNING: ${total - passed} tests failed!`);
  process.exit(1);
}
console.log('=================================================================\n');
