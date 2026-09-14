/**
 * Oriented-Direct (ospc) Safety Subsystem - Compiler Diagnostic Formatter
 * Produces high-precision Rust/Clang-style terminal diagnostics with line/column gutters,
 * multi-column caret underlines (^^^^), secondary annotations, and source map resolution.
 * Version: 2.0.0 (ClandleLoop)
 * Strictly zero emojis.
 */

export const DiagnosticLevel = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  NOTE: 'note',
  HELP: 'help'
});

export class SourceSpan {
  constructor(line, startCol, endCol, label = '') {
    this.line = line;         // 1-indexed
    this.startCol = startCol; // 1-indexed
    this.endCol = endCol;     // 1-indexed
    this.label = label;
  }
}

export class DiagnosticFormatter {
  /**
   * Format a single compiler diagnostic into Rust/Clang terminal output
   * @param {object} params
   * @param {string} params.code - Error code (e.g. 'E0001', 'E0040')
   * @param {string} [params.level='error'] - Diagnostic severity level
   * @param {string} params.message - Descriptive error message
   * @param {string} [params.file='<anonymous>'] - Source file path
   * @param {string} [params.sourceContent=''] - Raw source code content
   * @param {SourceSpan} params.span - Source span coordinate and optional inline label
   * @param {string[]} [params.notes=[]] - Secondary notes and axiomatic references
   * @param {string[]} [params.hints=[]] - Actionable compiler hints
   * @returns {string} Formatted terminal diagnostic
   */
  static format({
    code = 'E0001',
    level = DiagnosticLevel.ERROR,
    message,
    file = '<anonymous>',
    sourceContent = '',
    span,
    notes = [],
    hints = []
  }) {
    const lines = (sourceContent || '').split(/\r?\n/);
    const lineNum = span ? span.line : 1;
    const lineIndex = lineNum - 1;
    const targetLine = lines[lineIndex] !== undefined ? lines[lineIndex] : '';

    // Calculate gutter padding based on line number digits
    const lineNumStr = String(lineNum);
    const gutterPadding = ' '.repeat(lineNumStr.length);

    let output = '';

    // 1. Header: [error[E0040]]: Cannot destructure nullable value
    output += `[${level}[${code}]]: ${message}\n`;

    // 2. File Location Pointer: --> file.osp:14:9
    const startCol = span ? span.startCol : 1;
    const endCol = span ? (span.endCol >= span.startCol ? span.endCol : span.startCol) : 1;
    output += `  --> ${file}:${lineNum}:${startCol}\n`;

    // 3. Top frame line
    output += `${gutterPadding} |\n`;

    // 4. Source code line with gutter
    output += `${lineNumStr} | ${targetLine}\n`;

    // 5. Caret Underline & Span Annotation
    const caretPadding = ' '.repeat(Math.max(0, startCol - 1));
    const caretLength = Math.max(1, endCol - startCol + 1);
    const carets = '^'.repeat(caretLength);
    const labelSuffix = (span && span.label) ? ` ${span.label}` : '';
    output += `${gutterPadding} | ${caretPadding}${carets}${labelSuffix}\n`;

    // 6. Lower frame delimiter
    output += `${gutterPadding} |\n`;

    // 7. Additional Notes
    for (const note of (notes || [])) {
      output += `  = note: ${note}\n`;
    }

    // 8. Actionable Hints
    for (const hint of (hints || [])) {
      output += `  = hint: ${hint}\n`;
    }

    return output;
  }

  /**
   * Format multiple diagnostics joined together
   * @param {Array<object>} diagnostics
   * @param {string} sourceContent
   * @param {string} file
   * @returns {string}
   */
  static formatAll(diagnostics, sourceContent = '', file = '<anonymous>') {
    if (!diagnostics || diagnostics.length === 0) return '';
    return diagnostics.map(d => {
      const line = d.line || (d.span ? d.span.line : 1);
      const startCol = d.col || d.column || (d.span ? d.span.startCol : 1);
      const endCol = d.endCol || (d.span ? d.span.endCol : startCol);
      const label = d.label || (d.span ? d.span.label : '');
      const span = d.span || new SourceSpan(line, startCol, endCol, label);

      const notes = [
        ...(d.rule ? [`Axiom Invariant: ${d.rule}`] : []),
        ...(d.notes || [])
      ];

      return DiagnosticFormatter.format({
        code: d.code || 'E0001',
        level: d.level || DiagnosticLevel.ERROR,
        message: d.message,
        file: d.file || file,
        sourceContent: d.sourceContent || sourceContent,
        span,
        notes,
        hints: d.hints || []
      });
    }).join('\n');
  }

  /**
   * Verify that text contains strictly no emojis
   * @param {string} text
   * @returns {boolean}
   */
  static verifyNoEmojis(text) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    return !emojiRegex.test(text);
  }

  /**
   * Resolve generated position to source map location
   * @param {number} generatedLine
   * @param {number} generatedCol
   * @param {Array<object>} mappings
   * @returns {{ file: string, line: number, col: number }}
   */
  static resolveSourceMapPosition(generatedLine, generatedCol, mappings) {
    const match = (mappings || []).find(m => m.genLine === generatedLine && m.genCol <= generatedCol);
    if (match) {
      return {
        file: match.sourceFile,
        line: match.sourceLine,
        col: match.sourceCol + (generatedCol - match.genCol)
      };
    }
    return {
      file: 'unknown',
      line: generatedLine,
      col: generatedCol
    };
  }
}

// Backward-compatible alias
export const CompilerDiagnosticFormatter = DiagnosticFormatter;
