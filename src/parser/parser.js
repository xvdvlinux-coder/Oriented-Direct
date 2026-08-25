/**
 * Oriented-Direct (.osp) Recursive Descent & Precedence Parser
 */

import { TokenType } from '../lexer/tokens.js';
import { ASTNodeType, Node } from './ast.js';

export class ParserError extends Error {
  constructor(message, token) {
    const loc = token ? ` at line ${token.line}, column ${token.column} (got '${token.value || token.type}')` : '';
    super(`[Oriented-Direct ParseError] ${message}${loc}`);
    this.name = 'ParserError';
    this.rawMessage = message;
    this.token = token;
    this.line = token ? token.line : 1;
    this.column = token ? token.column : 1;
  }
}

export class Parser {
  constructor(tokens, filename = '<anonymous>') {
    this.tokens = tokens;
    this.filename = filename;
    this.cursor = 0;
    this.declaredStructs = new Map(); // structName -> Set of field names
  }

  parse() {
    const body = [];
    while (!this.isAtEnd()) {
      if (this.match(TokenType.SEMICOLON)) continue;
      body.push(this.parseStatement());
    }
    const program = new Node(ASTNodeType.PROGRAM, { filename: this.filename });
    program.body = body;
    program.declaredStructs = this.declaredStructs;
    return program;
  }

  // --- Helper Methods ---

  peek() {
    return this.tokens[this.cursor];
  }

  peekNext() {
    if (this.cursor + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.cursor + 1];
  }

  peekOffset(offset) {
    if (this.cursor + offset >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.cursor + offset];
  }

  previous() {
    return this.tokens[this.cursor - 1];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  advance() {
    if (!this.isAtEnd()) this.cursor++;
    return this.previous();
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek());
  }

  optionalSemicolon() {
    this.match(TokenType.SEMICOLON);
  }

  // --- Statement Parsers ---

  parseStatement() {
    if (this.check(TokenType.IMPORT)) return this.parseImport();
    if (this.check(TokenType.EXPORT)) return this.parseExport();
    if (this.check(TokenType.VAL) || this.check(TokenType.MUT)) return this.parseVariableDeclaration();
    if (this.check(TokenType.FN) || (this.check(TokenType.ASYNC) && this.peekNext().type === TokenType.FN)) {
      return this.parseFunctionDeclaration();
    }
    if (this.check(TokenType.CLASS)) return this.parseClassDeclaration();
    if (this.check(TokenType.STRUCT)) return this.parseStructDeclaration();
    if (this.check(TokenType.IF)) return this.parseIfStatement();
    if (this.check(TokenType.UNLESS)) return this.parseUnlessStatement();
    if (this.check(TokenType.WHILE)) return this.parseWhileStatement();
    if (this.check(TokenType.LOOP)) return this.parseLoopStatement();
    if (this.check(TokenType.FOR)) return this.parseForStatement();
    if (this.check(TokenType.MATCH)) return this.parseMatchStatement();
    if (this.check(TokenType.RETURN)) return this.parseReturnStatement();
    if (this.check(TokenType.BREAK)) return this.parseBreakStatement();
    if (this.check(TokenType.CONTINUE)) return this.parseContinueStatement();
    if (this.check(TokenType.TRY)) return this.parseTryStatement();
    if (this.check(TokenType.THROW)) return this.parseThrowStatement();
    if (this.check(TokenType.LBRACE)) return this.parseBlock();

    return this.parseExpressionStatement();
  }

  parseImport() {
    const startToken = this.consume(TokenType.IMPORT, "Expected 'import'");
    let defaultSpecifier = null;
    let specifiers = [];

    if (this.check(TokenType.IDENTIFIER)) {
      defaultSpecifier = this.advance().value;
      if (this.match(TokenType.COMMA)) {
        if (this.match(TokenType.LBRACE)) {
          specifiers = this.parseImportSpecifiers();
        }
      }
    } else if (this.match(TokenType.MULTIPLY)) {
      this.consume(TokenType.AS, "Expected 'as' after '*'");
      const alias = this.consume(TokenType.IDENTIFIER, "Expected alias identifier").value;
      specifiers.push({ imported: '*', local: alias });
    } else if (this.match(TokenType.LBRACE)) {
      specifiers = this.parseImportSpecifiers();
    }

    this.consume(TokenType.FROM, "Expected 'from' after import specifiers");
    const sourceToken = this.consume(TokenType.STRING, "Expected module path string");
    this.optionalSemicolon();

    const node = new Node(ASTNodeType.IMPORT_DECLARATION, { line: startToken.line, col: startToken.column });
    node.defaultSpecifier = defaultSpecifier;
    node.specifiers = specifiers;
    node.source = sourceToken.value;
    return node;
  }

  parseImportSpecifiers() {
    const specifiers = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        const imported = this.consume(TokenType.IDENTIFIER, "Expected imported name").value;
        let local = imported;
        if (this.match(TokenType.AS)) {
          local = this.consume(TokenType.IDENTIFIER, "Expected alias name").value;
        }
        specifiers.push({ imported, local });
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RBRACE));
    }
    this.consume(TokenType.RBRACE, "Expected '}' after import specifiers");
    return specifiers;
  }

  parseExport() {
    const startToken = this.consume(TokenType.EXPORT, "Expected 'export'");
    
    if (this.match(TokenType.DEFAULT)) {
      let declaration;
      if (this.check(TokenType.FN) || (this.check(TokenType.ASYNC) && this.peekNext().type === TokenType.FN)) {
        declaration = this.parseFunctionDeclaration();
      } else if (this.check(TokenType.CLASS)) {
        declaration = this.parseClassDeclaration();
      } else {
        declaration = this.parseExpression();
        this.optionalSemicolon();
      }
      const node = new Node(ASTNodeType.EXPORT_DECLARATION, { line: startToken.line, col: startToken.column });
      node.isDefault = true;
      node.declaration = declaration;
      return node;
    }

    let declaration;
    if (this.check(TokenType.VAL) || this.check(TokenType.MUT)) {
      declaration = this.parseVariableDeclaration();
    } else if (this.check(TokenType.FN) || (this.check(TokenType.ASYNC) && this.peekNext().type === TokenType.FN)) {
      declaration = this.parseFunctionDeclaration();
    } else if (this.check(TokenType.CLASS)) {
      declaration = this.parseClassDeclaration();
    } else if (this.check(TokenType.STRUCT)) {
      declaration = this.parseStructDeclaration();
    } else if (this.match(TokenType.LBRACE)) {
      const specifiers = this.parseImportSpecifiers();
      this.optionalSemicolon();
      const node = new Node(ASTNodeType.EXPORT_DECLARATION, { line: startToken.line, col: startToken.column });
      node.isDefault = false;
      node.specifiers = specifiers;
      return node;
    } else {
      throw new ParserError("Expected declaration after 'export'", this.peek());
    }

    const node = new Node(ASTNodeType.EXPORT_DECLARATION, { line: startToken.line, col: startToken.column });
    node.isDefault = false;
    node.declaration = declaration;
    return node;
  }

  parseVariableDeclaration() {
    const kindToken = this.advance(); // 'val' or 'mut'
    const kind = kindToken.type === TokenType.VAL ? 'val' : 'mut';
    const idToken = this.consume(TokenType.IDENTIFIER, `Expected variable name after '${kind}'`);

    let init = null;
    if (this.match(TokenType.ASSIGN)) {
      init = this.parseExpression();
    } else if (kind === 'val') {
      throw new ParserError("'val' (immutable constant) declarations must be initialized", idToken);
    }

    this.optionalSemicolon();

    const node = new Node(ASTNodeType.VARIABLE_DECLARATION, { line: kindToken.line, col: kindToken.column });
    node.kind = kind;
    node.id = idToken.value;
    node.init = init;
    return node;
  }

  parseFunctionDeclaration() {
    let isAsync = false;
    if (this.match(TokenType.ASYNC)) {
      isAsync = true;
    }
    const fnToken = this.consume(TokenType.FN, "Expected 'fn'");
    
    let name = null;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;
    }

    this.consume(TokenType.LPAREN, "Expected '(' after function name");
    const params = this.parseParameters();
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");

    let body;
    let isArrow = false;
    if (this.match(TokenType.ARROW)) {
      isArrow = true;
      body = this.parseExpression();
      this.optionalSemicolon();
    } else {
      body = this.parseBlock();
    }

    const node = new Node(ASTNodeType.FUNCTION_DECLARATION, { line: fnToken.line, col: fnToken.column });
    node.name = name;
    node.params = params;
    node.body = body;
    node.isAsync = isAsync;
    node.isArrow = isArrow;
    return node;
  }

  parseParameters() {
    const params = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const name = this.consume(TokenType.IDENTIFIER, "Expected rest parameter identifier").value;
          params.push({ name, rest: true });
          break;
        }
        const paramName = this.consume(TokenType.IDENTIFIER, "Expected parameter identifier").value;
        let defaultValue = null;
        if (this.match(TokenType.ASSIGN)) {
          defaultValue = this.parseExpression();
        }
        params.push({ name: paramName, default: defaultValue, rest: false });
      } while (this.match(TokenType.COMMA));
    }
    return params;
  }

  parseClassDeclaration() {
    const classToken = this.consume(TokenType.CLASS, "Expected 'class'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name").value;
    
    let superClass = null;
    if (this.match(TokenType.EXTENDS)) {
      superClass = this.consume(TokenType.IDENTIFIER, "Expected superclass identifier").value;
    }

    this.consume(TokenType.LBRACE, "Expected '{' before class body");
    const methods = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.SEMICOLON)) continue;
      methods.push(this.parseClassMember());
    }
    this.consume(TokenType.RBRACE, "Expected '}' after class body");

    const node = new Node(ASTNodeType.CLASS_DECLARATION, { line: classToken.line, col: classToken.column });
    node.name = name;
    node.superClass = superClass;
    node.body = methods;
    return node;
  }

  parseClassMember() {
    let isStatic = false;
    let isAsync = false;
    let isConstructor = false;

    if (this.match(TokenType.STATIC)) isStatic = true;
    if (this.match(TokenType.ASYNC)) isAsync = true;

    let nameToken;
    if (this.match(TokenType.CONSTRUCTOR)) {
      isConstructor = true;
      nameToken = { value: 'constructor' };
    } else {
      nameToken = this.consume(TokenType.IDENTIFIER, "Expected method or property name");
    }

    this.consume(TokenType.LPAREN, "Expected '(' after method name");
    const params = this.parseParameters();
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    const body = this.parseBlock();

    const node = new Node(ASTNodeType.METHOD_DEFINITION, { line: this.peek().line, col: this.peek().column });
    node.name = nameToken.value;
    node.params = params;
    node.body = body;
    node.isStatic = isStatic;
    node.isAsync = isAsync;
    node.isConstructor = isConstructor;
    return node;
  }

  parseStructDeclaration() {
    const structToken = this.consume(TokenType.STRUCT, "Expected 'struct'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected struct name").value;
    this.consume(TokenType.LBRACE, "Expected '{' before struct fields");
    
    const fields = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        const fieldName = this.consume(TokenType.IDENTIFIER, "Expected struct field name").value;
        fields.push(fieldName);
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RBRACE));
    }
    this.consume(TokenType.RBRACE, "Expected '}' after struct fields");
    this.optionalSemicolon();

    this.declaredStructs.set(name, new Set(fields));

    const node = new Node(ASTNodeType.STRUCT_DECLARATION, { line: structToken.line, col: structToken.column });
    node.name = name;
    node.fields = fields;
    return node;
  }

  parseIfStatement() {
    const token = this.consume(TokenType.IF, "Expected 'if'");
    let test;
    if (this.match(TokenType.LPAREN)) {
      test = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after if condition");
    } else {
      test = this.parseExpression();
    }

    const consequent = this.parseBlockOrStatement();
    let alternate = null;

    if (this.match(TokenType.ELSE)) {
      if (this.check(TokenType.IF)) {
        alternate = this.parseIfStatement();
      } else {
        alternate = this.parseBlockOrStatement();
      }
    }

    const node = new Node(ASTNodeType.IF_STATEMENT, { line: token.line, col: token.column });
    node.test = test;
    node.consequent = consequent;
    node.alternate = alternate;
    return node;
  }

  parseUnlessStatement() {
    const token = this.consume(TokenType.UNLESS, "Expected 'unless'");
    let test;
    if (this.match(TokenType.LPAREN)) {
      test = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after unless condition");
    } else {
      test = this.parseExpression();
    }

    const consequent = this.parseBlockOrStatement();
    let alternate = null;
    if (this.match(TokenType.ELSE)) {
      alternate = this.parseBlockOrStatement();
    }

    const invertedTest = new Node(ASTNodeType.UNARY_EXPRESSION, { line: token.line, col: token.column });
    invertedTest.operator = '!';
    invertedTest.argument = test;
    invertedTest.prefix = true;

    const node = new Node(ASTNodeType.IF_STATEMENT, { line: token.line, col: token.column });
    node.test = invertedTest;
    node.consequent = consequent;
    node.alternate = alternate;
    return node;
  }

  parseWhileStatement() {
    const token = this.consume(TokenType.WHILE, "Expected 'while'");
    let test;
    if (this.match(TokenType.LPAREN)) {
      test = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after while condition");
    } else {
      test = this.parseExpression();
    }
    const body = this.parseBlockOrStatement();

    const node = new Node(ASTNodeType.WHILE_STATEMENT, { line: token.line, col: token.column });
    node.test = test;
    node.body = body;
    return node;
  }

  parseLoopStatement() {
    const token = this.consume(TokenType.LOOP, "Expected 'loop'");
    const body = this.parseBlock();
    const node = new Node(ASTNodeType.LOOP_STATEMENT, { line: token.line, col: token.column });
    node.body = body;
    return node;
  }

  parseForStatement() {
    const token = this.consume(TokenType.FOR, "Expected 'for'");
    this.consume(TokenType.LPAREN, "Expected '(' after 'for'");

    // Check if C-style 3-part loop: for (mut i = 0; i < n; i += 40)
    // Scan ahead inside parens to see if there is a semicolon ';'
    let parenDepth = 1;
    let hasSemicolon = false;
    let offset = 0;

    while (this.peekOffset(offset).type !== TokenType.EOF) {
      const t = this.peekOffset(offset);
      if (t.type === TokenType.LPAREN) parenDepth++;
      else if (t.type === TokenType.RPAREN) {
        parenDepth--;
        if (parenDepth === 0) break;
      } else if (t.type === TokenType.SEMICOLON && parenDepth === 1) {
        hasSemicolon = true;
        break;
      }
      offset++;
    }

    if (hasSemicolon) {
      // 1. C-Style Loop
      let init = null;
      if (!this.check(TokenType.SEMICOLON)) {
        if (this.check(TokenType.VAL) || this.check(TokenType.MUT)) {
          init = this.parseVariableDeclaration();
        } else {
          init = this.parseExpression();
          this.consume(TokenType.SEMICOLON, "Expected ';' after for-loop initialization");
        }
      } else {
        this.consume(TokenType.SEMICOLON, "Expected ';'");
      }

      let test = null;
      if (!this.check(TokenType.SEMICOLON)) {
        test = this.parseExpression();
      }
      this.consume(TokenType.SEMICOLON, "Expected ';' after for-loop test condition");

      let update = null;
      if (!this.check(TokenType.RPAREN)) {
        update = this.parseExpression();
      }
      this.consume(TokenType.RPAREN, "Expected ')' after for-loop header");

      const body = this.parseBlockOrStatement();
      const node = new Node(ASTNodeType.FOR_C_STATEMENT, { line: token.line, col: token.column });
      node.init = init;
      node.test = test;
      node.update = update;
      node.body = body;
      return node;
    }

    // Otherwise: Range Loop OR Iterable/Object Loop
    let kind = 'val';
    if (this.match(TokenType.VAL)) kind = 'val';
    else if (this.match(TokenType.MUT)) kind = 'mut';

    const varName = this.consume(TokenType.IDENTIFIER, "Expected loop variable name").value;

    let loopType = 'in';
    if (this.match(TokenType.IN)) {
      loopType = 'in';
    } else if (this.match(TokenType.OF)) {
      loopType = 'of';
    } else {
      throw new ParserError("Expected 'in' or 'of' in for loop", this.peek());
    }

    const firstExpr = this.parseExpression();

    // Check for Range: for (val i in 0..100 step 10)
    if (this.match(TokenType.RANGE)) {
      const endExpr = this.parseExpression();
      let stepExpr = null;
      if (this.match(TokenType.STEP)) {
        stepExpr = this.parseExpression();
      }
      this.consume(TokenType.RPAREN, "Expected ')' after range loop header");
      const body = this.parseBlockOrStatement();

      const node = new Node(ASTNodeType.FOR_RANGE_STATEMENT, { line: token.line, col: token.column });
      node.variable = varName;
      node.kind = kind;
      node.start = firstExpr;
      node.end = endExpr;
      node.step = stepExpr;
      node.body = body;
      return node;
    }

    this.consume(TokenType.RPAREN, "Expected ')' after for loop header");
    const body = this.parseBlockOrStatement();

    const node = new Node(ASTNodeType.FOR_STATEMENT, { line: token.line, col: token.column });
    node.kind = kind;
    node.variable = varName;
    node.loopType = loopType;
    node.iterable = firstExpr;
    node.body = body;
    return node;
  }

  parseMatchStatement() {
    const token = this.consume(TokenType.MATCH, "Expected 'match'");
    let discriminant;
    if (this.match(TokenType.LPAREN)) {
      discriminant = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after match value");
    } else {
      discriminant = this.parseExpression();
    }

    this.consume(TokenType.LBRACE, "Expected '{' before match body");
    const cases = [];
    let defaultCase = null;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.CASE)) {
        const test = this.parseExpression();
        this.consume(TokenType.ARROW, "Expected '=>' or '->' after case value");
        const caseBody = this.parseBlockOrStatement();
        cases.push({ test, body: caseBody });
      } else if (this.match(TokenType.DEFAULT)) {
        this.consume(TokenType.ARROW, "Expected '=>' or '->' after default");
        defaultCase = this.parseBlockOrStatement();
      } else {
        throw new ParserError("Expected 'case' or 'default' in match statement", this.peek());
      }
    }

    this.consume(TokenType.RBRACE, "Expected '}' after match body");

    const node = new Node(ASTNodeType.MATCH_STATEMENT, { line: token.line, col: token.column });
    node.discriminant = discriminant;
    node.cases = cases;
    node.defaultCase = defaultCase;
    return node;
  }

  parseReturnStatement() {
    const token = this.consume(TokenType.RETURN, "Expected 'return'");
    let argument = null;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      argument = this.parseExpression();
    }
    this.optionalSemicolon();

    const node = new Node(ASTNodeType.RETURN_STATEMENT, { line: token.line, col: token.column });
    node.argument = argument;
    return node;
  }

  parseBreakStatement() {
    const token = this.consume(TokenType.BREAK, "Expected 'break'");
    this.optionalSemicolon();
    return new Node(ASTNodeType.BREAK_STATEMENT, { line: token.line, col: token.column });
  }

  parseContinueStatement() {
    const token = this.consume(TokenType.CONTINUE, "Expected 'continue'");
    this.optionalSemicolon();
    return new Node(ASTNodeType.CONTINUE_STATEMENT, { line: token.line, col: token.column });
  }

  parseTryStatement() {
    const token = this.consume(TokenType.TRY, "Expected 'try'");
    const block = this.parseBlock();

    let handler = null;
    if (this.match(TokenType.CATCH)) {
      let param = 'err';
      if (this.match(TokenType.LPAREN)) {
        param = this.consume(TokenType.IDENTIFIER, "Expected catch parameter name").value;
        this.consume(TokenType.RPAREN, "Expected ')' after catch parameter");
      }
      const catchBlock = this.parseBlock();
      handler = { param, body: catchBlock };
    }

    let finalizer = null;
    if (this.match(TokenType.FINALLY)) {
      finalizer = this.parseBlock();
    }

    if (!handler && !finalizer) {
      throw new ParserError("Try statement must have either 'catch' or 'finally'", token);
    }

    const node = new Node(ASTNodeType.TRY_STATEMENT, { line: token.line, col: token.column });
    node.block = block;
    node.handler = handler;
    node.finalizer = finalizer;
    return node;
  }

  parseThrowStatement() {
    const token = this.consume(TokenType.THROW, "Expected 'throw'");
    const argument = this.parseExpression();
    this.optionalSemicolon();

    const node = new Node(ASTNodeType.THROW_STATEMENT, { line: token.line, col: token.column });
    node.argument = argument;
    return node;
  }

  parseBlock() {
    const token = this.consume(TokenType.LBRACE, "Expected '{'");
    const statements = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.SEMICOLON)) continue;
      statements.push(this.parseStatement());
    }
    this.consume(TokenType.RBRACE, "Expected '}'");

    const node = new Node(ASTNodeType.BLOCK_STATEMENT, { line: token.line, col: token.column });
    node.body = statements;
    return node;
  }

  parseBlockOrStatement() {
    if (this.check(TokenType.LBRACE)) {
      return this.parseBlock();
    }
    return this.parseStatement();
  }

  parseExpressionStatement() {
    const expr = this.parseExpression();
    this.optionalSemicolon();
    const node = new Node(ASTNodeType.EXPRESSION_STATEMENT, { line: expr.loc.line, col: expr.loc.col });
    node.expression = expr;
    return node;
  }

  // --- Expression Parsers ---

  parseExpression() {
    return this.parsePipeline();
  }

  parsePipeline() {
    let left = this.parseAssignment();

    while (this.match(TokenType.PIPELINE)) {
      const opToken = this.previous();
      const right = this.parseAssignment();
      const node = new Node(ASTNodeType.PIPELINE_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseAssignment() {
    const expr = this.parseTernary();

    if (
      this.match(
        TokenType.ASSIGN,
        TokenType.PLUS_ASSIGN,
        TokenType.MINUS_ASSIGN,
        TokenType.MULTIPLY_ASSIGN,
        TokenType.DIVIDE_ASSIGN,
        TokenType.MODULO_ASSIGN
      )
    ) {
      const opToken = this.previous();
      const value = this.parseAssignment();

      if (
        expr.type !== ASTNodeType.IDENTIFIER &&
        expr.type !== ASTNodeType.MEMBER_EXPRESSION
      ) {
        throw new ParserError("Invalid assignment target", opToken);
      }

      const node = new Node(ASTNodeType.ASSIGNMENT_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = expr;
      node.operator = opToken.value;
      node.right = value;
      return node;
    }

    return expr;
  }

  parseTernary() {
    const expr = this.parseLogicalOr();

    if (this.match(TokenType.QUESTION)) {
      const opToken = this.previous();
      const consequent = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.parseExpression();

      const node = new Node(ASTNodeType.TERNARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.test = expr;
      node.consequent = consequent;
      node.alternate = alternate;
      return node;
    }

    return expr;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();

    while (this.match(TokenType.LOGICAL_OR, TokenType.OR, TokenType.NULL_COALESCE)) {
      const opToken = this.previous();
      const right = this.parseLogicalAnd();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.type === TokenType.OR ? '||' : opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();

    while (this.match(TokenType.LOGICAL_AND, TokenType.AND)) {
      const opToken = this.previous();
      const right = this.parseEquality();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.type === TokenType.AND ? '&&' : opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseEquality() {
    let left = this.parseRelational();

    while (
      this.match(
        TokenType.EQUAL,
        TokenType.NOT_EQUAL,
        TokenType.STRICT_EQUAL,
        TokenType.STRICT_NOT_EQUAL,
        TokenType.IS,
        TokenType.IS_NOT
      )
    ) {
      const opToken = this.previous();
      const right = this.parseRelational();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      
      if (opToken.type === TokenType.EQUAL || opToken.type === TokenType.IS) {
        node.operator = '===';
      } else if (opToken.type === TokenType.NOT_EQUAL || opToken.type === TokenType.IS_NOT) {
        node.operator = '!==';
      } else {
        node.operator = opToken.value;
      }

      node.right = right;
      left = node;
    }

    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();

    while (
      this.match(
        TokenType.LESS_THAN,
        TokenType.LESS_THAN_OR_EQUAL,
        TokenType.GREATER_THAN,
        TokenType.GREATER_THAN_OR_EQUAL,
        TokenType.INSTANCEOF
      )
    ) {
      const opToken = this.previous();
      const right = this.parseAdditive();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const opToken = this.previous();
      const right = this.parseMultiplicative();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseMultiplicative() {
    let left = this.parseExponentiation();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const opToken = this.previous();
      const right = this.parseExponentiation();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseExponentiation() {
    let left = this.parseUnary();

    while (this.match(TokenType.EXPONENT)) {
      const opToken = this.previous();
      const right = this.parseUnary();
      const node = new Node(ASTNodeType.BINARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.left = left;
      node.operator = opToken.value;
      node.right = right;
      left = node;
    }

    return left;
  }

  parseUnary() {
    if (
      this.match(
        TokenType.LOGICAL_NOT,
        TokenType.NOT,
        TokenType.MINUS,
        TokenType.PLUS,
        TokenType.TYPEOF,
        TokenType.AWAIT,
        TokenType.INCREMENT,
        TokenType.DECREMENT
      )
    ) {
      const opToken = this.previous();
      let operator = opToken.value;
      if (opToken.type === TokenType.NOT) operator = '!';

      const argument = this.parseUnary();
      
      if (opToken.type === TokenType.INCREMENT || opToken.type === TokenType.DECREMENT) {
        const node = new Node(ASTNodeType.UPDATE_EXPRESSION, { line: opToken.line, col: opToken.column });
        node.operator = operator;
        node.argument = argument;
        node.prefix = true;
        return node;
      }

      const node = new Node(ASTNodeType.UNARY_EXPRESSION, { line: opToken.line, col: opToken.column });
      node.operator = operator;
      node.argument = argument;
      node.prefix = true;
      return node;
    }

    return this.parseCallMember();
  }

  parseCallMember() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const prop = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        const node = new Node(ASTNodeType.MEMBER_EXPRESSION, { line: prop.line, col: prop.column });
        node.object = expr;
        node.property = new Node(ASTNodeType.IDENTIFIER, { line: prop.line, col: prop.column });
        node.property.name = prop.value;
        node.computed = false;
        node.optional = false;
        expr = node;
      } else if (this.match(TokenType.OPTIONAL_CHAIN)) {
        const prop = this.consume(TokenType.IDENTIFIER, "Expected property name after '?.'");
        const node = new Node(ASTNodeType.MEMBER_EXPRESSION, { line: prop.line, col: prop.column });
        node.object = expr;
        node.property = new Node(ASTNodeType.IDENTIFIER, { line: prop.line, col: prop.column });
        node.property.name = prop.value;
        node.computed = false;
        node.optional = true;
        expr = node;
      } else if (this.match(TokenType.LBRACKET)) {
        const indexExpr = this.parseExpression();
        this.consume(TokenType.RBRACKET, "Expected ']' after computed index");
        const node = new Node(ASTNodeType.MEMBER_EXPRESSION, { line: expr.loc.line, col: expr.loc.col });
        node.object = expr;
        node.property = indexExpr;
        node.computed = true;
        node.optional = false;
        expr = node;
      } else if (this.match(TokenType.LPAREN)) {
        const args = this.parseArgumentList();
        const node = new Node(ASTNodeType.CALL_EXPRESSION, { line: expr.loc.line, col: expr.loc.col });
        node.callee = expr;
        node.arguments = args;
        node.optional = false;
        expr = node;
      } else if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        const opToken = this.previous();
        const node = new Node(ASTNodeType.UPDATE_EXPRESSION, { line: opToken.line, col: opToken.column });
        node.operator = opToken.value;
        node.argument = expr;
        node.prefix = false;
        expr = node;
      } else {
        break;
      }
    }

    return expr;
  }

  parseArgumentList() {
    const args = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const arg = this.parseExpression();
          const spreadNode = new Node(ASTNodeType.SPREAD_ELEMENT, { line: arg.loc.line, col: arg.loc.col });
          spreadNode.argument = arg;
          args.push(spreadNode);
        } else {
          args.push(this.parseExpression());
        }
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RPAREN));
    }
    this.consume(TokenType.RPAREN, "Expected ')' after argument list");
    return args;
  }

  parsePrimary() {
    const token = this.peek();

    // Directives (@doc, @win, @find, @all, @id, @on, @off, @emit, @create, @html, @text, @css, @attr, @val, @log, @warn, @error, @info, @print)
    if (this.isDirectiveToken(token.type)) {
      return this.parseDirective();
    }

    // Literals
    if (this.match(TokenType.NUMBER)) {
      const node = new Node(ASTNodeType.LITERAL, { line: token.line, col: token.column });
      node.value = Number(token.value);
      node.raw = token.value;
      node.kind = 'number';
      return node;
    }

    if (this.match(TokenType.STRING)) {
      const node = new Node(ASTNodeType.LITERAL, { line: token.line, col: token.column });
      node.value = token.value;
      node.raw = JSON.stringify(token.value);
      node.kind = 'string';
      return node;
    }

    if (this.match(TokenType.TEMPLATE_STRING)) {
      const node = new Node(ASTNodeType.TEMPLATE_LITERAL, { line: token.line, col: token.column });
      node.value = token.value;
      return node;
    }

    if (this.match(TokenType.BOOLEAN)) {
      const node = new Node(ASTNodeType.LITERAL, { line: token.line, col: token.column });
      node.value = token.value === 'true';
      node.raw = token.value;
      node.kind = 'boolean';
      return node;
    }

    if (this.match(TokenType.NULL)) {
      const node = new Node(ASTNodeType.LITERAL, { line: token.line, col: token.column });
      node.value = null;
      node.raw = 'null';
      node.kind = 'null';
      return node;
    }

    if (this.match(TokenType.UNDEFINED)) {
      const node = new Node(ASTNodeType.LITERAL, { line: token.line, col: token.column });
      node.value = undefined;
      node.raw = 'undefined';
      node.kind = 'undefined';
      return node;
    }

    if (this.match(TokenType.THIS)) {
      return new Node(ASTNodeType.THIS_EXPRESSION, { line: token.line, col: token.column });
    }

    if (this.match(TokenType.SUPER)) {
      return new Node(ASTNodeType.SUPER_EXPRESSION, { line: token.line, col: token.column });
    }

    if (this.match(TokenType.NEW)) {
      const callee = this.parseCallMember();
      const node = new Node(ASTNodeType.NEW_EXPRESSION, { line: token.line, col: token.column });
      if (callee.type === ASTNodeType.CALL_EXPRESSION) {
        node.callee = callee.callee;
        node.arguments = callee.arguments;
      } else {
        node.callee = callee;
        node.arguments = [];
      }
      return node;
    }

    // Identifiers and Arrow Functions
    if (this.match(TokenType.IDENTIFIER)) {
      const idNode = new Node(ASTNodeType.IDENTIFIER, { line: token.line, col: token.column });
      idNode.name = token.value;

      // Single param arrow function: x => x * 2
      if (this.match(TokenType.ARROW)) {
        const arrowNode = new Node(ASTNodeType.ARROW_FUNCTION, { line: token.line, col: token.column });
        arrowNode.params = [{ name: idNode.name, default: null, rest: false }];
        if (this.check(TokenType.LBRACE)) {
          arrowNode.body = this.parseBlock();
        } else {
          arrowNode.body = this.parseExpression();
        }
        arrowNode.isAsync = false;
        return arrowNode;
      }

      return idNode;
    }

    // Parentheses: grouped expression OR arrow function (a, b) => ...
    if (this.match(TokenType.LPAREN)) {
      return this.parseParenExpressionOrArrow(token);
    }

    // Async arrow function: async (x) => ...
    if (this.match(TokenType.ASYNC)) {
      if (this.match(TokenType.LPAREN)) {
        return this.parseParenExpressionOrArrow(token, true);
      }
      if (this.match(TokenType.IDENTIFIER)) {
        const paramName = this.previous().value;
        this.consume(TokenType.ARROW, "Expected '=>' after async parameter");
        const arrowNode = new Node(ASTNodeType.ARROW_FUNCTION, { line: token.line, col: token.column });
        arrowNode.params = [{ name: paramName, default: null, rest: false }];
        if (this.check(TokenType.LBRACE)) {
          arrowNode.body = this.parseBlock();
        } else {
          arrowNode.body = this.parseExpression();
        }
        arrowNode.isAsync = true;
        return arrowNode;
      }
    }

    // Array Literal: [1, 2, 3]
    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral(token);
    }

    // Object Literal: { a: 1, b: 2 }
    if (this.match(TokenType.LBRACE)) {
      return this.parseObjectLiteral(token);
    }

    throw new ParserError(`Unexpected token '${token.value || token.type}'`, token);
  }

  isDirectiveToken(type) {
    return (
      type === TokenType.DIRECTIVE_DOC ||
      type === TokenType.DIRECTIVE_WIN ||
      type === TokenType.DIRECTIVE_FIND ||
      type === TokenType.DIRECTIVE_ALL ||
      type === TokenType.DIRECTIVE_ID ||
      type === TokenType.DIRECTIVE_ON ||
      type === TokenType.DIRECTIVE_OFF ||
      type === TokenType.DIRECTIVE_EMIT ||
      type === TokenType.DIRECTIVE_CREATE ||
      type === TokenType.DIRECTIVE_HTML ||
      type === TokenType.DIRECTIVE_TEXT ||
      type === TokenType.DIRECTIVE_CSS ||
      type === TokenType.DIRECTIVE_ATTR ||
      type === TokenType.DIRECTIVE_VAL ||
      type === TokenType.DIRECTIVE_LOG ||
      type === TokenType.DIRECTIVE_PRINT ||
      type === TokenType.DIRECTIVE_WARN ||
      type === TokenType.DIRECTIVE_ERROR ||
      type === TokenType.DIRECTIVE_INFO
    );
  }

  parseDirective() {
    const token = this.advance();
    const directiveName = token.value;

    // @doc and @win are identifiers/values without parenthesis
    if (directiveName === '@doc' || directiveName === '@win') {
      const node = new Node(ASTNodeType.DIRECTIVE_CALL, { line: token.line, col: token.column });
      node.directive = directiveName;
      node.arguments = [];
      return node;
    }

    // All other @-directives expect (arg1, arg2...)
    this.consume(TokenType.LPAREN, `Expected '(' after directive '${directiveName}'`);
    const args = this.parseArgumentList();

    const node = new Node(ASTNodeType.DIRECTIVE_CALL, { line: token.line, col: token.column });
    node.directive = directiveName;
    node.arguments = args;
    return node;
  }

  parseParenExpressionOrArrow(startToken, isAsync = false) {
    const params = [];
    let isArrow = false;

    if (this.match(TokenType.RPAREN)) {
      if (this.match(TokenType.ARROW)) {
        isArrow = true;
      } else {
        throw new ParserError("Empty parentheses must be followed by '=>'", startToken);
      }
    } else {
      const expressions = [];
      do {
        if (this.match(TokenType.SPREAD)) {
          const paramName = this.consume(TokenType.IDENTIFIER, "Expected identifier after '...'").value;
          params.push({ name: paramName, rest: true, default: null });
          isArrow = true;
          break;
        }

        const expr = this.parseExpression();
        expressions.push(expr);

        if (expr.type === ASTNodeType.IDENTIFIER) {
          params.push({ name: expr.name, rest: false, default: null });
        } else if (
          expr.type === ASTNodeType.ASSIGNMENT_EXPRESSION &&
          expr.left.type === ASTNodeType.IDENTIFIER
        ) {
          params.push({ name: expr.left.name, rest: false, default: expr.right });
        }
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RPAREN));

      this.consume(TokenType.RPAREN, "Expected ')'");

      if (this.match(TokenType.ARROW)) {
        isArrow = true;
      } else {
        if (expressions.length === 1 && !isAsync) {
          return expressions[0];
        }
        throw new ParserError("Invalid grouped expression; did you mean an arrow function '=>'?", startToken);
      }
    }

    if (isArrow) {
      let body;
      if (this.check(TokenType.LBRACE)) {
        body = this.parseBlock();
      } else {
        body = this.parseExpression();
      }

      const node = new Node(ASTNodeType.ARROW_FUNCTION, { line: startToken.line, col: startToken.column });
      node.params = params;
      node.body = body;
      node.isAsync = isAsync;
      return node;
    }
  }

  parseArrayLiteral(startToken) {
    const elements = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const arg = this.parseExpression();
          const spreadNode = new Node(ASTNodeType.SPREAD_ELEMENT, { line: arg.loc.line, col: arg.loc.col });
          spreadNode.argument = arg;
          elements.push(spreadNode);
        } else {
          elements.push(this.parseExpression());
        }
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RBRACKET));
    }
    this.consume(TokenType.RBRACKET, "Expected ']' after array literal");

    const node = new Node(ASTNodeType.ARRAY_LITERAL, { line: startToken.line, col: startToken.column });
    node.elements = elements;
    return node;
  }

  parseObjectLiteral(startToken) {
    const properties = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.match(TokenType.SPREAD)) {
          const arg = this.parseExpression();
          const spreadNode = new Node(ASTNodeType.SPREAD_ELEMENT, { line: arg.loc.line, col: arg.loc.col });
          spreadNode.argument = arg;
          properties.push(spreadNode);
          continue;
        }

        let key;
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
          key = this.advance().value;
        } else {
          throw new ParserError("Expected object property key", this.peek());
        }

        if (this.match(TokenType.COLON)) {
          const value = this.parseExpression();
          const propNode = new Node(ASTNodeType.PROPERTY, { line: startToken.line, col: startToken.column });
          propNode.key = key;
          propNode.value = value;
          propNode.shorthand = false;
          properties.push(propNode);
        } else {
          const propNode = new Node(ASTNodeType.PROPERTY, { line: startToken.line, col: startToken.column });
          propNode.key = key;
          const valNode = new Node(ASTNodeType.IDENTIFIER, { line: startToken.line, col: startToken.column });
          valNode.name = key;
          propNode.value = valNode;
          propNode.shorthand = true;
          properties.push(propNode);
        }
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RBRACE));
    }
    this.consume(TokenType.RBRACE, "Expected '}' after object literal");

    const node = new Node(ASTNodeType.OBJECT_LITERAL, { line: startToken.line, col: startToken.column });
    node.properties = properties;
    return node;
  }
}
