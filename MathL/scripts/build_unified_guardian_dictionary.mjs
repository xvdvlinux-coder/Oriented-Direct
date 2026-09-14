/**
 * Builder for the Unified Dual-Language Guardian Dictionary (J x O)
 * Combines JavaScript (ECMAScript + Web APIs) with Oriented-Direct into a single guardian catalog.
 */

import fs from 'node:fs';
import path from 'node:path';

const DOCS_DIR = path.resolve(process.cwd(), 'MathL/docs');

console.log('--- Building MathL Unified Dual-Language Guardian Dictionary (J x O) ---\n');

const jsDict = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'javascript_global_dictionary.json'), 'utf-8'));
const webDict = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'web_apis_dom_dictionary.json'), 'utf-8'));
const odDict = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'oriented_direct_syntax_dictionary.json'), 'utf-8'));

const unifiedGuardian = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  name: 'MathL Unified Dual-Language Guardian Catalog (J x O)',
  version: '1.0.0',
  description: 'Integrated semantic rules, interfaces, and invariants covering both JavaScript and Oriented-Direct domains without exception.',
  domains: {
    orientedDirect: {
      version: odDict.version,
      keywords: odDict.keywords,
      operators: odDict.operators,
      directives: odDict.directives
    },
    ecmascript: {
      source: jsDict.source,
      interfaceCount: jsDict.interfaceCount,
      interfaces: jsDict.interfaces
    },
    webApis: {
      source: webDict.source,
      interfaceCount: webDict.interfaceCount,
      interfaces: webDict.interfaces
    }
  },
  statistics: {
    totalEcmascriptInterfaces: jsDict.interfaceCount,
    totalWebApiInterfaces: webDict.interfaceCount,
    totalOrientedDirectDirectives: Object.keys(odDict.directives).length,
    totalOrientedDirectKeywords: Object.keys(odDict.keywords).length,
    totalOrientedDirectOperators: Object.keys(odDict.operators).length,
    totalUnifiedSymbolsTracked: jsDict.interfaceCount + webDict.interfaceCount + Object.keys(odDict.directives).length + Object.keys(odDict.keywords).length
  }
};

const outPath = path.join(DOCS_DIR, 'unified_guardian_dictionary.json');
fs.writeFileSync(outPath, JSON.stringify(unifiedGuardian, null, 2), 'utf-8');

const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log(`Successfully generated: MathL/docs/unified_guardian_dictionary.json (${sizeMb} MB)`);
console.log(`Total Unified Symbols Tracked: ${unifiedGuardian.statistics.totalUnifiedSymbolsTracked}`);
console.log(`- Oriented-Direct Keywords & Directives: ${unifiedGuardian.statistics.totalOrientedDirectKeywords + unifiedGuardian.statistics.totalOrientedDirectDirectives}`);
console.log(`- ECMAScript Interfaces: ${unifiedGuardian.statistics.totalEcmascriptInterfaces}`);
console.log(`- Web API & DOM Interfaces: ${unifiedGuardian.statistics.totalWebApiInterfaces}`);
