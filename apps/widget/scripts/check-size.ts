import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

export const CORE_BUDGET = 35840;
export const CORE_FILE = 'dist/widget.min.js';

export function checkBundleSize(): boolean {
  const raw = readFileSync(CORE_FILE);
  const gzipped = gzipSync(raw).length;
  const pass = gzipped <= CORE_BUDGET;
  console.table({ raw: raw.length, gzipped, budget: CORE_BUDGET, pass });
  return pass;
}

const invokedDirectly = process.argv[1]?.includes('check-size');
if (invokedDirectly && !checkBundleSize()) {
  process.exit(1);
}
