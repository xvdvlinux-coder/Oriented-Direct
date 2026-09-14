import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../src/index.js';
import { SafetyAnalyzerPrototype } from '../src/safety_analyzer_prototype.js';

const dir = 'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src';

function scan(d) {
  for (const f of fs.readdirSync(d)) {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (f.endsWith('.osp')) {
      const code = fs.readFileSync(full, 'utf-8');
      const ast = parse(code);
      const analyzer = new SafetyAnalyzerPrototype();
      const res = analyzer.analyze(ast);
      console.log(`File: ${path.relative(dir, full)} -> Valid: ${res.isValid}, Diagnostics: ${res.diagnostics.length}`);
      if (!res.isValid) {
        for (const diag of res.diagnostics) {
          console.log(`   [Diagnostic] L${diag.line}:C${diag.col} - ${diag.message}`);
        }
      }
    }
  }
}

scan(dir);
