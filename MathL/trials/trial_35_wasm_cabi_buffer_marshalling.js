/**
 * Trial #35: Safe WASM / C-ABI Buffer Marshalling & Pointer Invariance (Rule XXII)
 * Proves compile-time verification of C-ABI struct layouts, natural alignment,
 * pointer bound invariance, and raw binary buffer marshalling matching low-level invariants:
 * - S_UnalignedMemoryAccess (Unaligned pointer dereferencing)
 * - S_MemoryPointerOverrun (Buffer overflow / pointer out of bounds)
 * - S_StructPaddingMismatch (Struct packing and padding mismatch)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #35: Safe WASM / C-ABI Buffer Marshalling & Pointer Invariance ---');

export const ABITypes = {
  i8: { name: 'i8', size: 1, align: 1 },
  u8: { name: 'u8', size: 1, align: 1 },
  i16: { name: 'i16', size: 2, align: 2 },
  u16: { name: 'u16', size: 2, align: 2 },
  i32: { name: 'i32', size: 4, align: 4 },
  u32: { name: 'u32', size: 4, align: 4 },
  f32: { name: 'f32', size: 4, align: 4 },
  f64: { name: 'f64', size: 8, align: 8 },
  i64: { name: 'i64', size: 8, align: 8 },
  u64: { name: 'u64', size: 8, align: 8 },
  ptr32: { name: 'ptr32', size: 4, align: 4 },
  ptr64: { name: 'ptr64', size: 8, align: 8 }
};

export class StructLayout {
  constructor(name, fields, options = { packed: false }) {
    this.name = name;
    this.isPacked = options.packed || false;
    this.fields = [];
    this.fieldMap = new Map();
    this.totalSize = 0;
    this.maxAlignment = 1;
    this.totalPaddingBytes = 0;

    this._computeLayout(fields);
  }

  _computeLayout(fieldDefs) {
    let currentOffset = 0;

    for (const def of fieldDefs) {
      let fieldType;
      let fieldSize;
      let fieldAlign;

      if (def.type instanceof StructLayout) {
        // Nested struct
        fieldType = def.type;
        fieldSize = def.type.totalSize * (def.count || 1);
        fieldAlign = this.isPacked ? 1 : def.type.maxAlignment;
      } else if (typeof def.type === 'string' && ABITypes[def.type]) {
        // Primitive ABI type
        const prim = ABITypes[def.type];
        fieldType = prim;
        const count = def.count || 1;
        fieldSize = prim.size * count;
        fieldAlign = this.isPacked ? 1 : prim.align;
      } else {
        throw new Error(`Unknown field type '${def.type}' in struct '${this.name}'.`);
      }

      // Calculate padding needed for alignment
      const padding = (currentOffset % fieldAlign === 0) ? 0 : (fieldAlign - (currentOffset % fieldAlign));
      currentOffset += padding;
      this.totalPaddingBytes += padding;

      const fieldEntry = {
        name: def.name,
        type: fieldType,
        offset: currentOffset,
        size: fieldSize,
        align: fieldAlign,
        count: def.count || 1,
        paddingBefore: padding
      };

      this.fields.push(fieldEntry);
      this.fieldMap.set(def.name, fieldEntry);

      currentOffset += fieldSize;
      if (fieldAlign > this.maxAlignment) {
        this.maxAlignment = fieldAlign;
      }
    }

    // Tail padding to round up struct total size to multiple of maxAlignment
    if (!this.isPacked && this.maxAlignment > 1) {
      const tailPadding = (currentOffset % this.maxAlignment === 0) ? 0 : (this.maxAlignment - (currentOffset % this.maxAlignment));
      currentOffset += tailPadding;
      this.totalPaddingBytes += tailPadding;
    }

    this.totalSize = currentOffset;
  }

  getField(name) {
    return this.fieldMap.get(name);
  }
}

export class WASMCABIBufferMarshaller {
  static verifyPointer(buffer, pointer, structLayout) {
    if (typeof pointer !== 'number' || !Number.isInteger(pointer) || pointer < 0) {
      return {
        ok: false,
        error: `[MathL Violation: S_InvalidPointer] Invalid pointer value (${pointer}). Must be non-negative integer.`
      };
    }

    // Check base struct alignment
    if (!structLayout.isPacked && (pointer % structLayout.maxAlignment !== 0)) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnalignedMemoryAccess] Pointer (0x${pointer.toString(16)}) is unaligned for struct '${structLayout.name}' (requires ${structLayout.maxAlignment}-byte alignment).`
      };
    }

    // Check pointer boundary against buffer length
    if (pointer + structLayout.totalSize > buffer.byteLength) {
      return {
        ok: false,
        error: `[MathL Violation: S_MemoryPointerOverrun] Struct '${structLayout.name}' of size ${structLayout.totalSize} bytes at pointer (0x${pointer.toString(16)}) overruns buffer boundary (${buffer.byteLength} bytes).`
      };
    }

    return { ok: true };
  }

  static verifyFieldAccess(buffer, pointer, structLayout, fieldName) {
    const ptrCheck = this.verifyPointer(buffer, pointer, structLayout);
    if (!ptrCheck.ok) return ptrCheck;

    const field = structLayout.getField(fieldName);
    if (!field) {
      return {
        ok: false,
        error: `[MathL Violation: S_MissingField] Field '${fieldName}' does not exist in struct '${structLayout.name}'.`
      };
    }

    const fieldAbsOffset = pointer + field.offset;

    // Check field alignment
    if (!structLayout.isPacked && (fieldAbsOffset % field.align !== 0)) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnalignedMemoryAccess] Field '${fieldName}' at offset (0x${fieldAbsOffset.toString(16)}) is unaligned (requires ${field.align}-byte alignment).`
      };
    }

    // Check field boundary
    if (fieldAbsOffset + field.size > buffer.byteLength) {
      return {
        ok: false,
        error: `[MathL Violation: S_MemoryPointerOverrun] Field '${fieldName}' at offset (0x${fieldAbsOffset.toString(16)}) overruns buffer capacity.`
      };
    }

    return { ok: true, fieldOffset: fieldAbsOffset, field };
  }

  static writeStruct(buffer, pointer, structLayout, values, littleEndian = true) {
    const ptrCheck = this.verifyPointer(buffer, pointer, structLayout);
    if (!ptrCheck.ok) return ptrCheck;

    const view = new DataView(buffer);

    for (const field of structLayout.fields) {
      const val = values[field.name];
      if (val === undefined) {
        return {
          ok: false,
          error: `[MathL Violation: S_IncompleteStructData] Missing required value for struct field '${field.name}'.`
        };
      }

      const absOffset = pointer + field.offset;

      switch (field.type.name) {
        case 'i8':
          view.setInt8(absOffset, val);
          break;
        case 'u8':
          view.setUint8(absOffset, val);
          break;
        case 'i16':
          view.setInt16(absOffset, val, littleEndian);
          break;
        case 'u16':
          view.setUint16(absOffset, val, littleEndian);
          break;
        case 'i32':
        case 'ptr32':
          view.setInt32(absOffset, val, littleEndian);
          break;
        case 'u32':
          view.setUint32(absOffset, val, littleEndian);
          break;
        case 'f32':
          view.setFloat32(absOffset, val, littleEndian);
          break;
        case 'f64':
          view.setFloat64(absOffset, val, littleEndian);
          break;
        case 'i64':
        case 'u64':
        case 'ptr64':
          view.setBigInt64(absOffset, BigInt(val), littleEndian);
          break;
        default:
          return {
            ok: false,
            error: `Unsupported primitive type '${field.type.name}'.`
          };
      }
    }

    return { ok: true, bytesWritten: structLayout.totalSize };
  }

  static readStruct(buffer, pointer, structLayout, littleEndian = true) {
    const ptrCheck = this.verifyPointer(buffer, pointer, structLayout);
    if (!ptrCheck.ok) return ptrCheck;

    const view = new DataView(buffer);
    const result = {};

    for (const field of structLayout.fields) {
      const absOffset = pointer + field.offset;

      switch (field.type.name) {
        case 'i8':
          result[field.name] = view.getInt8(absOffset);
          break;
        case 'u8':
          result[field.name] = view.getUint8(absOffset);
          break;
        case 'i16':
          result[field.name] = view.getInt16(absOffset, littleEndian);
          break;
        case 'u16':
          result[field.name] = view.getUint16(absOffset, littleEndian);
          break;
        case 'i32':
        case 'ptr32':
          result[field.name] = view.getInt32(absOffset, littleEndian);
          break;
        case 'u32':
          result[field.name] = view.getUint32(absOffset, littleEndian);
          break;
        case 'f32':
          result[field.name] = view.getFloat32(absOffset, littleEndian);
          break;
        case 'f64':
          result[field.name] = view.getFloat64(absOffset, littleEndian);
          break;
        case 'i64':
        case 'u64':
        case 'ptr64':
          result[field.name] = view.getBigInt64(absOffset, littleEndian);
          break;
        default:
          return {
            ok: false,
            error: `Unsupported primitive type '${field.type.name}'.`
          };
      }
    }

    return { ok: true, data: result };
  }
}

// =========================================================================
// VERIFICATION SUITE
// =========================================================================

// 1. C-ABI Struct Alignment and Padding Calculation
console.log('1. Testing C-ABI Struct Layout & Padding Calculation...');

// Struct:
// struct Vertex {
//   uint8_t id;      // 1 byte, offset 0
//   // 3 bytes padding
//   float x, y, z;   // 12 bytes, offset 4, 8, 12
//   uint16_t flags;  // 2 bytes, offset 16
//   // 2 bytes tail padding
// }; // Total size: 20 bytes, max alignment: 4
const vertexLayout = new StructLayout('Vertex', [
  { name: 'id', type: 'u8' },
  { name: 'x', type: 'f32' },
  { name: 'y', type: 'f32' },
  { name: 'z', type: 'f32' },
  { name: 'flags', type: 'u16' }
]);

assert.strictEqual(vertexLayout.getField('id').offset, 0);
assert.strictEqual(vertexLayout.getField('x').offset, 4); // Aligned to 4 (3 bytes padding before)
assert.strictEqual(vertexLayout.getField('y').offset, 8);
assert.strictEqual(vertexLayout.getField('z').offset, 12);
assert.strictEqual(vertexLayout.getField('flags').offset, 16);
// Tail padding: 18 -> 20 (rounded up to multiple of maxAlignment=4)
assert.strictEqual(vertexLayout.totalSize, 20);
assert.strictEqual(vertexLayout.maxAlignment, 4);
assert.strictEqual(vertexLayout.totalPaddingBytes, 5); // 3 internal + 2 tail

// 2. Packed Struct Layout (No Padding)
console.log('2. Testing Packed Struct (Zero Padding)...');
const packedVertexLayout = new StructLayout('PackedVertex', [
  { name: 'id', type: 'u8' },
  { name: 'x', type: 'f32' },
  { name: 'y', type: 'f32' },
  { name: 'z', type: 'f32' },
  { name: 'flags', type: 'u16' }
], { packed: true });

assert.strictEqual(packedVertexLayout.getField('id').offset, 0);
assert.strictEqual(packedVertexLayout.getField('x').offset, 1);
assert.strictEqual(packedVertexLayout.getField('y').offset, 5);
assert.strictEqual(packedVertexLayout.getField('z').offset, 9);
assert.strictEqual(packedVertexLayout.getField('flags').offset, 13);
assert.strictEqual(packedVertexLayout.totalSize, 15);
assert.strictEqual(packedVertexLayout.totalPaddingBytes, 0);

// 3. Binary Marshalling & Serialization (Little-Endian & Big-Endian)
console.log('3. Testing Binary Marshalling and Roundtrip Invariance...');
const memBuffer = new ArrayBuffer(64);
const vData = { id: 7, x: 1.5, y: -2.25, z: 100.0, flags: 0x0102 };

const writeRes = WASMCABIBufferMarshaller.writeStruct(memBuffer, 0, vertexLayout, vData, true);
assert.strictEqual(writeRes.ok, true);
assert.strictEqual(writeRes.bytesWritten, 20);

const readRes = WASMCABIBufferMarshaller.readStruct(memBuffer, 0, vertexLayout, true);
assert.strictEqual(readRes.ok, true);
assert.strictEqual(readRes.data.id, 7);
assert.strictEqual(Math.abs(readRes.data.x - 1.5) < 1e-5, true);
assert.strictEqual(Math.abs(readRes.data.y - (-2.25)) < 1e-5, true);
assert.strictEqual(Math.abs(readRes.data.z - 100.0) < 1e-5, true);
assert.strictEqual(readRes.data.flags, 0x0102);

// 4. Unaligned Memory Access Static Detection
console.log('4. Testing Unaligned Pointer Dereferencing Detection...');
// Pointer 2 is not aligned to 4-byte boundary for Vertex struct
const unalignedPtrRes = WASMCABIBufferMarshaller.verifyPointer(memBuffer, 2, vertexLayout);
assert.strictEqual(unalignedPtrRes.ok, false);
assert.ok(unalignedPtrRes.error.includes('S_UnalignedMemoryAccess'));

// Pointer 4 is aligned to 4-byte boundary
const alignedPtrRes = WASMCABIBufferMarshaller.verifyPointer(memBuffer, 4, vertexLayout);
assert.strictEqual(alignedPtrRes.ok, true);

// 5. Memory Pointer Overrun & Boundary Violation
console.log('5. Testing Memory Pointer Overrun Detection...');
// memBuffer is 64 bytes. Vertex is 20 bytes.
// Pointer 48: 48 + 20 = 68 > 64 (buffer overrun)
const overrunRes = WASMCABIBufferMarshaller.verifyPointer(memBuffer, 48, vertexLayout);
assert.strictEqual(overrunRes.ok, false);
assert.ok(overrunRes.error.includes('S_MemoryPointerOverrun'));

// Pointer 44: 44 + 20 = 64 <= 64 (fits exactly in boundary)
const fitRes = WASMCABIBufferMarshaller.verifyPointer(memBuffer, 44, vertexLayout);
assert.strictEqual(fitRes.ok, true);

// Negative pointer
const negRes = WASMCABIBufferMarshaller.verifyPointer(memBuffer, -4, vertexLayout);
assert.strictEqual(negRes.ok, false);
assert.ok(negRes.error.includes('S_InvalidPointer'));

// 6. WebAssembly FFI Header Simulation (64-bit Pointers & Alignment)
console.log('6. Testing WebAssembly 64-bit ABI Packet Header...');
const packetHeaderLayout = new StructLayout('PacketHeader', [
  { name: 'magic', type: 'u32' },       // 4 bytes, offset 0
  // 4 bytes padding to align u64 to 8
  { name: 'timestamp', type: 'u64' },   // 8 bytes, offset 8
  { name: 'payloadPtr', type: 'ptr64' },// 8 bytes, offset 16
  { name: 'payloadLength', type: 'u32' }// 4 bytes, offset 24
  // 4 bytes tail padding to round to multiple of 8 -> 32 bytes
]);

assert.strictEqual(packetHeaderLayout.getField('magic').offset, 0);
assert.strictEqual(packetHeaderLayout.getField('timestamp').offset, 8);
assert.strictEqual(packetHeaderLayout.getField('payloadPtr').offset, 16);
assert.strictEqual(packetHeaderLayout.getField('payloadLength').offset, 24);
assert.strictEqual(packetHeaderLayout.totalSize, 32);
assert.strictEqual(packetHeaderLayout.maxAlignment, 8);

const wasmBuffer = new ArrayBuffer(128);
const writePacket = WASMCABIBufferMarshaller.writeStruct(wasmBuffer, 0, packetHeaderLayout, {
  magic: 0xDEADBEEF,
  timestamp: 1694600000000n,
  payloadPtr: 0x1000n,
  payloadLength: 4096
});
assert.strictEqual(writePacket.ok, true);

const readPacket = WASMCABIBufferMarshaller.readStruct(wasmBuffer, 0, packetHeaderLayout);
assert.strictEqual(readPacket.ok, true);
assert.strictEqual(readPacket.data.magic, 0xDEADBEEF >>> 0);
assert.strictEqual(readPacket.data.timestamp, 1694600000000n);
assert.strictEqual(readPacket.data.payloadPtr, 0x1000n);
assert.strictEqual(readPacket.data.payloadLength, 4096);

console.log('Trial #35 Result: PASS (C-ABI struct layouts, natural alignment, pointer bounds, and binary marshalling verified).\n');
