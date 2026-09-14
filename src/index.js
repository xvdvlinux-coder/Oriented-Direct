/**
 * Oriented-Direct (.osp) Compiler, Bundler, SourceMap & Dev Server API
 * Version: 2.0.0 (ClandleLoop)
 * Strictly zero emojis.
 */

import { Lexer } from './lexer/lexer.js';
import { Parser } from './parser/parser.js';
import { CodeGenerator } from './transpiler/codegen.js';
import { DiagnosticReporter } from './diagnostics/reporter.js';
import { Bundler } from './bundler/bundler.js';
import { DependencyResolver } from './bundler/resolver.js';
import { AssetPipeline } from './bundler/assetPipeline.js';
import { loadProjectConfig, detectDefaultEntry } from './config/configReader.js';
import { DevServer, startDevServer, getLocalNetworkIp } from './server/devServer.js';
import { SourceMapGenerator, decodeMappings } from './sourcemap/sourceMapGenerator.js';
import { encodeVlq, decodeVlq } from './sourcemap/vlq.js';
import {
  SafetyAnalyzer,
  DiagnosticFormatter,
  CompilerDiagnosticFormatter,
  DiagnosticLevel,
  SourceSpan,
  NullState,
  NullLattice,
  TypeShape,
  AbstractEnvironment,
  SAFETY_ERROR_CATALOG,
  getCatalogEntry
} from './safety/index.js';

export const VERSION = '2.0.0';

/**
 * Structured error representing compile-time safety invariant violations
 */
export class SafetyError extends Error {
  constructor(diagnostics = [], formattedMessage = '') {
    const primaryMsg = diagnostics[0]?.message || 'Compile-time safety violation';
    super(primaryMsg);
    this.name = 'SafetyError';
    this.diagnostics = diagnostics;
    this.formattedMessage = formattedMessage;
    if (diagnostics[0]) {
      this.line = diagnostics[0].line || 1;
      this.column = diagnostics[0].col || diagnostics[0].column || 1;
    }
  }
}

/**
 * Tokenize Oriented-Direct source code
 * @param {string} source - .osp source code
 * @param {string} filename - optional filename for debugging
 * @returns {Array} List of tokens
 */
export function tokenize(source, filename = '<anonymous>') {
  try {
    const lexer = new Lexer(source, filename);
    return lexer.tokenize();
  } catch (err) {
    if (err.rawMessage) {
      err.formattedMessage = DiagnosticReporter.formatError(err, source, filename);
    }
    throw err;
  }
}

/**
 * Parse Oriented-Direct source into AST
 * @param {string} source - .osp source code
 * @param {string} filename - optional filename for debugging
 * @returns {object} AST
 */
export function parse(source, filename = '<anonymous>') {
  try {
    const tokens = tokenize(source, filename);
    const parser = new Parser(tokens, filename);
    return parser.parse();
  } catch (err) {
    if (err.rawMessage) {
      err.formattedMessage = DiagnosticReporter.formatError(err, source, filename);
    }
    throw err;
  }
}

/**
 * Transpile Oriented-Direct (.osp) source code directly to JavaScript
 * @param {string} source - .osp source code
 * @param {object} options - Transpilation options
 * @returns {string} JavaScript output code
 */
export function transpile(source, options = {}) {
  const filename = options.filename || '<anonymous>';
  try {
    const ast = parse(source, filename);

    // Gated Safety Guardian Pass (v2.0.0 ClandleLoop)
    if (options.safety !== false && options.gatedSafety !== false) {
      const analyzer = new SafetyAnalyzer({
        ...options,
        filename,
        sourceContent: source
      });
      const analysis = analyzer.analyze(ast);
      if (!analysis.isValid) {
        const formatted = DiagnosticFormatter.formatAll(analysis.diagnostics, source, filename);
        throw new SafetyError(analysis.diagnostics, formatted);
      }
    }

    const codegen = new CodeGenerator(ast, { ...options, sourceContent: source });
    return codegen.generate();
  } catch (err) {
    if (err instanceof SafetyError || err?.name === 'SafetyError') {
      throw err;
    }
    if (!err.formattedMessage && (err.rawMessage || err.line)) {
      err.formattedMessage = DiagnosticReporter.formatError(err, source, filename);
    }
    throw err;
  }
}

/**
 * Transpile Oriented-Direct source and return both code and SourceMapGenerator
 * @param {string} source - .osp source code
 * @param {object} options - Transpilation options
 * @returns {{ code: string, map: SourceMapGenerator|null }}
 */
export function transpileWithMap(source, options = {}) {
  const filename = options.filename || '<anonymous>';
  try {
    const ast = parse(source, filename);

    // Gated Safety Guardian Pass (v2.0.0 ClandleLoop)
    if (options.safety !== false && options.gatedSafety !== false) {
      const analyzer = new SafetyAnalyzer({
        ...options,
        filename,
        sourceContent: source
      });
      const analysis = analyzer.analyze(ast);
      if (!analysis.isValid) {
        const formatted = DiagnosticFormatter.formatAll(analysis.diagnostics, source, filename);
        throw new SafetyError(analysis.diagnostics, formatted);
      }
    }

    const codegen = new CodeGenerator(ast, { ...options, sourceMap: true, sourceContent: source });
    return codegen.generateWithMap();
  } catch (err) {
    if (err instanceof SafetyError || err?.name === 'SafetyError') {
      throw err;
    }
    if (!err.formattedMessage && (err.rawMessage || err.line)) {
      err.formattedMessage = DiagnosticReporter.formatError(err, source, filename);
    }
    throw err;
  }
}

export const compile = transpile;
export const compileWithMap = transpileWithMap;

/**
 * Bundle a multi-module .osp project starting from the entry file
 * @param {string} entryPath - Path to entry .osp file
 * @param {object} options - Bundling options (format, minify, etc.)
 * @returns {string} JavaScript bundle code
 */
export function bundle(entryPath, options = {}) {
  const bundler = new Bundler(options);
  return bundler.bundle(entryPath);
}

/**
 * Bundle a multi-module project and return both code and SourceMapGenerator
 * @param {string} entryPath - Path to entry .osp file
 * @param {object} options - Bundling options
 * @returns {{ code: string, map: SourceMapGenerator|null }}
 */
export function bundleWithMap(entryPath, options = {}) {
  const bundler = new Bundler({ ...options, sourceMap: true });
  return bundler.bundleWithMap(entryPath);
}

export {
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  detectDefaultEntry,
  DevServer,
  startDevServer,
  getLocalNetworkIp,
  SourceMapGenerator,
  decodeMappings,
  encodeVlq,
  decodeVlq,
  SafetyAnalyzer,
  DiagnosticFormatter,
  CompilerDiagnosticFormatter,
  DiagnosticLevel,
  SourceSpan,
  NullState,
  NullLattice,
  TypeShape,
  AbstractEnvironment,
  SAFETY_ERROR_CATALOG,
  getCatalogEntry
};

export default {
  VERSION,
  tokenize,
  parse,
  transpile,
  transpileWithMap,
  compile,
  compileWithMap,
  bundle,
  bundleWithMap,
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  detectDefaultEntry,
  DevServer,
  startDevServer,
  getLocalNetworkIp,
  SourceMapGenerator,
  decodeMappings,
  encodeVlq,
  decodeVlq,
  SafetyAnalyzer,
  DiagnosticFormatter,
  CompilerDiagnosticFormatter,
  DiagnosticLevel,
  SourceSpan,
  SafetyError,
  NullState,
  NullLattice,
  TypeShape,
  AbstractEnvironment,
  SAFETY_ERROR_CATALOG,
  getCatalogEntry
};
