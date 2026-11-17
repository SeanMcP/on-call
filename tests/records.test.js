// Run with: node tests/records.test.js   (no dependencies)
import assert from 'node:assert/strict';
import { createRecords, formatTime } from '../js/records.js';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

assert.equal(formatTime(0), '0:00.00');
assert.equal(formatTime(83_456), '1:23.45');
assert.equal(formatTime(83_456, 1), '1:23.4');
assert.equal(formatTime(9_999), '0:09.99', 'rounds down, never up');
assert.equal(formatTime(3_600_000 + 5_000), '60:05.00');
assert.equal(formatTime(1e12), '99:59.99', 'tops out so it still fits the HUD');

const store = fakeStorage();
const r = createRecords(store);
assert.equal(r.empty, true);
assert.equal(r.get(3, 1), null);
assert.deepEqual(r.submit(3, 1, 60_000), { record: true, previous: null }, 'a first clear is a record');
assert.deepEqual(r.submit(3, 1, 61_000), { record: false, previous: 60_000 }, 'slower is not');
assert.equal(r.get(3, 1), 60_000);
assert.deepEqual(r.submit(3, 1, 60_000), { record: false, previous: 60_000 }, 'a tie is not');
assert.deepEqual(r.submit(3, 1, 55_000), { record: true, previous: 60_000 });
assert.equal(r.get(3, 2), null, 'each speed is separate');
assert.equal(r.get(4, 1), null, 'each level is separate');

// Survives a reload, and junk in storage is ignored.
const raw = JSON.parse(store.getItem('on-call-records-v1'));
raw['5-chill'] = 'fast';
raw['99-chill'] = 1000;
raw['2-steady'] = -5;
store.setItem('on-call-records-v1', JSON.stringify(raw));
const again = createRecords(store);
assert.equal(again.get(3, 1), 55_000);
assert.equal(again.get(5, 0), null);
assert.equal(again.get(2, 1), null);
again.clear();
assert.equal(again.empty, true);
assert.equal(createRecords(store).get(3, 1), null, 'clear is saved');

// Broken storage never throws.
const broken = { getItem() { throw new Error('nope'); }, setItem() { throw new Error('nope'); }, removeItem() { throw new Error('nope'); } };
const b = createRecords(broken);
assert.equal(b.submit(1, 0, 1000).record, true);
assert.equal(b.get(1, 0), 1000, 'kept in memory for the visit');
b.clear();
console.log('records ok');
