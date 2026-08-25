/**
 * Oriented-Direct (.osp) Lexer
 */

import { TokenType, KEYWORDS, DIRECTIVES } from './tokens.js';

export class Token {
  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

export class LexerError extends Error {
  constructor(message, line, column, token = null) {
    super(`[Oriented-Direct SyntaxError] ${message} at line ${line}, column ${column}`);
    this.name = 'LexerError';
    this.rawMessage = message;
    this.line = line;
    this.column = column;
    this.token = token || new Token('UNKNOWN', '', line, column);
  }
}

export class Lexer {
  constructor(source, filename = '<anonymous>') {
    this.source = source;
    this.filename = filename;
    this.cursor = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  tokenize() {
    while (!this.isAtEnd()) {
      const char = this.peek();

      // Whitespace
      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      // Comments
      if (char === '/' && this.peekNext() === '/') {
        this.skipLineComment();
        continue;
      }
      if (char === '/' && this.peekNext() === '*') {
        this.skipBlockComment();
        continue;
      }

      // Directives (@doc, @find, @log, etc.)
      if (char === '@') {
        this.readDirective();
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      // Template Strings
      if (char === '`') {
        this.readTemplateString();
        continue;
      }

      // Numbers
      if (this.isDigit(char)) {
        this.readNumber();
        continue;
      }

      // Identifiers & Keywords
      if (this.isAlpha(char) || char === '_' || char === '$') {
        this.readIdentifierOrKeyword();
        continue;
      }

      // Operators & Punctuation
      this.readOperatorOrPunctuation();
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.line, this.column));
    return this.tokens;
  }

  isAtEnd() {
    return this.cursor >= this.source.length;
  }

  peek() {
    if (this.isAtEnd()) return '\0';
    return this.source[this.cursor];
  }

  peekNext() {
    if (this.cursor + 1 >= this.source.length) return '\0';
    return this.source[this.cursor + 1];
  }

  peekOffset(offset) {
    if (this.cursor + offset >= this.source.length) return '\0';
    return this.source[this.cursor + offset];
  }

  advance() {
    if (this.isAtEnd()) return '\0';
    const char = this.source[this.cursor++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source[this.cursor] !== expected) return false;
    this.advance();
    return true;
  }

  isWhitespace(char) {
    return char === ' ' || char === '\t' || char === '\r' || char === '\n';
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  isHexDigit(char) {
    return (
      (char >= '0' && char <= '9') ||
      (char >= 'a' && char <= 'f') ||
      (char >= 'A' && char <= 'F')
    );
  }

  isAlpha(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char) || char === '_' || char === '$';
  }

  skipLineComment() {
    this.advance(); // /
    this.advance(); // /
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  skipBlockComment() {
    const startLine = this.line;
    const startCol = this.column;
    this.advance(); // /
    this.advance(); // *
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // *
        this.advance(); // /
        return;
      }
      this.advance();
    }
    throw new LexerError('Unterminated block comment', startLine, startCol);
  }

  readString(quote) {
    const startLine = this.line;
    const startCol = this.column;
    this.advance(); // opening quote
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        throw new LexerError('Unterminated string literal (newline in string)', startLine, startCol);
      }

      if (this.peek() === '\\') {
        this.advance(); // consume \
        const esc = this.advance();
        switch (esc) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case 'b': value += '\b'; break;
          case 'f': value += '\f'; break;
          case 'v': value += '\v'; break;
          case '0': value += '\0'; break;
          case '\\': value += '\\'; break;
          case '\'': value += '\''; break;
          case '"': value += '"'; break;

          // Hex escape: \xHH
          case 'x': {
            let hex = '';
            for (let i = 0; i < 2; i++) {
              if (this.isHexDigit(this.peek())) {
                hex += this.advance();
              } else {
                throw new LexerError(`Invalid hexadecimal escape sequence '\\x${hex}'`, startLine, startCol);
              }
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }

          // Unicode escape: \uHHHH or \u{HHHHH}
          case 'u': {
            if (this.peek() === '{') {
              this.advance(); // {
              let hex = '';
              while (!this.isAtEnd() && this.peek() !== '}') {
                if (this.isHexDigit(this.peek())) {
                  hex += this.advance();
                } else {
                  throw new LexerError(`Invalid character in Unicode code point escape '\\u{${hex}${this.peek()}'`, startLine, startCol);
                }
              }
              if (this.isAtEnd() || this.peek() !== '}') {
                throw new LexerError('Unterminated Unicode escape sequence', startLine, startCol);
              }
              this.advance(); // }
              const codePoint = parseInt(hex, 16);
              value += String.fromCodePoint(codePoint);
            } else {
              let hex = '';
              for (let i = 0; i < 4; i++) {
                if (this.isHexDigit(this.peek())) {
                  hex += this.advance();
                } else {
                  throw new LexerError(`Invalid Unicode escape sequence '\\u${hex}'`, startLine, startCol);
                }
              }
              value += String.fromCharCode(parseInt(hex, 16));
            }
            break;
          }

          default:
            value += esc;
            break;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated string literal', startLine, startCol);
    }

    this.advance(); // closing quote
    this.tokens.push(new Token(TokenType.STRING, value, startLine, startCol));
  }

  readTemplateString() {
    const startLine = this.line;
    const startCol = this.column;
    this.advance(); // `
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '`') {
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        if (esc === '`') value += '`';
        else value += '\\' + esc;
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated template string', startLine, startCol);
    }

    this.advance(); // `
    this.tokens.push(new Token(TokenType.TEMPLATE_STRING, value, startLine, startCol));
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    // Hex / Binary / Octal
    if (this.peek() === '0') {
      const next = this.peekNext().toLowerCase();
      if (next === 'x' || next === 'b' || next === 'o') {
        value += this.advance(); // 0
        value += this.advance(); // x/b/o
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
          value += this.advance();
        }
        this.tokens.push(new Token(TokenType.NUMBER, value, startLine, startCol));
        return;
      }
    }

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part (ensure not range ..)
    if (this.peek() === '.' && this.peekNext() !== '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push(new Token(TokenType.NUMBER, value, startLine, startCol));
  }

  readIdentifierOrKeyword() {
    const startLine = this.line;
    const startCol = this.column;
    let name = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      name += this.advance();
    }

    // Check for "is not" sequence
    if (name === 'is') {
      let offset = 0;
      while (this.peekOffset(offset) === ' ' || this.peekOffset(offset) === '\t') {
        offset++;
      }
      if (
        this.peekOffset(offset) === 'n' &&
        this.peekOffset(offset + 1) === 'o' &&
        this.peekOffset(offset + 2) === 't' &&
        !this.isAlphaNumeric(this.peekOffset(offset + 3))
      ) {
        for (let i = 0; i < offset + 3; i++) {
          this.advance();
        }
        this.tokens.push(new Token(TokenType.IS_NOT, 'is not', startLine, startCol));
        return;
      }
    }

    if (name in KEYWORDS) {
      const type = KEYWORDS[name];
      this.tokens.push(new Token(type, name, startLine, startCol));
    } else {
      this.tokens.push(new Token(TokenType.IDENTIFIER, name, startLine, startCol));
    }
  }

  readDirective() {
    const startLine = this.line;
    const startCol = this.column;
    let directive = this.advance(); // @

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      directive += this.advance();
    }

    if (directive in DIRECTIVES) {
      const type = DIRECTIVES[directive];
      this.tokens.push(new Token(type, directive, startLine, startCol));
    } else {
      throw new LexerError(`Unknown directive '${directive}'`, startLine, startCol, new Token(TokenType.IDENTIFIER, directive, startLine, startCol));
    }
  }

  readOperatorOrPunctuation() {
    const startLine = this.line;
    const startCol = this.column;
    const char = this.advance();

    switch (char) {
      case '(': this.tokens.push(new Token(TokenType.LPAREN, '(', startLine, startCol)); break;
      case ')': this.tokens.push(new Token(TokenType.RPAREN, ')', startLine, startCol)); break;
      case '{': this.tokens.push(new Token(TokenType.LBRACE, '{', startLine, startCol)); break;
      case '}': this.tokens.push(new Token(TokenType.RBRACE, '}', startLine, startCol)); break;
      case '[': this.tokens.push(new Token(TokenType.LBRACKET, '[', startLine, startCol)); break;
      case ']': this.tokens.push(new Token(TokenType.RBRACKET, ']', startLine, startCol)); break;
      case ',': this.tokens.push(new Token(TokenType.COMMA, ',', startLine, startCol)); break;
      case ':': this.tokens.push(new Token(TokenType.COLON, ':', startLine, startCol)); break;
      case ';': this.tokens.push(new Token(TokenType.SEMICOLON, ';', startLine, startCol)); break;

      case '.':
        if (this.peek() === '.' && this.peekNext() === '.') {
          this.advance();
          this.advance();
          this.tokens.push(new Token(TokenType.SPREAD, '...', startLine, startCol));
        } else if (this.peek() === '.') {
          this.advance();
          this.tokens.push(new Token(TokenType.RANGE, '..', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.DOT, '.', startLine, startCol));
        }
        break;

      case '?':
        if (this.match('.')) {
          this.tokens.push(new Token(TokenType.OPTIONAL_CHAIN, '?.', startLine, startCol));
        } else if (this.match('?')) {
          this.tokens.push(new Token(TokenType.NULL_COALESCE, '??', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.QUESTION, '?', startLine, startCol));
        }
        break;

      case '+':
        if (this.match('+')) {
          this.tokens.push(new Token(TokenType.INCREMENT, '++', startLine, startCol));
        } else if (this.match('=')) {
          this.tokens.push(new Token(TokenType.PLUS_ASSIGN, '+=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.PLUS, '+', startLine, startCol));
        }
        break;

      case '-':
        if (this.match('-')) {
          this.tokens.push(new Token(TokenType.DECREMENT, '--', startLine, startCol));
        } else if (this.match('>')) {
          this.tokens.push(new Token(TokenType.ARROW, '->', startLine, startCol));
        } else if (this.match('=')) {
          this.tokens.push(new Token(TokenType.MINUS_ASSIGN, '-=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.MINUS, '-', startLine, startCol));
        }
        break;

      case '*':
        if (this.match('*')) {
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.EXPONENT_ASSIGN, '**=', startLine, startCol));
          } else {
            this.tokens.push(new Token(TokenType.EXPONENT, '**', startLine, startCol));
          }
        } else if (this.match('=')) {
          this.tokens.push(new Token(TokenType.MULTIPLY_ASSIGN, '*=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.MULTIPLY, '*', startLine, startCol));
        }
        break;

      case '/':
        if (this.match('=')) {
          this.tokens.push(new Token(TokenType.DIVIDE_ASSIGN, '/=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.DIVIDE, '/', startLine, startCol));
        }
        break;

      case '%':
        if (this.match('=')) {
          this.tokens.push(new Token(TokenType.MODULO_ASSIGN, '%=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.MODULO, '%', startLine, startCol));
        }
        break;

      case '=':
        if (this.match('=')) {
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.STRICT_EQUAL, '===', startLine, startCol));
          } else {
            this.tokens.push(new Token(TokenType.EQUAL, '==', startLine, startCol));
          }
        } else if (this.match('>')) {
          this.tokens.push(new Token(TokenType.ARROW, '=>', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.ASSIGN, '=', startLine, startCol));
        }
        break;

      case '!':
        if (this.match('=')) {
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.STRICT_NOT_EQUAL, '!==', startLine, startCol));
          } else {
            this.tokens.push(new Token(TokenType.NOT_EQUAL, '!=', startLine, startCol));
          }
        } else {
          this.tokens.push(new Token(TokenType.LOGICAL_NOT, '!', startLine, startCol));
        }
        break;

      case '<':
        if (this.match('=')) {
          this.tokens.push(new Token(TokenType.LESS_THAN_OR_EQUAL, '<=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.LESS_THAN, '<', startLine, startCol));
        }
        break;

      case '>':
        if (this.match('=')) {
          this.tokens.push(new Token(TokenType.GREATER_THAN_OR_EQUAL, '>=', startLine, startCol));
        } else {
          this.tokens.push(new Token(TokenType.GREATER_THAN, '>', startLine, startCol));
        }
        break;

      case '&':
        if (this.match('&')) {
          this.tokens.push(new Token(TokenType.LOGICAL_AND, '&&', startLine, startCol));
        } else {
          throw new LexerError("Bitwise '&' is not supported; use '&&' or 'and'", startLine, startCol);
        }
        break;

      case '|':
        if (this.match('>')) {
          this.tokens.push(new Token(TokenType.PIPELINE, '|>', startLine, startCol));
        } else if (this.match('|')) {
          this.tokens.push(new Token(TokenType.LOGICAL_OR, '||', startLine, startCol));
        } else {
          throw new LexerError("Bitwise '|' is not supported; use '||', 'or', or pipeline '|>'", startLine, startCol);
        }
        break;

      default:
        throw new LexerError(`Unexpected character '${char}'`, startLine, startCol);
    }
  }
}
