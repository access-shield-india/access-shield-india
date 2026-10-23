import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, createZipArchive, sanitizeZipFileName } from './zip-bundle';

describe('crc32', () => {
  it('matches the standard CRC-32 check value', () => {
    // CRC-32 of ASCII "123456789" is defined as 0xCBF43926
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('sanitizeZipFileName', () => {
  it('removes path separators and illegal characters', () => {
    expect(sanitizeZipFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
    expect(sanitizeZipFileName('  Executive   Summary  ')).toBe('Executive Summary');
    expect(sanitizeZipFileName('...')).toBe('report');
  });
});

describe('createZipArchive', () => {
  it('creates an archive whose entries round-trip', () => {
    const zip = createZipArchive([
      { name: 'one.txt', data: Buffer.from('hello', 'utf-8') },
      { name: 'two.txt', data: Buffer.from('123456789'.repeat(200), 'utf-8') },
    ]);

    expect(zip.readUInt32LE(0)).toBe(0x04034b50); // local header

    // Walk local headers, inflate DEFLATE entries, verify contents
    const contents: Record<string, string> = {};
    let cursor = 0;
    while (zip.readUInt32LE(cursor) === 0x04034b50) {
      const method = zip.readUInt16LE(cursor + 8);
      const checksum = zip.readUInt32LE(cursor + 14);
      const compressedSize = zip.readUInt32LE(cursor + 18);
      const nameLength = zip.readUInt16LE(cursor + 26);
      const name = zip.toString('utf-8', cursor + 30, cursor + 30 + nameLength);
      const dataStart = cursor + 30 + nameLength;
      const raw = zip.subarray(dataStart, dataStart + compressedSize);
      const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
      expect(crc32(data)).toBe(checksum);
      contents[name] = data.toString('utf-8');
      cursor = dataStart + compressedSize;
    }

    expect(contents['one.txt']).toBe('hello');
    expect(contents['two.txt']).toBe('123456789'.repeat(200));

    // End-of-central-directory record is the last 22 bytes
    const eocd = zip.subarray(zip.length - 22);
    expect(eocd.readUInt32LE(0)).toBe(0x06054b50);
    expect(eocd.readUInt16LE(10)).toBe(2);
  });

  it('throws on an empty archive', () => {
    expect(() => createZipArchive([])).toThrow('no files');
  });
});
