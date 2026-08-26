/**
 * Oriented-Direct (.osp) Monolithic Bundler
 * Packs multi-module .osp projects into a single, clean, valid JavaScript bundle
 * with High-Precision Source Map v3 composition.
 */

import path from 'node:path';
import { DependencyResolver } from './resolver.js';
import { CodeGenerator } from '../transpiler/codegen.js';
import { RUNTIME_HELPERS_CODE } from '../transpiler/runtime.js';
import { ASTNodeType } from '../parser/ast.js';
import { SourceMapGenerator } from '../sourcemap/sourceMapGenerator.js';

export class Bundler {
  constructor(options = {}) {
    this.options = {
      format: options.format || 'esm', // 'esm' | 'iife'
      minify: options.minify || false,
      includeRuntime: options.includeRuntime ?? true,
      cwd: options.cwd || process.cwd(),
      sourceMap: options.sourceMap ?? false, // false | true | 'inline' | 'external'
      outFile: options.outFile || 'app.js',
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
    const result = this.bundleWithMap(entryPath);
    let code = result.code;

    if (this.options.sourceMap === 'inline' && result.map) {
      code += `\n\n${result.map.toDataUrl()}`;
    } else if ((this.options.sourceMap === 'external' || this.options.sourceMap === true) && result.map) {
      const mapName = path.basename(this.options.outFile ? `${this.options.outFile}.map` : 'app.js.map');
      code += `\n\n//# sourceMappingURL=${mapName}`;
    }

    return code;
  }

  /**
   * Bundle a project and return both code and SourceMapGenerator
   * @param {string} entryPath - Path to entry .osp file
   * @returns {{ code: string, map: SourceMapGenerator|null }}
   */
  bundleWithMap(entryPath) {
    const modules = this.resolver.resolveGraph(entryPath);
    const entryModule = modules[modules.length - 1];

    let usesDirectives = false;
    const modulePieces = [];
    const externalImportsMap = new Map();

    const bundleMap = this.options.sourceMap
      ? new SourceMapGenerator({ file: path.basename(this.options.outFile) })
      : null;

    // 1. Compile each module and capture its SourceMap
    for (const mod of modules) {
      const relativePath = path.relative(this.options.cwd, mod.filePath).replace(/\\/g, '/');
      if (bundleMap) {
        bundleMap.setSourceContent(relativePath, mod.source);
      }

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
            continue;
          }
        }
        filteredBody.push(stmt);
      }

      const clonedAst = { ...mod.ast, body: filteredBody };
      const codegen = new CodeGenerator(clonedAst, {
        includeRuntime: false,
        moduleType: this.options.format,
        sourceMap: Boolean(this.options.sourceMap),
        filename: relativePath,
        sourceContent: mod.source
      });

      const { code: compiledJs, map: modMap } = codegen.generateWithMap();
      if (codegen.usedDirectives.size > 0) {
        usesDirectives = true;
      }

      const isEntry = mod.filePath === entryModule.filePath;
      const modId = mod.id;
      const transformedBody = Bundler.transformModuleExports(compiledJs);
      const injections = localImportInjections.length > 0 ? localImportInjections.join('\n  ') + '\n  ' : '';

      modulePieces.push({
        mod,
        relativePath,
        modId,
        isEntry,
        injections,
        transformedBody,
        modMap
      });
    }

    // 2. Stitch the bundle output and shift SourceMap coordinates
    let bundleOutput = '';
    let currentLine = 1;

    // External imports at top for ESM
    if (this.options.format === 'esm' && externalImportsMap.size > 0) {
      for (const ext of externalImportsMap.values()) {
        const dummyAst = { type: ASTNodeType.PROGRAM, body: [ext] };
        const cg = new CodeGenerator(dummyAst, { includeRuntime: false });
        const importCode = cg.generate() + '\n';
        bundleOutput += importCode;
        currentLine += importCode.split('\n').length - 1;
      }
      bundleOutput += '\n';
      currentLine += 1;
    }

    // Runtime helpers
    if (this.options.includeRuntime && usesDirectives) {
      const runtimeCode = `${RUNTIME_HELPERS_CODE}\n\n`;
      bundleOutput += runtimeCode;
      currentLine += runtimeCode.split('\n').length - 1;
    }

    // IIFE wrapper start line adjustment
    if (this.options.format === 'iife') {
      bundleOutput += '(() => {\n';
      currentLine += 1;
    }

    // Monolithic Body Stitching
    for (let i = 0; i < modulePieces.length; i++) {
      if (i > 0) {
        bundleOutput += '\n\n';
        currentLine += 2;
      }

      const piece = modulePieces[i];
      let pieceCode = '';
      let bodyStartOffset = 0;

      if (modulePieces.length === 1) {
        pieceCode = piece.transformedBody;
        bodyStartOffset = 0;
      } else if (piece.isEntry) {
        const header = `// --- Entry Module: ${piece.relativePath} ---\n`;
        pieceCode = `${header}${piece.injections}${piece.transformedBody}`;
        bodyStartOffset = header.split('\n').length - 1 + (piece.injections ? piece.injections.split('\n').length - 1 : 0);
      } else {
        const header = `// --- Module: ${piece.relativePath} ---\nconst ${piece.modId} = (() => {\n  const exports = {};\n  `;
        const footer = `\n  return exports;\n})();`;
        pieceCode = `${header}${piece.injections}${piece.transformedBody}${footer}`;
        bodyStartOffset = header.split('\n').length - 1 + (piece.injections ? piece.injections.split('\n').length - 1 : 0);
      }

      // Map coordinates for this module
      if (bundleMap && piece.modMap) {
        const pieceLineOffset = currentLine + bodyStartOffset - 1;
        for (let lIdx = 0; lIdx < piece.modMap.mappingsByLine.length; lIdx++) {
          const segs = piece.modMap.mappingsByLine[lIdx] || [];
          for (const seg of segs) {
            if (seg.sourceIndex !== null) {
              const origSource = piece.modMap.sources[seg.sourceIndex];
              bundleMap.addMapping({
                generated: {
                  line: pieceLineOffset + lIdx + 1,
                  column: seg.genCol
                },
                original: {
                  line: seg.origLine + 1,
                  column: seg.origCol
                },
                source: origSource,
                name: seg.nameIndex !== null ? piece.modMap.names[seg.nameIndex] : undefined
              });
            }
          }
        }
      }

      bundleOutput += pieceCode;
      currentLine += pieceCode.split('\n').length - 1;
    }

    // IIFE format wrapper closing
    if (this.options.format === 'iife') {
      bundleOutput += '\n})();';
    }

    // Optional Minification
    if (this.options.minify) {
      bundleOutput = Bundler.minifyJs(bundleOutput);
    }

    return {
      code: bundleOutput,
      map: bundleMap
    };
  }

  /**
   * Transforms export statements into exports assignments within module closures
   * @param {string} jsCode - Transpiled JavaScript code
   * @returns {string} Code with exports mapped
   */
  static transformModuleExports(jsCode) {
    return jsCode
      .replace(/^export default (?:async\s+)?function\s+(\w+)/gm, 'exports.default = $1;\nfunction $1')
      .replace(/^export default class\s+(\w+)/gm, 'class $1 {\n  static _export = (exports.default = $1);\n')
      .replace(/^export default /gm, 'exports.default = ')
      .replace(/^export ((?:async\s+)?function\s+(\w+))/gm, 'exports.$2 = $2;\n$1')
      .replace(/^export class\s+(\w+)/gm, 'class $1 {\n  static _export = (exports.$1 = $1);\n')
      .replace(/^export (const|let|var)\s+(\w+)\s*=\s*/gm, '$1 $2 = exports.$2 = ')
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

export default Bundler;
