/**
 * Zero-dependency pure Node.js VSIX builder
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

class ZipBuilder {
  constructor() {
    this.entries = [];
  }

  addFile(name, contentBuffer) {
    const uncompressedSize = contentBuffer.length;
    const crc = crc32(contentBuffer);
    const compressedData = zlib.deflateRawSync(contentBuffer);
    const compressedSize = compressedData.length;

    this.entries.push({
      name: name.replace(/\\/g, '/'),
      data: compressedData,
      crc,
      uncompressedSize,
      compressedSize
    });
  }

  build() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');

      // Local file header (30 bytes + nameBuf.length)
      const localHdr = Buffer.alloc(30 + nameBuf.length);
      localHdr.writeUInt32LE(0x04034b50, 0); // Signature
      localHdr.writeUInt16LE(20, 4);         // Version needed (2.0)
      localHdr.writeUInt16LE(0x0800, 6);     // Flags (UTF-8)
      localHdr.writeUInt16LE(8, 8);          // Compression method (Deflate)
      localHdr.writeUInt16LE(0, 10);         // Mod time
      localHdr.writeUInt16LE(0, 12);         // Mod date
      localHdr.writeUInt32LE(entry.crc, 14); // CRC-32
      localHdr.writeUInt32LE(entry.compressedSize, 18);
      localHdr.writeUInt32LE(entry.uncompressedSize, 22);
      localHdr.writeUInt16LE(nameBuf.length, 26);
      localHdr.writeUInt16LE(0, 28);         // Extra field length
      nameBuf.copy(localHdr, 30);

      const localOffset = offset;
      localHeaders.push(localHdr, entry.data);
      offset += localHdr.length + entry.data.length;

      // Central directory header (46 bytes + nameBuf.length)
      const centralHdr = Buffer.alloc(46 + nameBuf.length);
      centralHdr.writeUInt32LE(0x02014b50, 0); // Central file header signature
      centralHdr.writeUInt16LE(20, 4);         // Version made by
      centralHdr.writeUInt16LE(20, 6);         // Version needed
      centralHdr.writeUInt16LE(0x0800, 8);     // Flags (UTF-8)
      centralHdr.writeUInt16LE(8, 10);         // Compression method (Deflate)
      centralHdr.writeUInt16LE(0, 12);         // Mod time
      centralHdr.writeUInt16LE(0, 14);         // Mod date
      centralHdr.writeUInt32LE(entry.crc, 16); // CRC-32
      centralHdr.writeUInt32LE(entry.compressedSize, 20);
      centralHdr.writeUInt32LE(entry.uncompressedSize, 24);
      centralHdr.writeUInt16LE(nameBuf.length, 28);
      centralHdr.writeUInt16LE(0, 30);         // Extra field length
      centralHdr.writeUInt16LE(0, 32);         // File comment length
      centralHdr.writeUInt16LE(0, 34);         // Disk number start
      centralHdr.writeUInt16LE(0, 36);         // Internal file attributes
      centralHdr.writeUInt32LE(0, 38);         // External file attributes
      centralHdr.writeUInt32LE(localOffset, 42); // Relative offset of local header
      nameBuf.copy(centralHdr, 46);

      centralHeaders.push(centralHdr);
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const h of centralHeaders) centralDirSize += h.length;

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4);          // Number of this disk
    eocd.writeUInt16LE(0, 6);          // Disk with central directory
    eocd.writeUInt16LE(this.entries.length, 8);  // Total entries on disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total entries
    eocd.writeUInt32LE(centralDirSize, 12);      // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);    // Offset of central directory
    eocd.writeUInt16LE(0, 20);                   // Comment length

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}

// Build VSIX
function createVsix(extDir, outputPath) {
  const zip = new ZipBuilder();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js" ContentType="application/javascript"/>
  <Default Extension="md" ContentType="text/markdown"/>
  <Default Extension="code-snippets" ContentType="application/json"/>
  <Default Extension="txt" ContentType="text/plain"/>
</Types>`;
  zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));

  // 2. extension.vsixmanifest
  const vsixManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="oriented-direct" Version="1.0.0" Publisher="oriented-direct"/>
    <DisplayName>Oriented-Direct Language Support</DisplayName>
    <Description xml:space="preserve">Syntax highlighting, code suggestions (snippets), and rich IntelliSense for Oriented-Direct (.osp) programming language.</Description>
    <Tags>oriented-direct,osp,odp,syntax-highlighting,transpiler,snippets</Tags>
    <Categories>Programming Languages,Snippets</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Badges></Badges>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.75.0" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
    </Properties>
    <License></License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
  </Assets>
</PackageManifest>`;
  zip.addFile('extension.vsixmanifest', Buffer.from(vsixManifestXml, 'utf8'));

  // 3. Add all extension files recursively under extension/
  function addDir(dir, base = '') {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'build-vsix.js' || item.endsWith('.vsix')) continue;
      const fullPath = path.join(dir, item);
      const relPath = path.join(base, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDir(fullPath, relPath);
      } else {
        const fileData = fs.readFileSync(fullPath);
        zip.addFile('extension/' + relPath, fileData);
      }
    }
  }

  addDir(extDir);

  const vsixBuffer = zip.build();
  fs.writeFileSync(outputPath, vsixBuffer);
  console.log(`VSIX package generated successfully at: ${outputPath} (${vsixBuffer.length} bytes)`);
}

const extDir = path.resolve(__dirname);
const outPath = path.join(extDir, 'oriented-direct-1.0.0.vsix');
createVsix(extDir, outPath);

// Also copy to root WebApp directory for easy access
const rootPath = path.join(extDir, '..', 'oriented-direct-1.0.0.vsix');
fs.copyFileSync(outPath, rootPath);
console.log(`VSIX also copied to: ${rootPath}`);
