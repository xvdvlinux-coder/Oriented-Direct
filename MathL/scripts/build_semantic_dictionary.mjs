/**
 * Parser with Interface Merging and Generic Method Support for TypeScript .d.ts files
 */

import fs from 'node:fs';
import path from 'node:path';

const RAW_DIR = path.resolve(process.cwd(), 'MathL/docs/raw_sources');
const OUT_DIR = path.resolve(process.cwd(), 'MathL/docs');

console.log('--- Generating MathL Semantic Dictionaries with Full Generic Method Support ---\n');

const es5Content = fs.readFileSync(path.join(RAW_DIR, 'lib.es5.d.ts'), 'utf-8');
const domContent = fs.readFileSync(path.join(RAW_DIR, 'lib.dom.d.ts'), 'utf-8');

function extractMergedInterfaces(dtsContent) {
  const interfaces = {};
  const interfaceRegex = /interface\s+([A-Za-z0-9_]+)(?:<[^>]+>)?(?:\s+extends\s+([A-Za-z0-9_,\s<>]+))?\s*\{([^}]+)\}/g;
  let match;

  while ((match = interfaceRegex.exec(dtsContent)) !== null) {
    const name = match[1];
    const extendsClause = match[2]
      ? match[2].split(',').map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
      : [];
    const body = match[3];

    if (!interfaces[name]) {
      interfaces[name] = {
        extends: new Set(),
        properties: {},
        methods: {}
      };
    }

    for (const ext of extendsClause) {
      interfaces[name].extends.add(ext);
    }

    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Method: methodName<Generics>(param: Type, ...): ReturnType;
      const methodMatch = /^([A-Za-z0-9_]+)(?:<[^>]+>)?\((.*?)\):\s*([^;]+);/.exec(line);
      if (methodMatch) {
        const methodName = methodMatch[1];
        const params = methodMatch[2] ? methodMatch[2].split(',').map(p => p.trim()) : [];
        const returns = methodMatch[3].trim();
        interfaces[name].methods[methodName] = { params, returns };
        continue;
      }

      // Property: propName: Type;
      const propMatch = /^(readonly\s+)?([A-Za-z0-9_]+)(\?)?:\s*([^;]+);/.exec(line);
      if (propMatch) {
        const isReadonly = Boolean(propMatch[1]);
        const propName = propMatch[2];
        const isOptional = Boolean(propMatch[3]);
        const propType = propMatch[4].trim();
        interfaces[name].properties[propName] = { type: propType, readonly: isReadonly, optional: isOptional };
      }
    }
  }

  const result = {};
  for (const [k, v] of Object.entries(interfaces)) {
    result[k] = {
      extends: Array.from(v.extends),
      properties: v.properties,
      methods: v.methods
    };
  }

  return result;
}

const jsGlobals = extractMergedInterfaces(es5Content);
const webApis = extractMergedInterfaces(domContent);

console.log(`Parsed ${Object.keys(jsGlobals).length} ECMAScript standard interfaces from lib.es5.d.ts.`);
console.log(`Parsed ${Object.keys(webApis).length} Web API / DOM interfaces from lib.dom.d.ts.`);

const jsDictOutput = {
  source: 'Official ECMAScript Standard Specification (lib.es5.d.ts)',
  interfaceCount: Object.keys(jsGlobals).length,
  interfaces: jsGlobals
};

const webDictOutput = {
  source: 'Official W3C / WHATWG Web IDL Specification (lib.dom.d.ts)',
  interfaceCount: Object.keys(webApis).length,
  interfaces: webApis
};

fs.writeFileSync(path.join(OUT_DIR, 'javascript_global_dictionary.json'), JSON.stringify(jsDictOutput, null, 2), 'utf-8');
fs.writeFileSync(path.join(OUT_DIR, 'web_apis_dom_dictionary.json'), JSON.stringify(webDictOutput, null, 2), 'utf-8');

console.log(`\nUpdated MathL/docs/javascript_global_dictionary.json (${(fs.statSync(path.join(OUT_DIR, 'javascript_global_dictionary.json')).size / 1024).toFixed(2)} KB)`);
console.log(`Updated MathL/docs/web_apis_dom_dictionary.json (${(fs.statSync(path.join(OUT_DIR, 'web_apis_dom_dictionary.json')).size / 1024).toFixed(2)} KB)`);
