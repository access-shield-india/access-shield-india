/**
 * Minimal ZIP archive builder (no external dependency).
 *
 * Supports DEFLATE via node:zlib with STORE fallback, UTF-8 filenames,
 * and a classic central directory — readable by unzip, Windows Explorer,
 * macOS Archive Utility, and Python zipfile.
 */

import { deflateRawSync } from 'node:zlib';

export interface ZipEntryInput {
  /** File name inside the archive (forward slashes for folders). */
  name: string;
  data: Buffer;
  modifiedAt?: Date;
}

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c >>> 0);
  }
  return table;
})();

/** Standard ZIP CRC-32 (same checksum Python/UnZip validate against). */
export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Make a string safe to use as a file name on Windows/macOS/Linux. */
export function sanitizeZipFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned || 'report';
}

function toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

/** Build a complete .zip archive in memory from the given entries. */
export function createZipArchive(entries: ZipEntryInput[]): Buffer {
  if (entries.length === 0) {
    throw new Error('Cannot create a ZIP archive with no files');
  }

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf-8');
    const { dosTime, dosDate } = toDosDateTime(entry.modifiedAt ?? new Date());
    const checksum = crc32(entry.data);

    const deflated = deflateRawSync(entry.data, { level: 9 });
    const useDeflate = deflated.length < entry.data.length;
    const method = useDeflate ? 8 : 0;
    const stored = useDeflate ? deflated : entry.data;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // flag: UTF-8 filename
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(stored.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(stored.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    // 30 extra, 32 comment, 34 disk, 36 internal attrs, 38 external attrs
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, stored);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + stored.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}
