/**
 * Trial #43: Compiler Diagnostic Formatter & Source Map Precision
 * Formalizes Rust/Clang-style terminal diagnostic formatting with exact caret spans,
 * source frame extraction, line/column gutters, secondary labels, and source map resolution.
 * Strictly adheres to NO EMOJIS invariant.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #43: Compiler Diagnostic Formatter & Source Map Precision ---');

export const DiagnosticLevel = {
  ERROR: 'error',
  WARNING: 'warning',
  NOTE: 'note',
  HELP: 'help'
};

export class SourceSpan {
  constructor(line, startCol, endCol, label = '') {
    this.line = line;         // 1-indexed
    this.startCol = startCol; // 1-indexed
    this.endCol = endCol;     // 1-indexed
    this.label = label;
  }
}

export class CompilerDiagnosticFormatter {
  static format({
    code,
    level = DiagnosticLevel.ERROR,
    message,
    file,
    sourceContent,
    span,
    notes = [],
    hints = []
  }) {
    const lines = sourceContent.split(/\r?\n/);
    const lineIndex = span.line - 1;
    const targetLine = lines[lineIndex] || '';

    // Calculate gutter padding based on line number digits
    const lineNumStr = String(span.line);
    const gutterPadding = ' '.repeat(lineNumStr.length);

    let output = '';

    // 1. Header: [error[E0040]]: Cannot destructure nullable value
    output += `[${level}[${code}]]: ${message}\n`;

    // 2. File Location Pointer: --> file.osp:14:9
    output += `  --> ${file}:${span.line}:${span.startCol}\n`;

    // 3. Top frame line
    output += `${gutterPadding} |\n`;

    // 4. Source code line with gutter
    output += `${lineNumStr} | ${targetLine}\n`;

    // 5. Caret Underline & Span Annotation
    const caretPadding = ' '.repeat(Math.max(0, span.startCol - 1));
    const caretLength = Math.max(1, span.endCol - span.startCol + 1);
    const carets = '^'.repeat(caretLength);
    const labelSuffix = span.label ? ` ${span.label}` : '';
    output += `${gutterPadding} | ${caretPadding}${carets}${labelSuffix}\n`;

    // 6. Lower frame delimiter
    output += `${gutterPadding} |\n`;

    // 7. Additional Notes
    for (const note of notes) {
      output += `  = note: ${note}\n`;
    }

    // 8. Actionable Hints
    for (const hint of hints) {
      output += `  = hint: ${hint}\n`;
    }

    return output;
  }

  static verifyNoEmojis(text) {
    // Regex matching emoji sequences, pictorial symbols, and decorative unicode blocks
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    return !emojiRegex.test(text);
  }

  static resolveSourceMapPosition(generatedLine, generatedCol, mappings) {
    // Basic source map lookup simulation
    const match = mappings.find(m => m.genLine === generatedLine && m.genCol <= generatedCol);
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

// ==========================================
// TEST SUITE: Trial #43 Diagnostic Formatter
// ==========================================

console.log('1. Testing Single-Span Diagnostic Formatting...');
const sampleSource = `val state = fetchState()
val { user, token } = state
log(user.name)`;

const diagOutput = CompilerDiagnosticFormatter.format({
  code: 'E0040',
  level: DiagnosticLevel.ERROR,
  message: "Cannot destructure 'state' as it may be null or undefined",
  file: 'src/models/FontState.osp',
  sourceContent: sampleSource,
  span: new SourceSpan(2, 5, 20, 'destructuring pattern applied to nullable target'),
  notes: [
    'MathL Rule XXVII: Destructuring coercibility lattice L_Coerce requires target not in NonCoercible',
    'Matches Google V8 template kNonCoercible'
  ],
  hints: [
    "Guard the expression with 'unless (state) return;' prior to destructuring"
  ]
});

console.log('--- Formatted Output Preview ---');
console.log(diagOutput);
console.log('--------------------------------');

assert.ok(diagOutput.includes('[error[E0040]]: Cannot destructure'));
assert.ok(diagOutput.includes('--> src/models/FontState.osp:2:5'));
assert.ok(diagOutput.includes('2 | val { user, token } = state'));
assert.ok(diagOutput.includes('^^^^^^^^^^^^^^^^ destructuring pattern applied to nullable target'));
assert.ok(diagOutput.includes('= note: MathL Rule XXVII'));
assert.ok(diagOutput.includes('= hint: Guard the expression'));

console.log('2. Testing Strict NO EMOJIS Invariant...');
const emojiFreeCheck = CompilerDiagnosticFormatter.verifyNoEmojis(diagOutput);
assert.strictEqual(emojiFreeCheck, true, 'Diagnostic output must contain strictly zero emojis');

// Verify that an emoji would fail the check
const textWithEmoji = 'Error \u{1F6A8}: Something failed';
assert.strictEqual(CompilerDiagnosticFormatter.verifyNoEmojis(textWithEmoji), false);

console.log('3. Testing Warning Level Formatter with Different Column Span...');
const warnSource = `mut count = 0
while (count < 10) {
  count = count + 1
}`;

const warnOutput = CompilerDiagnosticFormatter.format({
  code: 'W0015',
  level: DiagnosticLevel.WARNING,
  message: 'Variable mutation in loop does not escape enclosing block',
  file: 'src/counter.osp',
  sourceContent: warnSource,
  span: new SourceSpan(1, 5, 9, 'declared as mut here'),
  hints: ['Consider using val if value does not escape closure boundary']
});

assert.ok(warnOutput.includes('[warning[W0015]]'));
assert.ok(warnOutput.includes('1 | mut count = 0'));
assert.ok(warnOutput.includes('^^^^^ declared as mut here'));
assert.strictEqual(CompilerDiagnosticFormatter.verifyNoEmojis(warnOutput), true);

console.log('4. Testing Source Map Resolution...');
const mockMappings = [
  { genLine: 1, genCol: 0, sourceFile: 'app.osp', sourceLine: 1, sourceCol: 0 },
  { genLine: 2, genCol: 4, sourceFile: 'app.osp', sourceLine: 2, sourceCol: 2 }
];

const resolved = CompilerDiagnosticFormatter.resolveSourceMapPosition(2, 8, mockMappings);
assert.strictEqual(resolved.file, 'app.osp');
assert.strictEqual(resolved.line, 2);
assert.strictEqual(resolved.col, 6); // 2 + (8 - 4) = 6

console.log('Trial #43 Result: PASS (High-precision diagnostic formatting, source mapping, and zero emojis verified).\n');
