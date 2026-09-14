/**
 * Script to fetch and download the complete ECMAScript and Web API standard documentation
 * directly from official internet CDNs & repositories (TypeScript Standard Library & MDN Browser Compat / Specs).
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = path.resolve(process.cwd(), 'MathL/docs/raw_sources');
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

console.log('--- Downloading Official JavaScript & Web API Specifications from the Internet ---\n');

const SOURCES = [
  {
    name: 'ECMAScript Core (ES5) Standard Specification Library',
    file: 'lib.es5.d.ts',
    url: 'https://cdn.jsdelivr.net/npm/typescript@latest/lib/lib.es5.d.ts'
  },
  {
    name: 'ECMAScript Modern (ES2022) Standard Specification Library',
    file: 'lib.es2022.full.d.ts',
    url: 'https://cdn.jsdelivr.net/npm/typescript@latest/lib/lib.es2022.full.d.ts'
  },
  {
    name: 'W3C / WHATWG DOM & Web APIs Formal Interface Definitions (Web IDL)',
    file: 'lib.dom.d.ts',
    url: 'https://cdn.jsdelivr.net/npm/typescript@latest/lib/lib.dom.d.ts'
  },
  {
    name: 'MDN Web Docs Official Browser Compatibility & API Schema Data',
    file: 'mdn_browser_compat_data.json',
    url: 'https://cdn.jsdelivr.net/npm/@mdn/browser-compat-data@latest/data.json'
  }
];

async function downloadSource(source) {
  console.log(`Downloading: ${source.name}...`);
  console.log(`  Source URL: ${source.url}`);
  try {
    const res = await fetch(source.url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }
    const content = await res.text();
    const destPath = path.join(TARGET_DIR, source.file);
    fs.writeFileSync(destPath, content, 'utf-8');
    const sizeKb = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(2);
    console.log(`  Saved to: MathL/docs/raw_sources/${source.file} (${sizeKb} KB, ${content.split('\n').length} lines)\n`);
  } catch (err) {
    console.error(`  Error downloading ${source.name}:`, err.message);
  }
}

for (const src of SOURCES) {
  await downloadSource(src);
}

console.log('Finished downloading all official documentation.');
