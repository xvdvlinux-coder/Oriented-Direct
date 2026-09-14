/**
 * Robust Parser for V8 C++ message-template.h
 * Handles whitespace, trailing backslashes, and multiline macros.
 */

import fs from 'node:fs';
import path from 'node:path';

const V8_HEADER_PATH = path.resolve(process.cwd(), 'MathL/docs/raw_sources/v8/message-template.h');
const OUT_PATH = path.resolve(process.cwd(), 'MathL/docs/v8_error_templates.json');

console.log('--- Parsing V8 C++ Message Templates ---\n');

const content = fs.readFileSync(V8_HEADER_PATH, 'utf-8');
const lines = content.split('\n');

const errorSections = {};
let currentCategory = 'Error';
let pendingEntry = null;

for (let i = 0; i < lines.length; i++) {
  // Strip trailing backslash and whitespace
  const line = lines[i].replace(/\\\s*$/, '').trim();
  if (!line) continue;

  const categoryMatch = line.match(/\/\*\s*([A-Za-z0-9_]+Error|[A-Za-z0-9_]+)\s*\*\//);
  if (categoryMatch) {
    currentCategory = categoryMatch[1];
    if (!errorSections[currentCategory]) {
      errorSections[currentCategory] = [];
    }
    continue;
  }

  if (!errorSections[currentCategory]) {
    errorSections[currentCategory] = [];
  }

  if (pendingEntry) {
    // Check if line contains the closing parenthesis of macro T(...)
    if (line.endsWith(')')) {
      const closingPart = line.slice(0, -1).trim();
      if (closingPart) pendingEntry.parts.push(closingPart);
      const combined = pendingEntry.parts
        .map(p => p.replace(/^"|"$/g, '').trim())
        .filter(Boolean)
        .join(' ');
      errorSections[pendingEntry.category].push({
        id: pendingEntry.id,
        category: pendingEntry.category,
        format: combined
      });
      pendingEntry = null;
    } else {
      pendingEntry.parts.push(line);
    }
    continue;
  }

  const startMatch = line.match(/^T\(([A-Za-z0-9_]+),\s*(.*)$/);
  if (startMatch) {
    const name = startMatch[1];
    let rest = startMatch[2].trim();

    if (rest.endsWith(')')) {
      const msg = rest.slice(0, -1).trim().replace(/^"|"$/g, '');
      errorSections[currentCategory].push({
        id: name,
        category: currentCategory,
        format: msg
      });
    } else {
      pendingEntry = { id: name, category: currentCategory, parts: [rest] };
    }
  }
}

let totalCount = 0;
for (const [cat, list] of Object.entries(errorSections)) {
  totalCount += list.length;
  console.log(`Extracted ${list.length} V8 templates for: ${cat}`);
}

const output = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  source: 'v8/src/common/message-template.h',
  totalTemplates: totalCount,
  categories: errorSections
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
console.log(`\nSuccessfully generated: MathL/docs/v8_error_templates.json (${(fs.statSync(OUT_PATH).size / 1024).toFixed(2)} KB, ${totalCount} templates total)`);
