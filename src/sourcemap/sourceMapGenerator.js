/**
 * High-Precision Source Map v3 Generator for Oriented-Direct (.osp)
 * Supports differential delta compression, sourcesContent embedding, and data URI export.
 * Zero external dependencies.
 */

import { encodeVlq, decodeVlq } from './vlq.js';

export class SourceMapGenerator {
  constructor(options = {}) {
    this.file = options.file || '';
    this.sourceRoot = options.sourceRoot || '';
    this.sources = [];
    this.sourcesContent = [];
    this.sourceIndexMap = new Map();
    this.names = [];
    this.nameIndexMap = new Map();

    // Internal mapping lines: array of arrays of mapping segments
    // mappingsByLine[genLine0Indexed] = [ { genCol, sourceIndex, origLine, origCol, nameIndex } ]
    this.mappingsByLine = [];
  }

  /**
   * Register a source file path and optional source content
   * @param {string} sourcePath - Path to .osp source file
   * @param {string|null} content - Optional original source code
   * @returns {number} Source index
   */
  addSource(sourcePath, content = null) {
    if (!this.sourceIndexMap.has(sourcePath)) {
      const idx = this.sources.length;
      this.sources.push(sourcePath);
      this.sourcesContent.push(content);
      this.sourceIndexMap.set(sourcePath, idx);
      return idx;
    }
    const idx = this.sourceIndexMap.get(sourcePath);
    if (content !== null && this.sourcesContent[idx] === null) {
      this.sourcesContent[idx] = content;
    }
    return idx;
  }

  /**
   * Set or update source content for an existing or new source file
   * @param {string} sourcePath - Path to .osp source file
   * @param {string} content - Original source code
   */
  setSourceContent(sourcePath, content) {
    this.addSource(sourcePath, content);
  }

  /**
   * Register a symbol name in the names array
   * @param {string} name - Identifier name
   * @returns {number} Name index
   */
  addName(name) {
    if (!this.nameIndexMap.has(name)) {
      const idx = this.names.length;
      this.names.push(name);
      this.nameIndexMap.set(name, idx);
      return idx;
    }
    return this.nameIndexMap.get(name);
  }

  /**
   * Add a coordinate mapping point between generated JS and original .osp
   * @param {object} mapping
   * @param {{ line: number, column: number }} mapping.generated - Generated line (1-based) & column (0-based)
   * @param {{ line: number, column: number }} [mapping.original] - Original line (1-based) & column (0-based)
   * @param {string} [mapping.source] - Path to original source file
   * @param {string} [mapping.name] - Optional original identifier name
   */
  addMapping(mapping) {
    const genLine = mapping.generated.line - 1; // Convert 1-based to 0-based index
    const genCol = mapping.generated.column;

    if (!this.mappingsByLine[genLine]) {
      this.mappingsByLine[genLine] = [];
    }

    let sourceIndex = null;
    let origLine = null;
    let origCol = null;
    let nameIndex = null;

    if (mapping.original && mapping.source) {
      sourceIndex = this.addSource(mapping.source);
      origLine = mapping.original.line - 1; // Convert 1-based to 0-based index
      origCol = mapping.original.column; // 0-based

      if (mapping.name) {
        nameIndex = this.addName(mapping.name);
      }
    }

    this.mappingsByLine[genLine].push({
      genCol,
      sourceIndex,
      origLine,
      origCol,
      nameIndex
    });
  }

  /**
   * Serialize mappings into standard Base64-VLQ with delta encoding
   * @returns {string} Semicolon-delimited, comma-delimited VLQ string
   */
  serializeMappings() {
    let prevSourceIndex = 0;
    let prevOrigLine = 0;
    let prevOrigCol = 0;
    let prevNameIndex = 0;

    const lineStrings = [];
    const maxLine = this.mappingsByLine.length;

    for (let lineIdx = 0; lineIdx < maxLine; lineIdx++) {
      const segments = this.mappingsByLine[lineIdx] || [];
      // Sort segments on this line by generated column in ascending order
      segments.sort((a, b) => a.genCol - b.genCol);

      let prevGenCol = 0;
      const segmentStrings = [];

      for (const seg of segments) {
        let segStr = '';
        // 1. Delta GenCol (resets to 0 at start of line)
        segStr += encodeVlq(seg.genCol - prevGenCol);
        prevGenCol = seg.genCol;

        if (seg.sourceIndex !== null && seg.origLine !== null && seg.origCol !== null) {
          // 2. Delta SourceIndex
          segStr += encodeVlq(seg.sourceIndex - prevSourceIndex);
          prevSourceIndex = seg.sourceIndex;

          // 3. Delta OrigLine
          segStr += encodeVlq(seg.origLine - prevOrigLine);
          prevOrigLine = seg.origLine;

          // 4. Delta OrigCol
          segStr += encodeVlq(seg.origCol - prevOrigCol);
          prevOrigCol = seg.origCol;

          // 5. Delta NameIndex (if present)
          if (seg.nameIndex !== null) {
            segStr += encodeVlq(seg.nameIndex - prevNameIndex);
            prevNameIndex = seg.nameIndex;
          }
        }

        segmentStrings.push(segStr);
      }

      lineStrings.push(segmentStrings.join(','));
    }

    return lineStrings.join(';');
  }

  /**
   * Export as standard Source Map v3 JSON object
   * @returns {object}
   */
  toJSON() {
    return {
      version: 3,
      file: this.file,
      sourceRoot: this.sourceRoot,
      sources: this.sources,
      sourcesContent: this.sourcesContent.every(c => c === null) ? undefined : this.sourcesContent,
      names: this.names,
      mappings: this.serializeMappings()
    };
  }

  /**
   * Serialize to JSON string
   * @returns {string}
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Generate standard data URI comment for inline source maps
   * @returns {string}
   */
  toDataUrl() {
    const json = this.toString();
    const base64 = Buffer.from(json, 'utf-8').toString('base64');
    return `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;
  }
}

/**
 * Decode a mappings string back into coordinate points for verification and tooling
 * @param {string} mappingsStr - Base64-VLQ mappings string
 * @param {string[]} sources - Source files array
 * @param {string[]} names - Identifier names array
 * @returns {Array<object>} Decoded mapping points
 */
export function decodeMappings(mappingsStr, sources = [], names = []) {
  const lines = mappingsStr.split(';');
  let prevSourceIndex = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;
  let prevNameIndex = 0;

  const result = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineStr = lines[lineIdx];
    if (!lineStr) continue;

    const segmentStrs = lineStr.split(',');
    let prevGenCol = 0;

    for (const segStr of segmentStrs) {
      if (!segStr) continue;
      const state = { pos: 0 };

      // 1. Delta GenCol
      const deltaGenCol = decodeVlq(segStr, state);
      const genCol = prevGenCol + deltaGenCol;
      prevGenCol = genCol;

      let source = null;
      let origLine = null;
      let origCol = null;
      let name = null;

      if (state.pos < segStr.length) {
        // 2. Delta SourceIndex
        const deltaSource = decodeVlq(segStr, state);
        const sourceIndex = prevSourceIndex + deltaSource;
        prevSourceIndex = sourceIndex;
        source = sources[sourceIndex];

        // 3. Delta OrigLine
        const deltaLine = decodeVlq(segStr, state);
        origLine = prevOrigLine + deltaLine;
        prevOrigLine = origLine;

        // 4. Delta OrigCol
        const deltaCol = decodeVlq(segStr, state);
        origCol = prevOrigCol + deltaCol;
        prevOrigCol = origCol;

        if (state.pos < segStr.length) {
          // 5. Delta Name
          const deltaName = decodeVlq(segStr, state);
          const nameIndex = prevNameIndex + deltaName;
          prevNameIndex = nameIndex;
          name = names[nameIndex];
        }
      }

      result.push({
        generated: { line: lineIdx + 1, column: genCol },
        original: origLine !== null ? { line: origLine + 1, column: origCol } : null,
        source,
        name
      });
    }
  }

  return result;
}

export default {
  SourceMapGenerator,
  decodeMappings
};
