/**
 * Oriented-Direct (.osp) Monolithic Bundler
 * Packs multi-module .osp projects into a single, clean, valid JavaScript bundle.
 */

import path from 'node:path';
import { DependencyResolver } from './resolver.js';
import { CodeGenerator } from '../transpiler/codegen.js';
import { RUNTIME_HELPERS_CODE } from '../transpiler/runtime.js';
import { ASTNodeType } from '../parser/ast.js';

export class Bundler {
  constructor(options = {}) {
    this.options = {
      format: options.format || 'esm', // 'esm' | 'iife'
      minify: options.minify || false,
      includeRuntime: options.includeRuntime ?? true,
      cwd: options.cwd || process.cwd(),
      ...options
    };
    this.resolver = new DependencyResolver({ cwd: this.options.cwd });
  }

  /**
   * Bundle a project starting from the entry file
   * @param {string} entryPath - Path to entry .osp file
   * @returns {string} Bundled JavaScript output code
   */
  bundle(entryPath) {
    const modules = this.resolver.resolveGraph(entryPath);
    const entryModule = modules[modules.length - 1];

    let usesDirectives = false;
    const moduleCodes = [];
    const externalImportsMap = new Map();

    // 1. Compile each module
    for (const mod of modules) {
      // Collect external imports
      for (const ext of mod.externalImports) {
        if (!externalImportsMap.has(ext.source)) {
          externalImportsMap.set(ext.source, ext);
        }
      }

      // Identify local dependencies and their import bindings
      const localImportInjections = [];
      const filteredBody = [];

      for (const stmt of mod.ast.body) {
        if (stmt.type === ASTNodeType.IMPORT_DECLARATION) {
          if (mod.dependencies.has(stmt.source)) {
            const depNode = mod.dependencies.get(stmt.source);
            const depModId = depNode.id;

            if (stmt.defaultSpecifier) {
              localImportInjections.push(`const ${stmt.defaultSpecifier} = ${depModId}.default || ${depModId};`);
            }
            if (stmt.specifiers && stmt.specifiers.length > 0) {
              const isStar = stmt.specifiers.find(s => s.imported === '*');
              if (isStar) {
                localImportInjections.push(`const ${isStar.local} = ${depModId};`);
              } else {
                const destruct = stmt.specifiers
                  .map(s => (s.imported === s.local ? s.imported : `${s.imported}: ${s.local}`))
                  .join(', ');
                localImportInjections.push(`const { ${destruct} } = ${depModId};`);
              }
            }
            continue; // Do not include local import statement in transpiled body
          }
        }
        filteredBody.push(stmt);
      }

      const clonedAst = { ...mod.ast, body: filteredBody };
      const codegen = new CodeGenerator(clonedAst, {
        includeRuntime: false,
        moduleType: this.options.format
      });

      const compiledJs = codegen.generate();
      if (codegen.usedDirectives.size > 0) {
        usesDirectives = true;
      }

      const isEntry = mod.filePath === entryModule.filePath;

      if (modules.length === 1) {
        moduleCodes.push(compiledJs);
      } else {
        const modId = mod.id;
        const relativePath = path.relative(this.options.cwd, mod.filePath).replace(/\\/g, '/');
        const transformedBody = Bundler.transformModuleExports(compiledJs);
        const injections = localImportInjections.length > 0 ? localImportInjections.join('\n  ') + '\n  ' : '';

        if (isEntry) {
          // Entry point code runs top-level in bundle
          moduleCodes.push(`
// --- Entry Module: ${relativePath} ---
${injections}${transformedBody}
`.trim());
        } else {
          moduleCodes.push(`
// --- Module: ${relativePath} ---
const ${modId} = (() => {
  const exports = {};
  ${injections}${transformedBody}
  return exports;
})();
`.trim());
        }
      }
    }

    // 2. Build the bundle header
    let bundleOutput = '';

    // External imports at top for ESM
    if (this.options.format === 'esm' && externalImportsMap.size > 0) {
      for (const ext of externalImportsMap.values()) {
        const dummyAst = { type: ASTNodeType.PROGRAM, body: [ext] };
        const cg = new CodeGenerator(dummyAst, { includeRuntime: false });
        bundleOutput += cg.generate() + '\n';
      }
      bundleOutput += '\n';
    }

    // Runtime helpers
    if (this.options.includeRuntime && usesDirectives) {
      bundleOutput += `${RUNTIME_HELPERS_CODE}\n\n`;
    }

    // Monolithic Body
    bundleOutput += moduleCodes.join('\n\n');

    // IIFE format wrapper
    if (this.options.format === 'iife') {
      bundleOutput = `(() => {\n${bundleOutput}\n})();`;
    }

    // Optional Minification
    if (this.options.minify) {
      bundleOutput = Bundler.minifyJs(bundleOutput);
    }

    return bundleOutput;
  }

  /**
   * Transforms export statements into exports assignments within module closures
   * @param {string} jsCode - Transpiled JavaScript code
   * @returns {string} Code with exports mapped
   */
  static transformModuleExports(jsCode) {
    return jsCode
      .replace(/^export default (?:async\s+)?function\s+(\w+)/gm, 'exports.default = $1;\nfunction $1')
      .replace(/^export default class\s+(\w+)/gm, 'exports.default = $1;\nclass $1')
      .replace(/^export default /gm, 'exports.default = ')
      .replace(/^export ((?:async\s+)?function\s+(\w+))/gm, 'exports.$2 = $2;\n$1')
      .replace(/^export (class\s+(\w+))/gm, 'exports.$2 = $2;\n$1')
      .replace(/^export (const|let|var)\s+(\w+)/gm, 'exports.$2 = $2;\n$1 $2')
      .replace(/^export\s*\{\s*([^}]+)\s*\};?/gm, (match, names) => {
        const assignments = names.split(',').map(n => {
          const parts = n.trim().split(/\s+as\s+/);
          const local = parts[0].trim();
          const exported = parts[1] ? parts[1].trim() : local;
          return `exports.${exported} = ${local};`;
        }).join('\n');
        return assignments;
      });
  }

  /**
   * Lightweight JavaScript minifier
   * @param {string} code - JavaScript code
   * @returns {string} Minified JavaScript code
   */
  static minifyJs(code) {
    return code
      .replace(/(?<!:)\/\/(.*)$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*([{}();:,=+\-*/><!&|])\s*/g, '$1')
      .replace(/;\}/g, '}')
      .trim();
  }
}
