import fs from 'node:fs';

const p = 'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/components/glyphGrid.osp';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf-8');
  s = s.replace(/(\s)(class|type|title|style|id):/g, '$1"$2":');
  s = s.replace('else if (filterKey in GLYPH_SETS)', 'else if (GLYPH_SETS[filterKey])');
  s = s.replace('Array.from(', 'Array["from"](');
  s = s.replace('.toString(16)', '["toString"](16)');
  fs.writeFileSync(p, s, 'utf-8');
  console.log('Successfully formatted glyphGrid.osp');
}
