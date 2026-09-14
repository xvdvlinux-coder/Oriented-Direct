import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../src/index.js';

const dir = 'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src';

function scan(d) {
  for (const f of fs.readdirSync(d)) {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (f.endsWith('.osp')) {
      try {
        const code = fs.readFileSync(full, 'utf-8');
        parse(code);
        console.log('PASS parse:', path.relative(dir, full));
      } catch (e) {
        console.log('FAIL parse:', path.relative(dir, full), e.message);
      }
    }
  }
}

scan(dir);
