/**
 * Script to fetch official JavaScript engine source files (V8 / Chromium / Node.js)
 * Downloads C++ error templates and exception dispatch definitions into MathL/docs/raw_sources/v8/
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = path.resolve(process.cwd(), 'MathL/docs/raw_sources/v8');
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

console.log('--- Downloading Official V8 JavaScript Engine Source Files ---\n');

const V8_SOURCES = [
  {
    name: 'V8 C++ Message Template Definitions (Error Codes & Strings)',
    file: 'message-template.h',
    urls: [
      'https://raw.githubusercontent.com/v8/v8/main/src/common/message-template.h',
      'https://raw.githubusercontent.com/nodejs/node/main/deps/v8/src/common/message-template.h'
    ]
  },
  {
    name: 'V8 C++ Exception Message Formatting',
    file: 'messages.cc',
    urls: [
      'https://raw.githubusercontent.com/v8/v8/main/src/execution/messages.cc',
      'https://raw.githubusercontent.com/nodejs/node/main/deps/v8/src/execution/messages.cc'
    ]
  },
  {
    name: 'QuickJS Core Runtime Error Header',
    file: 'quickjs_errors.h',
    urls: [
      'https://raw.githubusercontent.com/bellard/quickjs/master/quickjs.h'
    ]
  }
];

async function fetchFromUrls(source) {
  console.log(`Downloading: ${source.name}...`);
  for (const url of source.urls) {
    try {
      console.log(`  Trying URL: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const content = await res.text();
        const destPath = path.join(TARGET_DIR, source.file);
        fs.writeFileSync(destPath, content, 'utf-8');
        const sizeKb = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(2);
        console.log(`  Saved: ${source.file} (${sizeKb} KB, ${content.split('\n').length} lines)\n`);
        return true;
      } else {
        console.log(`  HTTP status ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.log(`  Network attempt failed for ${url}: ${err.message}`);
    }
  }
  return false;
}

for (const src of V8_SOURCES) {
  const success = await fetchFromUrls(src);
  if (!success) {
    console.error(`Failed to download ${src.name} from all available endpoints.`);
  }
}

console.log('Finished downloading JavaScript engine sources.');
