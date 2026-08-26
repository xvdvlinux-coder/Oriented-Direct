/**
 * Oriented-Direct (.osp) Code Generator / JavaScript Transpiler
 * With High-Precision Source Map v3 Coordinate Tracking
 */

import path from 'node:path';
import { ASTNodeType } from '../parser/ast.js';
import { RUNTIME_HELPERS_CODE } from './runtime.js';
import { SourceMapGenerator } from '../sourcemap/sourceMapGenerator.js';

export class CodeGenerator {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = {
      includeRuntime: options.includeRuntime ?? true,
      target: options.target || 'browser', // 'browser' | 'node'
      moduleType: options.moduleType || 'esm', // 'esm' | 'cjs'
      indentSize: options.indentSize || 2,
      sourceMap: options.sourceMap ?? false, // false | true | 'inline' | 'external'
      filename: options.filename || 'input.osp',
      sourceContent: options.sourceContent || options.source || null,
      outFile: options.outFile || 'output.js',
      lineOffset: options.lineOffset || 0, // for bundler module shifting
      ...options
    };
    this.indentation = 0;
    this.usedDirectives = new Set();
    this.map = null;
    this.currentGenLine = 1;
    this.currentGenCol = 0;

    if (this.options.sourceMap) {
      this.map = new SourceMapGenerator({
        file: this.options.outFile ? path.basename(this.options.outFile) : path.basename(this.options.filename).replace(/\.osp$/, '.js')
      });
      if (this.options.sourceContent) {
        this.map.setSourceContent(this.options.filename, this.options.sourceContent);
      }
    }
  }

  indent() {
    return ' '.repeat(this.indentation * this.options.indentSize);
  }

  markMapping(node, colOffset = 0) {
    if (this.map && node && node.line) {
      this.map.addMapping({
        generated: {
          line: this.currentGenLine,
          column: this.currentGenCol + colOffset
        },
        original: {
          line: node.line,
          column: Math.max(0, (node.column || 1) - 1)
        },
        source: this.options.filename
      });
    }
  }

  generate() {
    const result = this.generateWithMap();
    let code = result.code;

    if (this.options.sourceMap === 'inline' && result.map) {
      code += `\n\n${result.map.toDataUrl()}`;
    } else if ((this.options.sourceMap === 'external' || this.options.sourceMap === true) && result.map) {
      const mapName = path.basename(this.options.outFile ? `${this.options.outFile}.map` : `${this.options.filename.replace(/\.osp$/, '.js')}.map`);
      code += `\n\n//# sourceMappingURL=${mapName}`;
    }

    return code;
  }

  generateWithMap() {
    this.scanDirectives(this.ast);

    let runtimePrefix = '';
    this.currentGenLine = 1 + (this.options.lineOffset || 0);
    this.currentGenCol = 0;

    if (this.options.includeRuntime && this.usedDirectives.size > 0) {
      runtimePrefix = `${RUNTIME_HELPERS_CODE}\n\n`;
      const runtimeLines = RUNTIME_HELPERS_CODE.split('\n').length + 2;
      this.currentGenLine += runtimeLines;
    }

    const codeBody = this.generateProgram(this.ast);
    const finalCode = runtimePrefix ? `${runtimePrefix}${codeBody}` : codeBody;

    return {
      code: finalCode,
      map: this.map
    };
  }

  scanDirectives(node) {
    if (!node) return;
    if (node.type === ASTNodeType.DIRECTIVE_CALL) {
      this.usedDirectives.add(node.directive);
    }
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && item.type) {
            this.scanDirectives(item);
          }
        }
      } else if (val && typeof val === 'object' && val.type) {
        this.scanDirectives(val);
      }
    }
  }

  generateProgram(node) {
    const lines = [];
    for (let i = 0; i < node.body.length; i++) {
      const stmt = node.body[i];
      this.currentGenCol = this.indentation * this.options.indentSize;
      this.markMapping(stmt);
      const stmtCode = this.generateNode(stmt);
      lines.push(stmtCode);
      const stmtLineCount = stmtCode.split('\n').length;
      this.currentGenLine += stmtLineCount;
    }
    return lines.join('\n');
  }

  generateNode(node) {
    if (!node) return '';

    switch (node.type) {
      case ASTNodeType.PROGRAM:
        return this.generateProgram(node);

      case ASTNodeType.VARIABLE_DECLARATION:
        return this.generateVariableDeclaration(node);

      case ASTNodeType.FUNCTION_DECLARATION:
        return this.generateFunctionDeclaration(node);

      case ASTNodeType.CLASS_DECLARATION:
        return this.generateClassDeclaration(node);

      case ASTNodeType.STRUCT_DECLARATION:
        return this.generateStructDeclaration(node);

      case ASTNodeType.METHOD_DEFINITION:
        return this.generateMethodDefinition(node);

      case ASTNodeType.IF_STATEMENT:
        return this.generateIfStatement(node);

      case ASTNodeType.WHILE_STATEMENT:
        return this.generateWhileStatement(node);

      case ASTNodeType.LOOP_STATEMENT:
        return this.generateLoopStatement(node);

      case ASTNodeType.FOR_STATEMENT:
        return this.generateForStatement(node);

      case ASTNodeType.FOR_C_STATEMENT:
        return this.generateForCStatement(node);

      case ASTNodeType.FOR_RANGE_STATEMENT:
        return this.generateForRangeStatement(node);

      case ASTNodeType.MATCH_STATEMENT:
        return this.generateMatchStatement(node);

      case ASTNodeType.RETURN_STATEMENT:
        return this.generateReturnStatement(node);

      case ASTNodeType.BREAK_STATEMENT:
        return `${this.indent()}break;`;

      case ASTNodeType.CONTINUE_STATEMENT:
        return `${this.indent()}continue;`;

      case ASTNodeType.TRY_STATEMENT:
        return this.generateTryStatement(node);

      case ASTNodeType.THROW_STATEMENT:
        return `${this.indent()}throw ${this.generateNode(node.argument)};`;

      case ASTNodeType.EXPRESSION_STATEMENT:
        return `${this.indent()}${this.generateNode(node.expression)};`;

      case ASTNodeType.BLOCK_STATEMENT:
        return this.generateBlockStatement(node);

      case ASTNodeType.IMPORT_DECLARATION:
        return this.generateImportDeclaration(node);

      case ASTNodeType.EXPORT_DECLARATION:
        return this.generateExportDeclaration(node);

      case ASTNodeType.DIRECTIVE_CALL:
        return this.generateDirectiveCall(node);

      case ASTNodeType.BINARY_EXPRESSION:
        return this.generateBinaryExpression(node);

      case ASTNodeType.UNARY_EXPRESSION:
        return this.generateUnaryExpression(node);

      case ASTNodeType.UPDATE_EXPRESSION:
        return this.generateUpdateExpression(node);

      case ASTNodeType.ASSIGNMENT_EXPRESSION:
        return this.generateAssignmentExpression(node);

      case ASTNodeType.PIPELINE_EXPRESSION:
        return this.generatePipelineExpression(node);

      case ASTNodeType.CALL_EXPRESSION:
        return this.generateCallExpression(node);

      case ASTNodeType.MEMBER_EXPRESSION:
        return this.generateMemberExpression(node);

      case ASTNodeType.ARRAY_LITERAL:
        return this.generateArrayLiteral(node);

      case ASTNodeType.OBJECT_LITERAL:
        return this.generateObjectLiteral(node);

      case ASTNodeType.PROPERTY:
        return this.generateProperty(node);

      case ASTNodeType.IDENTIFIER:
        return node.name;

      case ASTNodeType.LITERAL:
        if (node.kind === 'string') {
          return JSON.stringify(node.value);
        }
        return node.raw ?? String(node.value);

      case ASTNodeType.TEMPLATE_LITERAL:
        return `\`${node.value}\``;

      case ASTNodeType.ARROW_FUNCTION:
        return this.generateArrowFunction(node);

      case ASTNodeType.THIS_EXPRESSION:
        return 'this';

      case ASTNodeType.SUPER_EXPRESSION:
        return 'super';

      case ASTNodeType.NEW_EXPRESSION:
        return this.generateNewExpression(node);

      case ASTNodeType.TERNARY_EXPRESSION:
        return `(${this.generateNode(node.test)} ? ${this.generateNode(node.consequent)} : ${this.generateNode(node.alternate)})`;

      case ASTNodeType.SPREAD_ELEMENT:
        return `...${this.generateNode(node.argument)}`;

      default:
        throw new Error(`[Oriented-Direct Codegen] Unknown AST node type: ${node.type}`);
    }
  }

  generateVariableDeclaration(node) {
    const jsKind = node.kind === 'val' ? 'const' : 'let';
    const init = node.init ? ` = ${this.generateNode(node.init)}` : '';
    return `${this.indent()}${jsKind} ${node.id}${init};`;
  }

  generateFunctionDeclaration(node) {
    const asyncPrefix = node.isAsync ? 'async ' : '';
    const params = this.generateParameters(node.params);

    if (node.isArrow) {
      const body = this.generateNode(node.body);
      if (node.name) {
        return `${this.indent()}const ${node.name} = ${asyncPrefix}(${params}) => ${body};`;
      }
      return `${this.indent()}${asyncPrefix}(${params}) => ${body}`;
    }

    const name = node.name || '';
    this.indentation++;
    const bodyCode = this.generateNode(node.body);
    this.indentation--;

    return `${this.indent()}${asyncPrefix}function ${name}(${params}) ${bodyCode}`;
  }

  generateParameters(params) {
    return params
      .map(p => {
        if (p.rest) return `...${p.name}`;
        if (p.default) return `${p.name} = ${this.generateNode(p.default)}`;
        return p.name;
      })
      .join(', ');
  }

  generateClassDeclaration(node) {
    const extendsClause = node.superClass ? ` extends ${node.superClass}` : '';
    this.indentation++;
    const methodsCode = node.body.map(m => this.generateNode(m)).join('\n\n');
    this.indentation--;

    return `${this.indent()}class ${node.name}${extendsClause} {\n${methodsCode}\n${this.indent()}}`;
  }

  generateStructDeclaration(node) {
    const fields = node.fields;
    const params = fields.join(', ');
    this.indentation++;
    const assignments = fields.map(f => `${this.indent()}this.${f} = ${f};`).join('\n');
    const sealCode = `${this.indent()}Object.seal(this);`;
    this.indentation--;

    return `${this.indent()}class ${node.name} {\n${this.indent()}  constructor(${params}) {\n${assignments}\n${sealCode}\n${this.indent()}  }\n${this.indent()}}`;
  }

  generateMethodDefinition(node) {
    const staticPrefix = node.isStatic ? 'static ' : '';
    const asyncPrefix = node.isAsync ? 'async ' : '';
    const params = this.generateParameters(node.params);
    const bodyCode = this.generateNode(node.body);

    return `${this.indent()}${staticPrefix}${asyncPrefix}${node.name}(${params}) ${bodyCode}`;
  }

  generateIfStatement(node) {
    const test = this.generateNode(node.test);
    const consequent = this.generateBlockOrWrapped(node.consequent);

    let code = `${this.indent()}if (${test}) ${consequent}`;
    if (node.alternate) {
      if (node.alternate.type === ASTNodeType.IF_STATEMENT) {
        code += ` else ${this.generateNode(node.alternate).trimStart()}`;
      } else {
        const alternate = this.generateBlockOrWrapped(node.alternate);
        code += ` else ${alternate}`;
      }
    }
    return code;
  }

  generateWhileStatement(node) {
    const test = this.generateNode(node.test);
    const body = this.generateBlockOrWrapped(node.body);
    return `${this.indent()}while (${test}) ${body}`;
  }

  generateLoopStatement(node) {
    const body = this.generateBlockOrWrapped(node.body);
    return `${this.indent()}while (true) ${body}`;
  }

  generateForStatement(node) {
    const jsKind = node.kind === 'val' ? 'const' : 'let';
    const iterable = this.generateNode(node.iterable);
    const body = this.generateBlockOrWrapped(node.body);

    if (node.loopType === 'in') {
      return `${this.indent()}for (${jsKind} ${node.variable} of ${iterable}) ${body}`;
    } else {
      return `${this.indent()}for (${jsKind} ${node.variable} in ${iterable}) ${body}`;
    }
  }

  generateForCStatement(node) {
    let initCode = '';
    if (node.init) {
      if (node.init.type === ASTNodeType.VARIABLE_DECLARATION) {
        initCode = this.generateNode(node.init).trim().replace(/;$/, '');
      } else {
        initCode = this.generateNode(node.init);
      }
    }
    const testCode = node.test ? this.generateNode(node.test) : '';
    const updateCode = node.update ? this.generateNode(node.update) : '';
    const bodyCode = this.generateBlockOrWrapped(node.body);

    return `${this.indent()}for (${initCode}; ${testCode}; ${updateCode}) ${bodyCode}`;
  }

  generateForRangeStatement(node) {
    const start = this.generateNode(node.start);
    const end = this.generateNode(node.end);
    const step = node.step ? this.generateNode(node.step) : '1';
    const bodyCode = this.generateBlockOrWrapped(node.body);

    return `${this.indent()}for (let ${node.variable} = ${start}; ${node.variable} < ${end}; ${node.variable} += ${step}) ${bodyCode}`;
  }

  generateMatchStatement(node) {
    const disc = this.generateNode(node.discriminant);
    const lines = [];
    lines.push(`${this.indent()}switch (${disc}) {`);
    
    this.indentation++;
    for (const c of node.cases) {
      const caseVal = this.generateNode(c.test);
      lines.push(`${this.indent()}case ${caseVal}: {`);
      this.indentation++;
      lines.push(`${this.generateNode(c.body)}`);
      lines.push(`${this.indent()}break;`);
      this.indentation--;
      lines.push(`${this.indent()}}`);
    }

    if (node.defaultCase) {
      lines.push(`${this.indent()}default: {`);
      this.indentation++;
      lines.push(`${this.generateNode(node.defaultCase)}`);
      lines.push(`${this.indent()}break;`);
      this.indentation--;
      lines.push(`${this.indent()}}`);
    }
    this.indentation--;
    lines.push(`${this.indent()}}`);

    return lines.join('\n');
  }

  generateReturnStatement(node) {
    if (node.argument) {
      return `${this.indent()}return ${this.generateNode(node.argument)};`;
    }
    return `${this.indent()}return;`;
  }

  generateTryStatement(node) {
    const blockCode = this.generateNode(node.block);
    let code = `${this.indent()}try ${blockCode}`;

    if (node.handler) {
      const param = node.handler.param || 'err';
      const catchBody = this.generateNode(node.handler.body);
      code += ` catch (${param}) ${catchBody}`;
    }

    if (node.finalizer) {
      const finalizerBody = this.generateNode(node.finalizer);
      code += ` finally ${finalizerBody}`;
    }

    return code;
  }

  generateBlockStatement(node) {
    if (node.body.length === 0) return '{}';
    this.indentation++;
    const stmts = node.body.map(s => this.generateNode(s)).join('\n');
    this.indentation--;
    return `{\n${stmts}\n${this.indent()}}`;
  }

  generateBlockOrWrapped(node) {
    if (node.type === ASTNodeType.BLOCK_STATEMENT) {
      return this.generateBlockStatement(node);
    }
    this.indentation++;
    const stmt = this.generateNode(node);
    this.indentation--;
    return `{\n${stmt}\n${this.indent()}}`;
  }

  generateImportDeclaration(node) {
    const parts = [];
    if (node.defaultSpecifier) {
      parts.push(node.defaultSpecifier);
    }
    if (node.specifiers && node.specifiers.length > 0) {
      const isStar = node.specifiers.find(s => s.imported === '*');
      if (isStar) {
        parts.push(`* as ${isStar.local}`);
      } else {
        const specStr = node.specifiers
          .map(s => (s.imported === s.local ? s.imported : `${s.imported} as ${s.local}`))
          .join(', ');
        parts.push(`{ ${specStr} }`);
      }
    }

    let source = node.source;
    if (source.endsWith('.osp')) {
      source = source.replace(/\.osp$/, '.js');
    }

    if (parts.length > 0) {
      return `${this.indent()}import ${parts.join(', ')} from "${source}";`;
    }
    return `${this.indent()}import "${source}";`;
  }

  generateExportDeclaration(node) {
    if (node.isDefault) {
      const decl = this.generateNode(node.declaration).trim();
      return `${this.indent()}export default ${decl};`;
    }

    if (node.specifiers) {
      const specStr = node.specifiers
        .map(s => (s.imported === s.local ? s.imported : `${s.imported} as ${s.local}`))
        .join(', ');
      return `${this.indent()}export { ${specStr} };`;
    }

    const decl = this.generateNode(node.declaration).trimStart();
    return `${this.indent()}export ${decl}`;
  }

  generateDirectiveCall(node) {
    const dir = node.directive;
    this.usedDirectives.add(dir);

    switch (dir) {
      case '@doc':
        return '$doc';
      case '@win':
        return '$win';
      case '@find':
        return `$find(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@all':
        return `$all(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@id':
        return `$id(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@on':
        return `$on(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@off':
        return `$off(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@emit':
        return `$emit(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@create':
        return `$create(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@html':
        return `$html(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@text':
        return `$text(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@css':
        return `$css(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@attr':
        return `$attr(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@val':
        return `$val(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@log':
      case 'log':
      case '@print':
      case 'print':
        return `console.log(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@warn':
      case 'warn':
        return `console.warn(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@error':
      case 'error':
        return `console.error(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      case '@info':
      case 'info':
        return `console.info(${node.arguments.map(a => this.generateNode(a)).join(', ')})`;
      default:
        throw new Error(`Unknown directive: ${dir}`);
    }
  }

  generateBinaryExpression(node) {
    const left = this.generateNode(node.left);
    const right = this.generateNode(node.right);
    return `(${left} ${node.operator} ${right})`;
  }

  generateUnaryExpression(node) {
    const arg = this.generateNode(node.argument);
    if (node.operator === 'typeof' || node.operator === 'await') {
      return `(${node.operator} ${arg})`;
    }
    return `${node.operator}(${arg})`;
  }

  generateUpdateExpression(node) {
    const arg = this.generateNode(node.argument);
    return node.prefix ? `${node.operator}${arg}` : `${arg}${node.operator}`;
  }

  generateAssignmentExpression(node) {
    const left = this.generateNode(node.left);
    const right = this.generateNode(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  generatePipelineExpression(node) {
    const leftCode = this.generateNode(node.left);
    const rightNode = node.right;

    if (rightNode.type === ASTNodeType.CALL_EXPRESSION) {
      const callee = this.generateNode(rightNode.callee);
      const otherArgs = rightNode.arguments.map(a => this.generateNode(a));
      return `${callee}(${[leftCode, ...otherArgs].join(', ')})`;
    }

    const rightCode = this.generateNode(rightNode);
    return `${rightCode}(${leftCode})`;
  }

  generateCallExpression(node) {
    const callee = this.generateNode(node.callee);
    const args = node.arguments.map(a => this.generateNode(a)).join(', ');
    const opt = node.optional ? '?.' : '';
    return `${callee}${opt}(${args})`;
  }

  generateMemberExpression(node) {
    const obj = this.generateNode(node.object);
    const opt = node.optional ? '?.' : '';
    if (node.computed) {
      return `${obj}${opt}[${this.generateNode(node.property)}]`;
    }
    const dot = node.optional ? '?.' : '.';
    return `${obj}${dot}${this.generateNode(node.property)}`;
  }

  generateArrayLiteral(node) {
    const elements = node.elements.map(e => this.generateNode(e)).join(', ');
    return `[${elements}]`;
  }

  generateObjectLiteral(node) {
    if (node.properties.length === 0) return '{}';
    const props = node.properties.map(p => this.generateNode(p)).join(', ');
    return `{ ${props} }`;
  }

  generateProperty(node) {
    if (node.type === ASTNodeType.SPREAD_ELEMENT) {
      return `...${this.generateNode(node.argument)}`;
    }
    if (node.shorthand) {
      return node.key;
    }
    return `${node.key}: ${this.generateNode(node.value)}`;
  }

  generateArrowFunction(node) {
    const asyncPrefix = node.isAsync ? 'async ' : '';
    const params = this.generateParameters(node.params);
    let body;
    if (node.body.type === ASTNodeType.BLOCK_STATEMENT) {
      body = this.generateBlockStatement(node.body);
    } else {
      body = this.generateNode(node.body);
    }
    return `${asyncPrefix}(${params}) => ${body}`;
  }

  generateNewExpression(node) {
    const callee = this.generateNode(node.callee);
    const args = node.arguments.map(a => this.generateNode(a)).join(', ');
    return `new ${callee}(${args})`;
  }
}
