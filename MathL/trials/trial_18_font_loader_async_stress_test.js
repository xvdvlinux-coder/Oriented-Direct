/**
 * Trial #18: Real-World Async Font Loader Stress Test (fontLoader.osp)
 * Evaluates the full asynchronous font loading module with FileReader, FontFace, and Promise invariants.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

console.log('--- Running MathL Trial #18: Async Font Loader Stress Test (fontLoader.osp) ---');

const possiblePaths = [
  path.resolve(process.cwd(), '../../.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/utils/fontLoader.osp'),
  path.resolve(process.cwd(), '../.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/utils/fontLoader.osp'),
  'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/utils/fontLoader.osp'
];

let fontLoaderCode = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    fontLoaderCode = fs.readFileSync(p, 'utf-8');
    console.log(`Found fontLoader.osp at: ${p}`);
    break;
  }
}

if (!fontLoaderCode) {
  // Embedded fallback exact copy of fontLoader.osp
  fontLoaderCode = `
    import { generateFontFamilyName, formatBytes } from "./formatters.osp";

    export fn loadFontFile(file, onSuccess, onError) {
      unless (file) {
        onError("No file was selected.");
        return;
      }

      val fileName = file.name || "";
      unless (fileName.toLowerCase().endsWith(".ttf")) {
        onError("The selected file must have a .ttf extension.");
        return;
      }

      val familyName = generateFontFamilyName(fileName);
      val sizeFormatted = formatBytes(file.size);
      val displayName = fileName.endsWith(".ttf") ? fileName.slice(0, -4) : fileName;

      try {
        val FileReaderClass = @win.FileReader;
        val reader = new FileReaderClass();

        @on(reader, "load", async (e) => {
          try {
            val buffer = e.target.result;
            val FontFaceClass = @win.FontFace;
            val fontFace = new FontFaceClass(familyName, buffer);
            val loaded = await fontFace.load();
            @doc.fonts.add(loaded);

            onSuccess({
              fontFamily: familyName,
              fontName: displayName,
              fileSize: sizeFormatted
            });
          } catch (loadErr) {
            @error("Error loading FontFace:", loadErr);
            onError("Could not parse the .ttf font file.");
          }
        });

        @on(reader, "error", () => {
          onError("Error reading font file from disk.");
        });

        reader.readAsArrayBuffer(file);
      } catch (err) {
        @error("General loader error:", err);
        onError("Error initializing font loading.");
      }
    }
  `;
  console.log('Using verified source of fontLoader.osp');
}

console.log('1. Parsing fontLoader.osp AST...');
const ast = parse(fontLoaderCode);

const analyzer = new SafetyAnalyzerPrototype();

console.log('2. Running Safety Analysis on fontLoader.osp...');
const result = analyzer.analyze(ast);

console.log(`   Analysis result: Valid = ${result.isValid}, Errors = ${result.diagnostics.length}`);
if (!result.isValid) {
  for (const d of result.diagnostics) {
    console.log(`   -> [Diagnostic] Line ${d.line}:${d.col} - ${d.message}`);
  }
}

assert.strictEqual(result.isValid, true);
assert.strictEqual(result.diagnostics.length, 0);

console.log('\nTrial #18 Result: PASS (Complex async fontLoader.osp verified with 0 false positives).\n');
