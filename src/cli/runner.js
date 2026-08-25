/**
 * Oriented-Direct (.osp) CLI Runner v1.3.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  transpile,
  bundle,
  VERSION,
  DiagnosticReporter,
  loadProjectConfig,
  detectDefaultEntry,
  AssetPipeline,
  DependencyResolver,
  startDevServer
} from '../index.js';

export function printHelp() {
  console.log(`
Oriented-Direct CLI Compiler & Bundler (ospc) v${VERSION}
An unambiguous, direct programming language transpiling directly to JavaScript.

USAGE:
  ospc [command] [options] [entry.osp]

COMMANDS:
  dev [port]              Start local development web server with auto-rebuild (serves public/)
  serve [port]            Alias for 'dev' command
  build [entry.osp]       Compile/Bundle project using package.json config or flags
  compile <file.osp>      Transpile a single .osp file to a JavaScript .js file
  run <file.osp>          Transpile/Bundle and immediately execute with Node.js
  watch [entry.osp]       Watch file/project and compile/bundle automatically on changes
  version, -v, --version  Show version information
  help, -h, --help        Show this help message

OPTIONS:
  --dev, --serve          Run the local development HTTP server after building
  -p, --port <number>     Port number for development server (default: 3000)
  -o, --output <path>     Specify output JavaScript file path
  --public [dir]          Target public/dist folder, bundle code and copy HTML/CSS/assets
  --bundle, -b            Bundle entry file and all imported .osp modules into a single .js
  --minify, -m            Minify output JavaScript bundle
  --format <esm|iife>     Module format for output bundle (default: esm)
  -t, --target <target>   Compilation target: 'browser' (default) or 'node'
  --no-runtime            Do not include runtime helpers in output code
  --stdout                Output generated JavaScript directly to stdout

PROJECT CONFIGURATION (package.json):
  Add an "osp" section to your package.json or create osp.json:
  {
    "osp": {
      "entry": "src/main.osp",
      "outDir": "public",
      "outFile": "app.js",
      "bundle": true,
      "port": 3000
    }
  }

EXAMPLES:
  ospc dev                           # Builds and starts dev server on http://localhost:3000
  ospc dev 8080                      # Starts dev server on port 8080
  ospc build --public                # Builds to public/ with HTML & CSS copied
  ospc build --bundle -o public/app.js
  ospc watch --public
`);
}

export function printVersion() {
  console.log(`Oriented-Direct Compiler (ospc) version ${VERSION}`);
}

export async function runCli(argv) {
  const args = argv.slice(2);

  if (args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    printHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
    printVersion();
    return;
  }

  // Check for dev server flags: ospc dev, ospc serve, ospc --dev, ospc --run --dev
  if (
    args[0] === 'dev' ||
    args[0] === 'serve' ||
    args.includes('--dev') ||
    args.includes('--serve')
  ) {
    const devArgs = args.filter(a => a !== 'dev' && a !== 'serve' && a !== '--dev' && a !== '--serve');
    await handleDev(devArgs);
    return;
  }

  const command = args[0] || 'build';

  switch (command) {
    case 'build':
      await handleBuild(args.slice(1));
      break;

    case 'compile':
      await handleCompile(args.slice(1));
      break;

    case 'run':
    case 'exec':
      await handleRun(args.slice(1));
      break;

    case 'watch':
      await handleWatch(args.slice(1));
      break;

    default:
      if (command.endsWith('.osp') || fs.existsSync(command)) {
        await handleBuild(args);
      } else {
        console.error(`\x1b[1;31merror\x1b[0m: Unknown command '${command}'. Use 'ospc --help' for available commands.`);
        process.exit(1);
      }
      break;
  }
}

function parseCliOptions(args, cwd = process.cwd()) {
  const projectConfig = loadProjectConfig(cwd);

  const options = {
    inputFile: projectConfig.entry || detectDefaultEntry(cwd),
    outputFile: null,
    outDir: projectConfig.outDir || 'public',
    outFile: projectConfig.outFile || 'app.js',
    publicMode: false,
    bundle: projectConfig.bundle ?? false,
    format: projectConfig.format || 'esm',
    minify: projectConfig.minify ?? false,
    target: projectConfig.target || 'browser',
    port: projectConfig.port || 3000,
    host: projectConfig.host || '0.0.0.0',
    includeRuntime: projectConfig.includeRuntime ?? true,
    assets: projectConfig.assets,
    stdout: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      options.outputFile = args[++i];
    } else if (arg === '-p' || arg === '--port') {
      options.port = parseInt(args[++i], 10) || 3000;
    } else if (arg === '--host') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.host = args[++i];
      } else {
        options.host = '0.0.0.0';
      }
    } else if (arg === '--public') {
      options.publicMode = true;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.outDir = args[++i];
      }
    } else if (arg === '-b' || arg === '--bundle') {
      options.bundle = true;
    } else if (arg === '-m' || arg === '--minify') {
      options.minify = true;
    } else if (arg === '--format') {
      options.format = args[++i];
    } else if (arg === '-t' || arg === '--target') {
      options.target = args[++i];
    } else if (arg === '--no-runtime') {
      options.includeRuntime = false;
    } else if (arg === '--stdout') {
      options.stdout = true;
    } else if (arg.startsWith('-')) {
      // ignore other flags
    } else if (!isNaN(Number(arg)) && i === 0) {
      options.port = parseInt(arg, 10);
    } else if (!options.inputFile) {
      options.inputFile = arg;
    } else {
      options.inputFile = arg;
    }
  }

  if (options.publicMode) {
    options.bundle = true;
  }

  return options;
}

export async function handleDev(args) {
  const options = parseCliOptions(args);
  await startDevServer(options);
}

export async function handleBuild(args, passedOptions = null) {
  const options = passedOptions || parseCliOptions(args);

  if (!options.inputFile) {
    console.error('\x1b[1;31merror\x1b[0m: No entry .osp file found. Specify one via CLI or "entry" in package.json.');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`\x1b[1;31merror\x1b[0m: Entry file not found: '${inputPath}'`);
    process.exit(1);
  }

  try {
    let jsCode;
    if (options.bundle) {
      jsCode = bundle(inputPath, {
        format: options.format,
        minify: options.minify,
        includeRuntime: options.includeRuntime,
        cwd: process.cwd()
      });
    } else {
      const source = fs.readFileSync(inputPath, 'utf-8');
      jsCode = transpile(source, {
        filename: path.basename(inputPath),
        target: options.target,
        includeRuntime: options.includeRuntime
      });
    }

    if (options.stdout) {
      process.stdout.write(jsCode + '\n');
      return;
    }

    let outputPath;
    if (options.publicMode) {
      const targetDir = path.resolve(process.cwd(), options.outDir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const bundleName = options.outputFile ? path.basename(options.outputFile) : options.outFile;
      outputPath = path.join(targetDir, bundleName);
      fs.writeFileSync(outputPath, jsCode, 'utf-8');

      // Run asset pipeline
      const pipeline = new AssetPipeline({ cwd: process.cwd(), outDir: targetDir, assets: options.assets });
      const copied = pipeline.copyAssets(bundleName);

      console.log(`\x1b[1;32m[Oriented-Direct Build]\x1b[0m Successfully built to '\x1b[1m${options.outDir}/\x1b[0m':`);
      console.log(`  ✓ Bundle: ${path.relative(process.cwd(), outputPath)} (${(Buffer.byteLength(jsCode, 'utf8') / 1024).toFixed(2)} KB)`);
      if (copied.length > 0) {
        console.log(`  ✓ Assets copied: ${copied.join(', ')}`);
      }
    } else {
      if (options.outputFile) {
        outputPath = path.resolve(process.cwd(), options.outputFile);
      } else {
        outputPath = inputPath.replace(/\.osp$/, '') + '.js';
      }

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, jsCode, 'utf-8');
      console.log(`\x1b[1;32m[Oriented-Direct Build]\x1b[0m '${options.inputFile}' -> '${path.relative(process.cwd(), outputPath)}'`);
    }
  } catch (err) {
    console.error(err.formattedMessage || err.message || err);
    process.exit(1);
  }
}

export async function handleCompile(args) {
  const options = parseCliOptions(args);
  options.bundle = false;
  await handleBuild(args, options);
}

export async function handleRun(args) {
  const options = parseCliOptions(args);

  if (!options.inputFile) {
    console.error('\x1b[1;31merror\x1b[0m: No input .osp file specified to run.');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`\x1b[1;31merror\x1b[0m: File not found: '${inputPath}'`);
    process.exit(1);
  }

  try {
    let jsCode;
    if (options.bundle) {
      jsCode = bundle(inputPath, {
        format: 'esm',
        includeRuntime: options.includeRuntime,
        cwd: process.cwd()
      });
    } else {
      const source = fs.readFileSync(inputPath, 'utf-8');
      jsCode = transpile(source, {
        filename: path.basename(inputPath),
        target: 'node',
        includeRuntime: options.includeRuntime
      });
    }

    const tempDir = path.join(process.cwd(), '.osp_cache');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `run_${Date.now()}_${path.basename(inputPath, '.osp')}.js`);
    fs.writeFileSync(tempFile, jsCode, 'utf-8');

    try {
      const fileUrl = pathToFileURL(tempFile).href;
      await import(fileUrl);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      try {
        fs.rmdirSync(tempDir);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.error(err.formattedMessage || err.message || err);
    process.exit(1);
  }
}

export async function handleWatch(args) {
  const options = parseCliOptions(args);

  if (!options.inputFile) {
    console.error('\x1b[1;31merror\x1b[0m: No entry .osp file found for watch mode.');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`\x1b[1;31merror\x1b[0m: File not found: '${inputPath}'`);
    process.exit(1);
  }

  console.log(`[Oriented-Direct] Watching project (entry: '${options.inputFile}')...`);

  const resolver = new DependencyResolver({ cwd: process.cwd() });

  const buildOnce = () => {
    try {
      handleBuild(args, options).catch(() => {});
    } catch (err) {
      console.error(err.formattedMessage || err.message || err);
    }
  };

  buildOnce();

  const watchedFiles = new Set();
  const updateWatchers = () => {
    try {
      const graph = resolver.resolveGraph(inputPath);
      for (const mod of graph) {
        if (!watchedFiles.has(mod.filePath)) {
          watchedFiles.add(mod.filePath);
          fs.watchFile(mod.filePath, { interval: 300 }, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
              console.log(`\x1b[1;34m[${new Date().toLocaleTimeString()}]\x1b[0m File changed: ${path.relative(process.cwd(), mod.filePath)}`);
              buildOnce();
              updateWatchers();
            }
          });
        }
      }
    } catch {
      // ignore
    }
  };

  updateWatchers();
}
