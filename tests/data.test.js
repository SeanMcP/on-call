// Run with: node tests/data.test.js
import assert from 'node:assert/strict';
import { BUGS, ENGINEER, FONT } from '../js/sprites.js';
import { SONGS, compileSong, noteFreq } from '../js/audio.js';
import { KEYMAPS, ACTIONS, buildLookup } from '../js/input.js';

for (const frames of BUGS) for (const rows of frames) {
  assert.equal(rows.length, 8);
  for (const r of rows) assert.equal(r.length, 8, r);
}
for (const [name, rows] of Object.entries(ENGINEER)) {
  assert.equal(rows.length, 16, name);
  for (const r of rows) assert.equal(r.length, 16, `${name}: ${r}`);
}
for (const [ch, g] of Object.entries(FONT)) assert.match(g, /^[01]{15}$/, ch);

assert.ok(Math.abs(noteFreq('A4') - 440) < 1e-9);
assert.ok(Math.abs(noteFreq('C4') - 261.63) < 0.01);
for (const [id, song] of Object.entries(SONGS)) {
  const steps = compileSong(song);
  assert.equal(steps.length, song.bars.length * 16, id);
  assert.equal(song.drums.length, 16);
  assert.equal(song.bass.length, 8);
}

const all = KEYMAPS.flatMap((m) => ACTIONS.map((a) => m[a]));
assert.equal(new Set(all).size, 16, 'no key is shared between players');
assert.equal(buildLookup([0, 1, 2, 3]).size, 16);
assert.equal(buildLookup([1]).get('ArrowLeft').player, 1, 'solo player gets arrow keys');
assert.equal(buildLookup([0, 1]).has('ArrowLeft'), false);
console.log('data ok');
