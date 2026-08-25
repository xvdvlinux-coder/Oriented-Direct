/**
 * Oriented-Direct Compiler, Bundler & DevServer Unit Tests
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {
  transpile,
  bundle,
  parse,
  tokenize,
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  DevServer,
  getLocalNetworkIp
} from '../src/index.js';

console.log('--- Running Oriented-Direct (.osp) Tests ---\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Variables & Mutability
await test('Transpiles val and mut to const and let', () => {
  const code = `
    val maxCount = 100;
    mut counter = 0;
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('const maxCount = 100;'));
  assert.ok(js.includes('let counter = 0;'));
});

// 2. Strict Equality & Logical operators
await test('Transpiles ==, !=, is, is not, and, or, not', () => {
  const code = `
    val a = 5 == 5;
    val b = 5 != 3;
    val c = 10 is 10;
    val d = 10 is not 20;
    val e = true and false;
    val f = true or false;
    val g = not false;
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('(5 === 5)'), 'Should turn == to ===');
  assert.ok(js.includes('(5 !== 3)'), 'Should turn != to !==');
  assert.ok(js.includes('(10 === 10)'), 'Should turn is to ===');
  assert.ok(js.includes('(10 !== 20)'), 'Should turn is not to !==');
  assert.ok(js.includes('(true && false)'), 'Should turn and to &&');
  assert.ok(js.includes('(true || false)'), 'Should turn or to ||');
  assert.ok(js.includes('!(false)'), 'Should turn not to !');
});

// 3. Functions & Lambdas
await test('Transpiles functions, arrow syntax and async/await', () => {
  const code = `
    fn add(a, b) {
      return a + b;
    }

    val multiply = (x, y) => x * y;

    async fn fetchUser(id) {
      val res = await apiCall(id);
      return res;
    }
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('function add(a, b)'));
  assert.ok(js.includes('const multiply = (x, y) => (x * y);') || js.includes('(x, y) => (x * y)'));
  assert.ok(js.includes('async function fetchUser(id)'));
  assert.ok(js.includes('const res = (await apiCall(id));'));
});

// 4. Direct DOM & Console Directives
await test('Transpiles @find, @on, @css, @html and @log() / @info()', () => {
  const code = `
    val btn = @find("#submit-btn");
    @on(btn, "click", (e) => {
      @log("Button clicked!");
      @info("Status ok");
      @css(btn, { color: "red" });
      @html(btn, "<span>Loading...</span>");
    });
  `;
  const js = transpile(code, { includeRuntime: true });
  assert.ok(js.includes('$find("#submit-btn")'));
  assert.ok(js.includes('$on(btn, "click"'));
  assert.ok(js.includes('console.log("Button clicked!")'));
  assert.ok(js.includes('console.info("Status ok")'));
  assert.ok(js.includes('$css(btn, { color: "red" })'));
  assert.ok(js.includes('$html(btn, "<span>Loading...</span>")'));
  assert.ok(js.includes('function $find('), 'Should include runtime helpers');
});

// 5. Freedom of Common Identifiers (info, log, warn, error)
await test('Allows declaring variables named info, log, warn, error without collision', () => {
  const code = `
    val info = @attr(item, "data-info");
    mut log = "system event";
    val warn = false;
    val error = null;
    @log(info, log);
  `;
  const js = transpile(code, { includeRuntime: true });
  assert.ok(js.includes('const info = $attr(item, "data-info");'));
  assert.ok(js.includes('let log = "system event";'));
  assert.ok(js.includes('const warn = false;'));
  assert.ok(js.includes('const error = null;'));
  assert.ok(js.includes('console.log(info, log);'));
});

// 6. C-Style For Loops and Range For Loops
await test('Transpiles C-style 3-part for loops and range loops', () => {
  const code = `
    for (mut x = 0; x < width; x += 40) {
      drawGrid(x);
    }

    for (val i in 0..100 step 10) {
      processStep(i);
    }
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('for (let x = 0; (x < width); x += 40) {'));
  assert.ok(js.includes('drawGrid(x);'));
  assert.ok(js.includes('for (let i = 0; i < 100; i += 10) {'));
  assert.ok(js.includes('processStep(i);'));
});

// 7. Unicode and Escape Sequences in Strings
await test('Correctly preserves and decodes Unicode escape sequences without double backslash', () => {
  const code = `
    val temp = "\\u00B0C";
    val newline = "line1\\nline2";
    val tab = "col1\\tcol2";
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('"°C"'), 'Should evaluate \\u00B0C cleanly');
  assert.ok(js.includes('"line1\\nline2"'));
  assert.ok(js.includes('"col1\\tcol2"'));
});

// 8. Control Flow: unless, loop, for in, match
await test('Transpiles unless, loop, for, and match statements', () => {
  const code = `
    unless (active) {
      @log("Inactive");
    }

    for (val item in items) {
      @log(item);
    }

    for (mut key of config) {
      @log(key);
    }

    match (status) {
      case 200 => @log("OK")
      case 404 => @log("Not Found")
      default => @log("Unknown")
    }
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('if (!(active))'));
  assert.ok(js.includes('for (const item of items)'));
  assert.ok(js.includes('for (let key in config)'));
  assert.ok(js.includes('switch (status)'));
  assert.ok(js.includes('case 200:'));
  assert.ok(js.includes('case 404:'));
  assert.ok(js.includes('default:'));
});

// 9. OOP & Sealed Structs
await test('Transpiles classes and sealed struct definitions', () => {
  const code = `
    struct Seal { name, tag }

    class Animal {
      constructor(name) {
        this.name = name;
      }
      speak() {
        @log(this.name);
      }
    }
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('class Seal {'));
  assert.ok(js.includes('constructor(name, tag) {'));
  assert.ok(js.includes('this.name = name;'));
  assert.ok(js.includes('this.tag = tag;'));
  assert.ok(js.includes('Object.seal(this);'), 'Should seal struct to avoid silent typo bugs');
  assert.ok(js.includes('class Animal {'));
  assert.ok(js.includes('speak() {'));
});

// 10. Pipeline Operator
await test('Transpiles pipeline operator |>', () => {
  const code = `
    val result = 5 |> double |> increment;
  `;
  const js = transpile(code, { includeRuntime: false });
  assert.ok(js.includes('increment(double(5))'));
});

// 11. Multi-Module Bundler and Monolithic JS Generation
await test('Bundles multiple .osp files into a single monolithic bundle with unified runtime', () => {
  const testDir = path.join(process.cwd(), 'test', '.tmp_test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const mathOsp = path.join(testDir, 'math.osp');
  const mainOsp = path.join(testDir, 'main.osp');

  fs.writeFileSync(mathOsp, `
    export fn add(a, b) {
      return a + b;
    }
  `, 'utf-8');

  fs.writeFileSync(mainOsp, `
    import { add } from "./math.osp";

    val result = add(10, 20);
    @log("Result is:", result);
  `, 'utf-8');

  try {
    const bundleCode = bundle(mainOsp, { cwd: testDir });
    assert.ok(bundleCode.includes('function add(a, b)'));
    assert.ok(bundleCode.includes('console.log("Result is:", result);'));
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// 12. Minification
await test('Minifies JavaScript output cleanly', () => {
  const code = `
    // Some comment
    function hello() {
      const a = 10;
      return a + 20;
    }
  `;
  const minified = Bundler.minifyJs(code);
  assert.ok(!minified.includes('// Some comment'));
  assert.ok(minified.includes('function hello()'));
});

// 13. Project Config Reader
await test('Reads package.json configuration properly', () => {
  const config = loadProjectConfig(process.cwd());
  assert.ok(config !== null);
  assert.ok(typeof config.outDir === 'string');
});

// 14. Visual Diagnostics Formatter
await test('Formats syntax errors with line excerpts and caret pointers', () => {
  const brokenCode = `val x = ;\nval y = 20;`;
  try {
    transpile(brokenCode, { filename: 'test.osp' });
    assert.fail('Should have thrown syntax error');
  } catch (err) {
    const formatted = DiagnosticReporter.formatError(err, brokenCode, 'test.osp');
    assert.ok(formatted.includes('test.osp:1:'), 'Should contain filename and line');
    assert.ok(formatted.includes('val x = ;'), 'Should contain code line');
    assert.ok(formatted.includes('^'), 'Should contain caret pointer');
  }
});

// 15. DevServer HTTP Serving
await test('DevServer starts, serves static index.html and stops', async () => {
  const testPublic = path.join(process.cwd(), 'test', '.tmp_public');
  if (!fs.existsSync(testPublic)) fs.mkdirSync(testPublic, { recursive: true });
  fs.writeFileSync(path.join(testPublic, 'index.html'), '<h1>Hello Oriented-Direct</h1>', 'utf-8');

  const server = new DevServer({ publicDir: testPublic, port: 49152 });
  const port = await server.startServer();

  try {
    const resText = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    assert.ok(resText.includes('<h1>Hello Oriented-Direct</h1>'));
  } finally {
    server.stop();
    fs.rmSync(testPublic, { recursive: true, force: true });
  }
});

// 16. Local Network IP Discovery
await test('Discovers local network IPv4 address or handles offline mode', () => {
  const ip = getLocalNetworkIp();
  if (ip) {
    assert.match(ip, /^\d+\.\d+\.\d+\.\d+$/);
  } else {
    assert.strictEqual(ip, null);
  }
});

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
