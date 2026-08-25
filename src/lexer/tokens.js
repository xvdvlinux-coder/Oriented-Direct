/**
 * Oriented-Direct (.osp) Token Definitions
 */

export const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  TEMPLATE_STRING: 'TEMPLATE_STRING',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  UNDEFINED: 'UNDEFINED',
  IDENTIFIER: 'IDENTIFIER',

  // Variable & Function Keywords
  VAL: 'VAL',             // Immutable declaration (const)
  MUT: 'MUT',             // Mutable declaration (let)
  FN: 'FN',               // Function declaration
  RETURN: 'RETURN',
  ASYNC: 'ASYNC',
  AWAIT: 'AWAIT',

  // Direct Browser & Core Directives (@-prefixed)
  DIRECTIVE_DOC: 'DIRECTIVE_DOC',       // @doc -> document
  DIRECTIVE_WIN: 'DIRECTIVE_WIN',       // @win -> window
  DIRECTIVE_FIND: 'DIRECTIVE_FIND',     // @find -> document.querySelector / parent.querySelector
  DIRECTIVE_ALL: 'DIRECTIVE_ALL',       // @all -> document.querySelectorAll
  DIRECTIVE_ID: 'DIRECTIVE_ID',         // @id -> document.getElementById
  DIRECTIVE_ON: 'DIRECTIVE_ON',         // @on -> addEventListener
  DIRECTIVE_OFF: 'DIRECTIVE_OFF',       // @off -> removeEventListener
  DIRECTIVE_EMIT: 'DIRECTIVE_EMIT',     // @emit -> dispatchEvent CustomEvent
  DIRECTIVE_CREATE: 'DIRECTIVE_CREATE', // @create -> document.createElement helper
  DIRECTIVE_HTML: 'DIRECTIVE_HTML',     // @html -> innerHTML getter/setter
  DIRECTIVE_TEXT: 'DIRECTIVE_TEXT',     // @text -> textContent getter/setter
  DIRECTIVE_CSS: 'DIRECTIVE_CSS',       // @css -> style assignment helper
  DIRECTIVE_ATTR: 'DIRECTIVE_ATTR',     // @attr -> setAttribute / getAttribute
  DIRECTIVE_VAL: 'DIRECTIVE_VAL',       // @val -> value getter/setter

  // Direct Console Directives (@-prefixed standard)
  DIRECTIVE_LOG: 'DIRECTIVE_LOG',       // @log(...) -> console.log(...)
  DIRECTIVE_PRINT: 'DIRECTIVE_PRINT',   // @print(...) -> console.log(...)
  DIRECTIVE_WARN: 'DIRECTIVE_WARN',     // @warn(...) -> console.warn(...)
  DIRECTIVE_ERROR: 'DIRECTIVE_ERROR',   // @error(...) -> console.error(...)
  DIRECTIVE_INFO: 'DIRECTIVE_INFO',     // @info(...) -> console.info(...)

  // Control Flow Keywords
  IF: 'IF',
  ELSE: 'ELSE',
  UNLESS: 'UNLESS',       // unless (x) -> if (!(x))
  WHILE: 'WHILE',
  FOR: 'FOR',
  IN: 'IN',
  OF: 'OF',
  STEP: 'STEP',           // step in range loops: for (val i in 0..10 step 2)
  LOOP: 'LOOP',           // loop { ... } -> while (true) { ... }
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  MATCH: 'MATCH',         // match expression { case ... => ... }
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

  // Logical Keywords (Alternative to symbols)
  IS: 'IS',               // is -> ===
  IS_NOT: 'IS_NOT',       // is not -> !==
  AND: 'AND',             // and -> &&
  OR: 'OR',               // or -> ||
  NOT: 'NOT',             // not -> !

  // Operators
  PLUS: 'PLUS',                     // +
  MINUS: 'MINUS',                   // -
  MULTIPLY: 'MULTIPLY',             // *
  DIVIDE: 'DIVIDE',                 // /
  MODULO: 'MODULO',                 // %
  EXPONENT: 'EXPONENT',             // **
  INCREMENT: 'INCREMENT',           // ++
  DECREMENT: 'DECREMENT',           // --

  ASSIGN: 'ASSIGN',                 // =
  PLUS_ASSIGN: 'PLUS_ASSIGN',       // +=
  MINUS_ASSIGN: 'MINUS_ASSIGN',     // -=
  MULTIPLY_ASSIGN: 'MULTIPLY_ASSIGN', // *=
  DIVIDE_ASSIGN: 'DIVIDE_ASSIGN',   // /=
  MODULO_ASSIGN: 'MODULO_ASSIGN',   // %=

  EQUAL: 'EQUAL',                   // ==  (will transpile to ===)
  NOT_EQUAL: 'NOT_EQUAL',           // !=  (will transpile to !==)
  STRICT_EQUAL: 'STRICT_EQUAL',     // ===
  STRICT_NOT_EQUAL: 'STRICT_NOT_EQUAL', // !==
  LESS_THAN: 'LESS_THAN',           // <
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL', // <=
  GREATER_THAN: 'GREATER_THAN',     // >
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL', // >=

  LOGICAL_AND: 'LOGICAL_AND',       // &&
  LOGICAL_OR: 'LOGICAL_OR',         // ||
  LOGICAL_NOT: 'LOGICAL_NOT',       // !
  NULL_COALESCE: 'NULL_COALESCE',   // ??
  OPTIONAL_CHAIN: 'OPTIONAL_CHAIN', // ?.
  PIPELINE: 'PIPELINE',             // |>
  RANGE: 'RANGE',                   // ..

  ARROW: 'ARROW',                   // => or ->
  SPREAD: 'SPREAD',                 // ...

  // Delimiters & Punctuation
  LPAREN: 'LPAREN',                 // (
  RPAREN: 'RPAREN',                 // )
  LBRACE: 'LBRACE',                 // {
  RBRACE: 'RBRACE',                 // }
  LBRACKET: 'LBRACKET',             // [
  RBRACKET: 'RBRACKET',             // ]
  COMMA: 'COMMA',                   // ,
  DOT: 'DOT',                       // .
  COLON: 'COLON',                   // :
  SEMICOLON: 'SEMICOLON',           // ;
  QUESTION: 'QUESTION',             // ?

  EOF: 'EOF'
};

export const KEYWORDS = {
  'val': TokenType.VAL,
  'mut': TokenType.MUT,
  'fn': TokenType.FN,
  'return': TokenType.RETURN,
  'async': TokenType.ASYNC,
  'await': TokenType.AWAIT,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'unless': TokenType.UNLESS,
  'while': TokenType.WHILE,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'of': TokenType.OF,
  'step': TokenType.STEP,
  'loop': TokenType.LOOP,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'match': TokenType.MATCH,
  'case': TokenType.CASE,
  'default': TokenType.DEFAULT,
  'class': TokenType.CLASS,
  'struct': TokenType.STRUCT,
  'extends': TokenType.EXTENDS,
  'constructor': TokenType.CONSTRUCTOR,
  'static': TokenType.STATIC,
  'super': TokenType.SUPER,
  'new': TokenType.NEW,
  'this': TokenType.THIS,
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'from': TokenType.FROM,
  'as': TokenType.AS,
  'try': TokenType.TRY,
  'catch': TokenType.CATCH,
  'finally': TokenType.FINALLY,
  'throw': TokenType.THROW,
  'typeof': TokenType.TYPEOF,
  'instanceof': TokenType.INSTANCEOF,
  'true': TokenType.BOOLEAN,
  'false': TokenType.BOOLEAN,
  'null': TokenType.NULL,
  'undefined': TokenType.UNDEFINED,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'is': TokenType.IS
};

export const DIRECTIVES = {
  '@doc': TokenType.DIRECTIVE_DOC,
  '@win': TokenType.DIRECTIVE_WIN,
  '@find': TokenType.DIRECTIVE_FIND,
  '@all': TokenType.DIRECTIVE_ALL,
  '@id': TokenType.DIRECTIVE_ID,
  '@on': TokenType.DIRECTIVE_ON,
  '@off': TokenType.DIRECTIVE_OFF,
  '@emit': TokenType.DIRECTIVE_EMIT,
  '@create': TokenType.DIRECTIVE_CREATE,
  '@html': TokenType.DIRECTIVE_HTML,
  '@text': TokenType.DIRECTIVE_TEXT,
  '@css': TokenType.DIRECTIVE_CSS,
  '@attr': TokenType.DIRECTIVE_ATTR,
  '@val': TokenType.DIRECTIVE_VAL,
  '@log': TokenType.DIRECTIVE_LOG,
  '@print': TokenType.DIRECTIVE_PRINT,
  '@warn': TokenType.DIRECTIVE_WARN,
  '@error': TokenType.DIRECTIVE_ERROR,
  '@info': TokenType.DIRECTIVE_INFO
};
