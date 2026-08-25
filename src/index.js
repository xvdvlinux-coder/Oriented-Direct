/**
 * Oriented-Direct (.osp) Compiler, Bundler & Dev Server API
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

export const VERSION = '1.3.0';

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
    const codegen = new CodeGenerator(ast, options);
    return codegen.generate();
  } catch (err) {
    if (!err.formattedMessage && (err.rawMessage || err.line)) {
      err.formattedMessage = DiagnosticReporter.formatError(err, source, filename);
    }
    throw err;
  }
}

export const compile = transpile;

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

export {
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  detectDefaultEntry,
  DevServer,
  startDevServer,
  getLocalNetworkIp
};

export default {
  VERSION,
  tokenize,
  parse,
  transpile,
  compile,
  bundle,
  DiagnosticReporter,
  Bundler,
  DependencyResolver,
  AssetPipeline,
  loadProjectConfig,
  detectDefaultEntry,
  DevServer,
  startDevServer,
  getLocalNetworkIp
};
