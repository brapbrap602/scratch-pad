import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const lesson = JSON.parse(
  await readFile(new URL('../../curriculum/brick-breaker.json', import.meta.url), 'utf8'),
);
const steps = lesson.chapters.flatMap(({ steps: chapterSteps }) => chapterSteps);
const step = (id) => steps.find((candidate) => candidate.id === id);
const ballScripts = steps.flatMap((entry) => entry.finishedCode ?? [])
  .filter((entry) => entry.target === 'Ball' && entry.code.includes('touching [Brick v]?'));

test('every brick bounce adds a small random turn so Ball cannot retrace its path', () => {
  assert.ok(ballScripts.length >= 3);
  for (const { code } of ballScripts) {
    assert.match(code, /point in direction \(\(\(direction\) \+ \(180\)\) \+ \(pick random \(-20\) to \(20\)\)\)\n\s*move \(12\) steps/);
    assert.doesNotMatch(code, /point in direction \(\(direction\) \+ \(180\)\)\n/);
  }
});

test('sprite sizes keep the miss check ahead of the bottom-edge bounce', () => {
  // The miss check is y < -165 and the bottom edge is -180, so Ball's radius must stay under 15.
  const sizes = step('setup-sprites-and-data').instructions.join('\n');
  assert.match(sizes, /Ball round and no wider than 20 pixels/);
  assert.match(sizes, /Paddle about 80 pixels wide and 10 pixels tall/);
  assert.match(step('setup-singleton-ball').instructions.join('\n'), /no wider than 20 pixels/);
});

test('every build step shows the code it asks for', () => {
  for (const entry of steps.filter(({ kind }) => kind === 'build')) {
    assert.ok(entry.finishedCode?.length, `${entry.id} has no finishedCode`);
  }
});

test('checkpoints only promise results the learner can see at that point', () => {
  const request = step('build-ball-brick-request').checkpoint.expectedResult;
  assert.match(request, /No brick cracks yet/);

  const foundations = step('checkpoint-foundations').instructions.join('\n');
  assert.match(foundations, /type 150 into the size box/);

  const apple = step('checkpoint-apple-power-up').instructions.join('\n');
  assert.match(apple, /tick the `size` checkbox in Looks/);
  assert.match(apple, /type 150 into Paddle's size box/);

  assert.doesNotMatch(step('setup-singleton-ball').checkpoint.expectedResult, /faces upward/);
  assert.match(step('enforce-green-flag-restart').hints.join('\n'), /`stop all`.*deletes every clone/);
});
