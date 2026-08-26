/**
 * Oriented-Direct (.osp) Dependency Resolver & Module Graph
 */

import fs from 'node:fs';
import path from 'node:path';
import { Lexer } from '../lexer/lexer.js';
import { Parser } from '../parser/parser.js';
import { ASTNodeType } from '../parser/ast.js';

function parse(source, filename = '<anonymous>') {
  const lexer = new Lexer(source, filename);
  const parser = new Parser(lexer.tokenize(), filename);
  return parser.parse();
}

export class ModuleNode {
  constructor(filePath, source, ast) {
    this.filePath = filePath;
    this.id = ModuleNode.createModuleId(filePath);
    this.source = source;
    this.ast = ast;
    this.dependencies = new Map(); // specifier -> resolved ModuleNode
    this.externalImports = [];     // imports that cannot / should not be bundled
  }

  static createModuleId(filePath) {
    const normalized = path.normalize(filePath).replace(/^[a-zA-Z]:\\/, '').replace(/\\/g, '/');
    return 'mod_' + normalized.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

export class DependencyResolver {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.modules = new Map(); // absolutePath -> ModuleNode
  }

  /**
   * Resolve full dependency graph starting from entry file
   * @param {string} entryPath - Path to entry .osp file
   * @returns {Array<ModuleNode>} Topologically ordered list of modules
   */
  resolveGraph(entryPath) {
    const absoluteEntry = path.resolve(this.cwd, entryPath);
    this.modules.clear();

    const visited = new Set();
    const ordered = [];

    const traverse = (currentPath) => {
      const absPath = path.resolve(this.cwd, currentPath);

      if (this.modules.has(absPath)) {
        return this.modules.get(absPath);
      }

      if (!fs.existsSync(absPath)) {
        throw new Error(`[Oriented-Direct Bundler] Cannot resolve module '${currentPath}' from '${absPath}'`);
      }

      const source = fs.readFileSync(absPath, 'utf-8');
      const ast = parse(source, path.basename(absPath));
      const node = new ModuleNode(absPath, source, ast);
      this.modules.set(absPath, node);

      // Inspect imports
      for (const stmt of ast.body) {
        if (stmt.type === ASTNodeType.IMPORT_DECLARATION) {
          const importSource = stmt.source;

          // Check if it is a relative local import
          if (importSource.startsWith('./') || importSource.startsWith('../') || importSource.startsWith('/')) {
            let targetPath = path.resolve(path.dirname(absPath), importSource);

            if (!path.extname(targetPath)) {
              if (fs.existsSync(targetPath + '.osp')) {
                targetPath += '.osp';
              } else if (fs.existsSync(targetPath + '.js')) {
                targetPath += '.js';
              }
            }

            if (targetPath.endsWith('.osp') && fs.existsSync(targetPath)) {
              const childNode = traverse(targetPath);
              node.dependencies.set(importSource, childNode);
            } else {
              node.externalImports.push(stmt);
            }
          } else {
            node.externalImports.push(stmt);
          }
        }
      }

      return node;
    };

    const entryNode = traverse(absoluteEntry);

    // Topological sort (DFS post-order)
    const visiting = new Set();

    const sortDfs = (node) => {
      if (visiting.has(node.filePath)) {
        // Cycle detected, but in JS modules cycles are supported; continue gracefully
        return;
      }
      if (visited.has(node.filePath)) return;

      visiting.add(node.filePath);
      for (const depNode of node.dependencies.values()) {
        sortDfs(depNode);
      }
      visiting.delete(node.filePath);
      visited.add(node.filePath);
      ordered.push(node);
    };

    sortDfs(entryNode);
    return ordered;
  }
}
