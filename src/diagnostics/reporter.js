/**
 * Oriented-Direct (.osp) Visual Diagnostic & Error Reporter
 * Produces clean, compiler-grade visual errors with line excerpts and caret markers.
 */

export class DiagnosticReporter {
  /**
   * Format a compiler error with source excerpt and caret marker
   * @param {Error} error - The caught error
   * @param {string} source - The original source code
   * @param {string} filename - Source filename
   * @returns {string} Formatted error message
   */
  static formatError(error, source = '', filename = '<anonymous>') {
    const line = error.line || (error.token ? error.token.line : 1);
    const col = error.column || (error.token ? error.token.column : 1);
    const rawMessage = error.rawMessage || error.message || 'Syntax error';
    const help = error.help || DiagnosticReporter.inferHelp(rawMessage, error.token);

    const lines = source.split(/\r?\n/);
    const lineIndex = line - 1;
    const errorLine = lines[lineIndex] !== undefined ? lines[lineIndex] : '';

    const lineNumStr = String(line);
    const padding = ' '.repeat(Math.max(lineNumStr.length, 3));
    const tokenLength = (error.token && error.token.value) ? error.token.value.length : 1;
    const caretPadding = ' '.repeat(Math.max(0, col - 1));
    const carets = '^'.repeat(Math.max(1, tokenLength));

    let output = `\n\x1b[1;31merror\x1b[0m: \x1b[1m${rawMessage}\x1b[0m\n`;
    output += `  \x1b[1;34m-->\x1b[0m ${filename}:${line}:${col}\n`;
    output += `   \x1b[1;34m${padding}|\x1b[0m\n`;

    // Show previous line for context if available
    if (lineIndex > 0 && lines[lineIndex - 1] !== undefined) {
      const prevNumStr = String(line - 1).padStart(padding.length, ' ');
      output += `\x1b[1;34m${prevNumStr} |\x1b[0m ${lines[lineIndex - 1]}\n`;
    }

    // Current line with error
    const curNumStr = lineNumStr.padStart(padding.length, ' ');
    output += `\x1b[1;34m${curNumStr} |\x1b[0m ${errorLine}\n`;

    // Carets
    output += `   \x1b[1;34m${padding}|\x1b[0m ${caretPadding}\x1b[1;31m${carets}\x1b[0m\n`;

    // Help suggestion
    if (help) {
      output += `   \x1b[1;34m${padding}|\x1b[0m \x1b[1;32mhelp:\x1b[0m ${help}\n`;
    }

    output += `   \x1b[1;34m${padding}|\x1b[0m\n`;
    return output;
  }

  static inferHelp(message, token) {
    if (!token) return null;
    const val = token.value || '';

    if (val === 'info' || val === 'log' || val === 'warn' || val === 'error') {
      return `for console logging, use '@${val}(...)' or use standard variable name`;
    }
    if (val === 'var') {
      return `use 'val' for immutable constants or 'mut' for mutable variables`;
    }
    if (val === 'function') {
      return `use 'fn' keyword to declare functions in Oriented-Direct`;
    }
    if (val === 'document') {
      return `use direct directive '@doc' or '@find(...)', '@id(...)', '@all(...)'`;
    }
    if (val === 'window') {
      return `use direct directive '@win'`;
    }
    if (val === 'addEventListener') {
      return `use direct directive '@on(target, event, handler)'`;
    }
    return null;
  }
}
