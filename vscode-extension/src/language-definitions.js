/**
 * Oriented-Direct (.osp) Language Definitions & Constants for VS Code Extension
 */

const LanguageSymbolType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  TEMPLATE_STRING: 'TEMPLATE_STRING',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  UNDEFINED: 'UNDEFINED',
  IDENTIFIER: 'IDENTIFIER',

  // Variable & Function Keywords
  VAL: 'VAL',
  MUT: 'MUT',
  FN: 'FN',
  RETURN: 'RETURN',
  ASYNC: 'ASYNC',
  AWAIT: 'AWAIT',

  // Direct Browser & DOM Directives
  DIRECTIVE_DOC: 'DIRECTIVE_DOC',
  DIRECTIVE_WIN: 'DIRECTIVE_WIN',
  DIRECTIVE_FIND: 'DIRECTIVE_FIND',
  DIRECTIVE_ALL: 'DIRECTIVE_ALL',
  DIRECTIVE_ID: 'DIRECTIVE_ID',
  DIRECTIVE_ON: 'DIRECTIVE_ON',
  DIRECTIVE_OFF: 'DIRECTIVE_OFF',
  DIRECTIVE_EMIT: 'DIRECTIVE_EMIT',
  DIRECTIVE_CREATE: 'DIRECTIVE_CREATE',
  DIRECTIVE_HTML: 'DIRECTIVE_HTML',
  DIRECTIVE_TEXT: 'DIRECTIVE_TEXT',
  DIRECTIVE_CSS: 'DIRECTIVE_CSS',
  DIRECTIVE_ATTR: 'DIRECTIVE_ATTR',
  DIRECTIVE_VAL: 'DIRECTIVE_VAL',

  // Direct Output Shorthands
  LOG: 'LOG',
  PRINT: 'PRINT',
  WARN: 'WARN',
  ERROR: 'ERROR',
  INFO: 'INFO',

  // Control Flow Keywords
  IF: 'IF',
  ELSE: 'ELSE',
  UNLESS: 'UNLESS',
  WHILE: 'WHILE',
  FOR: 'FOR',
  IN: 'IN',
  OF: 'OF',
  LOOP: 'LOOP',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  MATCH: 'MATCH',
  CASE: 'CASE',
  DEFAULT: 'DEFAULT',

  // OOP / Structures
  CLASS: 'CLASS',
  STRUCT: 'STRUCT',
  EXTENDS: 'EXTENDS',
  CONSTRUCTOR: 'CONSTRUCTOR',
  STATIC: 'STATIC',
  SUPER: 'SUPER',
  NEW: 'NEW',
  THIS: 'THIS',

  // Modules & Error Handling
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  FROM: 'FROM',
  AS: 'AS',
  TRY: 'TRY',
  CATCH: 'CATCH',
  FINALLY: 'FINALLY',
  THROW: 'THROW',
  TYPEOF: 'TYPEOF',
  INSTANCEOF: 'INSTANCEOF',

  // Logical Keywords
  IS: 'IS',
  IS_NOT: 'IS_NOT',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',

  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  MULTIPLY: 'MULTIPLY',
  DIVIDE: 'DIVIDE',
  MODULO: 'MODULO',
  EXPONENT: 'EXPONENT',
  INCREMENT: 'INCREMENT',
  DECREMENT: 'DECREMENT',

  ASSIGN: 'ASSIGN',
  PLUS_ASSIGN: 'PLUS_ASSIGN',
  MINUS_ASSIGN: 'MINUS_ASSIGN',
  MULTIPLY_ASSIGN: 'MULTIPLY_ASSIGN',
  DIVIDE_ASSIGN: 'DIVIDE_ASSIGN',
  MODULO_ASSIGN: 'MODULO_ASSIGN',

  EQUAL: 'EQUAL',
  NOT_EQUAL: 'NOT_EQUAL',
  STRICT_EQUAL: 'STRICT_EQUAL',
  STRICT_NOT_EQUAL: 'STRICT_NOT_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',

  LOGICAL_AND: 'LOGICAL_AND',
  LOGICAL_OR: 'LOGICAL_OR',
  LOGICAL_NOT: 'LOGICAL_NOT',
  NULL_COALESCE: 'NULL_COALESCE',
  OPTIONAL_CHAIN: 'OPTIONAL_CHAIN',
  PIPELINE: 'PIPELINE',

  ARROW: 'ARROW',
  SPREAD: 'SPREAD',

  // Delimiters
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  COMMA: 'COMMA',
  DOT: 'DOT',
  COLON: 'COLON',
  SEMICOLON: 'SEMICOLON',
  QUESTION: 'QUESTION',

  EOF: 'EOF'
};

const LANGUAGE_KEYWORDS = {
  'val': LanguageSymbolType.VAL,
  'mut': LanguageSymbolType.MUT,
  'fn': LanguageSymbolType.FN,
  'return': LanguageSymbolType.RETURN,
  'async': LanguageSymbolType.ASYNC,
  'await': LanguageSymbolType.AWAIT,
  'if': LanguageSymbolType.IF,
  'else': LanguageSymbolType.ELSE,
  'unless': LanguageSymbolType.UNLESS,
  'while': LanguageSymbolType.WHILE,
  'for': LanguageSymbolType.FOR,
  'in': LanguageSymbolType.IN,
  'of': LanguageSymbolType.OF,
  'loop': LanguageSymbolType.LOOP,
  'break': LanguageSymbolType.BREAK,
  'continue': LanguageSymbolType.CONTINUE,
  'match': LanguageSymbolType.MATCH,
  'case': LanguageSymbolType.CASE,
  'default': LanguageSymbolType.DEFAULT,
  'class': LanguageSymbolType.CLASS,
  'struct': LanguageSymbolType.STRUCT,
  'extends': LanguageSymbolType.EXTENDS,
  'constructor': LanguageSymbolType.CONSTRUCTOR,
  'static': LanguageSymbolType.STATIC,
  'super': LanguageSymbolType.SUPER,
  'new': LanguageSymbolType.NEW,
  'this': LanguageSymbolType.THIS,
  'import': LanguageSymbolType.IMPORT,
  'export': LanguageSymbolType.EXPORT,
  'from': LanguageSymbolType.FROM,
  'as': LanguageSymbolType.AS,
  'try': LanguageSymbolType.TRY,
  'catch': LanguageSymbolType.CATCH,
  'finally': LanguageSymbolType.FINALLY,
  'throw': LanguageSymbolType.THROW,
  'typeof': LanguageSymbolType.TYPEOF,
  'instanceof': LanguageSymbolType.INSTANCEOF,
  'true': LanguageSymbolType.BOOLEAN,
  'false': LanguageSymbolType.BOOLEAN,
  'null': LanguageSymbolType.NULL,
  'undefined': LanguageSymbolType.UNDEFINED,
  'and': LanguageSymbolType.AND,
  'or': LanguageSymbolType.OR,
  'not': LanguageSymbolType.NOT,
  'is': LanguageSymbolType.IS,
  'log': LanguageSymbolType.LOG,
  'print': LanguageSymbolType.PRINT,
  'warn': LanguageSymbolType.WARN,
  'error': LanguageSymbolType.ERROR,
  'info': LanguageSymbolType.INFO
};

const LANGUAGE_DIRECTIVES = {
  '@doc': LanguageSymbolType.DIRECTIVE_DOC,
  '@win': LanguageSymbolType.DIRECTIVE_WIN,
  '@find': LanguageSymbolType.DIRECTIVE_FIND,
  '@all': LanguageSymbolType.DIRECTIVE_ALL,
  '@id': LanguageSymbolType.DIRECTIVE_ID,
  '@on': LanguageSymbolType.DIRECTIVE_ON,
  '@off': LanguageSymbolType.DIRECTIVE_OFF,
  '@emit': LanguageSymbolType.DIRECTIVE_EMIT,
  '@create': LanguageSymbolType.DIRECTIVE_CREATE,
  '@html': LanguageSymbolType.DIRECTIVE_HTML,
  '@text': LanguageSymbolType.DIRECTIVE_TEXT,
  '@css': LanguageSymbolType.DIRECTIVE_CSS,
  '@attr': LanguageSymbolType.DIRECTIVE_ATTR,
  '@val': LanguageSymbolType.DIRECTIVE_VAL
};

module.exports = {
  LanguageSymbolType,
  LANGUAGE_KEYWORDS,
  LANGUAGE_DIRECTIVES
};
