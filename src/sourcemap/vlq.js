/**
 * High-Precision Base64-VLQ (Variable Length Quantity) Codec
 * Implements the Source Map v3 standard for integer serialization.
 * Zero external dependencies.
 */

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_MAP = new Map();
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_MAP.set(BASE64_CHARS[i], i);
}

/**
 * Encode a 32-bit signed integer into a Base64-VLQ string.
 * @param {number} value - Integer to encode
 * @returns {string} Base64-VLQ encoded string
 */
export function encodeVlq(value) {
  let vlq = value >= 0 ? (value << 1) : (((-value) << 1) | 1);
  let result = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32;
    }
    result += BASE64_CHARS[digit];
  } while (vlq > 0);
  return result;
}

/**
 * Decode a single Base64-VLQ encoded integer from a string starting at state.pos.
 * Modifies state.pos to point to the character immediately following the decoded value.
 * @param {string} encoded - The Base64 string containing VLQ segments
 * @param {{ pos: number }} state - State object tracking current read position
 * @returns {number} Decoded signed integer
 */
export function decodeVlq(encoded, state = { pos: 0 }) {
  let result = 0;
  let shift = 0;
  let continuation = false;
  do {
    if (state.pos >= encoded.length) {
      throw new Error('Unexpected end of VLQ string');
    }
    const c = encoded[state.pos++];
    const digit = BASE64_MAP.get(c);
    if (digit === undefined) {
      throw new Error(`Invalid Base64 character: '${c}'`);
    }
    continuation = (digit & 32) !== 0;
    const chunk = digit & 31;
    result += chunk << shift;
    shift += 5;
  } while (continuation);

  const isNegative = (result & 1) === 1;
  const magnitude = result >>> 1;
  return isNegative ? -magnitude : magnitude;
}

export default {
  encodeVlq,
  decodeVlq
};
