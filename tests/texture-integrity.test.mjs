import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expected = Object.freeze({
  harbor: '15848b787dda4ca8a2daf21634c8d1f9eefb9268',
  farm: '22a73f20507b75bf3f3f9731f81e920b863db392',
  sawmill: '1c13341da4bb84c3f4caeb72da53864ec1870f6b',
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
