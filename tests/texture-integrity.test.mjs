import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expected = Object.freeze({
  harbor: 'a6da5a47b596818e81901cd32a28b68f53ed5d1f',
  farm: '65f6ecf5f1294fbabc17303b5031a631c2597cd2',
  sawmill: 'e292081c11a0dbd66e9a08bc88b06041bbbacd6a',
  grass: '78198ff5e078bb599155a550ebe084669a99de68',
  grass2: '309766d66bd84d924e02f97615bd1a0c3ce8cd47',
  meadow: 'd781574d5d61fbbf1acddb90a1e36497e06e9b21',
  clover: '4db1316f9c3494d4a114a035d5975abf32f7b186',
});
function gitBlobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
test('v0.15 PNG asset binaries match the reviewed immutable Git blobs', () => {
  for (const [name, sha] of Object.entries(expected)) {
    const bytes = readFileSync(resolve(root, 'assets/textures', `${name}.png`));
    assert.equal(gitBlobSha(bytes), sha, `wrong or truncated image ${name}`);
  }
});
