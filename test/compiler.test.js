/**
 * Oriented-Direct Compiler, Bundler, SourceMap & DevServer Unit Tests
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {
  transpile,
  transpileWithMap,
  bundle,
  bundleWithMap,
  parse,
  tokenize,
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  DevServer,
  getLocalNetworkIp,
  SourceMapGenerator,
  encodeVlq,
  decodeVlq,
  decodeMappings
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

// 17. Base64-VLQ Codec Mathematical Precision
await test('Encodes and decodes Base64-VLQ with 100% roundtrip accuracy', () => {
  const testNumbers = [0, 1, -1, 2, -2, 15, -15, 16, -16, 31, -31, 32, -32, 100, -100, 256, -256, 1024, -1024, 65536, -65536];
  for (const n of testNumbers) {
    const enc = encodeVlq(n);
    assert.ok(typeof enc === 'string' && enc.length > 0);
    const state = { pos: 0 };
    const dec = decodeVlq(enc, state);
    assert.strictEqual(dec, n, `Failed roundtrip for ${n}`);
    assert.strictEqual(state.pos, enc.length);
  }
});

// 18. SourceMapGenerator v3 Compliance
await test('Generates standard Source Map v3 JSON structure', () => {
  const sm = new SourceMapGenerator({ file: 'app.js' });
  sm.setSourceContent('src/app.osp', 'val a = 1;');
  sm.addMapping({
    generated: { line: 1, column: 0 },
    original: { line: 1, column: 0 },
    source: 'src/app.osp'
  });

  const json = sm.toJSON();
  assert.strictEqual(json.version, 3);
  assert.strictEqual(json.file, 'app.js');
  assert.deepStrictEqual(json.sources, ['src/app.osp']);
  assert.deepStrictEqual(json.sourcesContent, ['val a = 1;']);
  assert.ok(typeof json.mappings === 'string' && json.mappings.length > 0);
});

// 19. Transpiler Source Map with Exact AST Coordinates
await test('Transpiles single file with Source Map and accurate AST line coordinates', () => {
  const source = `val title = "Oriented-Direct";\nmut counter = 0;\n@log(title, counter);`;
  const result = transpileWithMap(source, {
    filename: 'src/main.osp',
    outFile: 'public/app.js'
  });

  assert.ok(typeof result.code === 'string');
  assert.ok(result.map !== null);

  const mapJson = result.map.toJSON();
  const decoded = decodeMappings(mapJson.mappings, mapJson.sources, mapJson.names);

  assert.ok(decoded.length >= 3, 'Must contain statement mappings');
  assert.strictEqual(decoded[0].source, 'src/main.osp');
  assert.strictEqual(decoded[0].original.line, 1);
  assert.strictEqual(decoded[1].original.line, 2);
  assert.strictEqual(decoded[2].original.line, 3);
});

// 20. Multi-Module Bundler Source Map Composition
await test('Bundler composites Source Maps across multi-module dependencies', () => {
  const testDir = path.join(process.cwd(), 'test', '.tmp_sourcemap_test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const helperOsp = path.join(testDir, 'helper.osp');
  const mainOsp = path.join(testDir, 'main.osp');

  fs.writeFileSync(helperOsp, `export fn double(n) {\n  return n * 2;\n}`, 'utf-8');
  fs.writeFileSync(mainOsp, `import { double } from "./helper.osp";\nval x = double(10);\n@log(x);`, 'utf-8');

  try {
    const result = bundleWithMap(mainOsp, { cwd: testDir, outFile: 'app.js' });
    assert.ok(result.code.includes('function double(n)'));
    assert.ok(result.map !== null);

    const mapJson = result.map.toJSON();
    assert.ok(mapJson.sources.some(s => s.endsWith('helper.osp')));
    assert.ok(mapJson.sources.some(s => s.endsWith('main.osp')));

    const decoded = decodeMappings(mapJson.mappings, mapJson.sources, mapJson.names);
    assert.ok(decoded.some(d => d.source.endsWith('helper.osp')));
    assert.ok(decoded.some(d => d.source.endsWith('main.osp')));
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// 21. Inline Source Map Data URI Generation
await test('Generates inline Source Map data URI comment when requested', () => {
  const source = `val x = 10;`;
  const code = transpile(source, {
    filename: 'test.osp',
    sourceMap: 'inline'
  });

  assert.ok(code.includes('//# sourceMappingURL=data:application/json;charset=utf-8;base64,'));
});

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
