import fs from 'node:fs';

const p = 'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/config/constants.osp';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf-8');
  if (!s.includes('WATERFALL_SIZES')) {
    s += `\nexport val WATERFALL_SIZES = [12, 16, 20, 24, 32, 40, 48, 64];\n`;
  }
  if (!s.includes('GLYPH_SETS')) {
    s += `\nexport val GLYPH_SETS = {
  "uppercase": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "lowercase": "abcdefghijklmnopqrstuvwxyz",
  "numbers": "0123456789",
  "extendedLatin": "ÁÉÍÓÚÑáéíóúñÜüÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÄËÏÖäëïö",
  "symbols": "!\\\"#$%&'()*+,-./:;<=>?@[\\\\]^_\`{|}~"
};\n`;
  }
  fs.writeFileSync(p, s, 'utf-8');
  console.log('Successfully updated constants.osp with WATERFALL_SIZES and GLYPH_SETS');
} else {
  console.log('File not found:', p);
}
