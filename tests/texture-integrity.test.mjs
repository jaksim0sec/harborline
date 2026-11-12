import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expected = Object.freeze({
  harbor: 'efe456f66744ee622ce3fda5e462b2dbb1ffb78e',
  farm: 'fc985ecda6ff8c83407c0b03ddb544996ac7b87f',
  sawmill: '536dfc0b961f6959c33270232fdd8a8640c1bd98',
  grass: '78198ff5e078bb599155a550ebe084669a99de68',
  grass2: '309766d66bd84d924e02f97615bd1a0c3ce8cd47',
  meadow: 'd781574d5d61fbbf1acddb90a1e36497e06e9b21',
  clover: '4db1316f9c3494d4a114a035d5975abf32f7b186',
});
function gitBlobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
test('current PNG asset binaries match the reviewed immutable Git blobs', () => {
  for (const [name, sha] of Object.entries(expected)) {
    const bytes = readFileSync(resolve(root, 'assets/textures', `${name}.png`));
    assert.equal(gitBlobSha(bytes), sha, `wrong or truncated image ${name}`);
  }
});
