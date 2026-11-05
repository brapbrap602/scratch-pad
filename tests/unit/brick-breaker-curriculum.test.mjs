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

const assertInOrder = (instructions, patterns) => {
  let index = 0;
  for (const pattern of patterns) {
    const match = instructions.findIndex((text, candidate) => candidate >= index && pattern.test(text));
    assert.notEqual(match, -1, `Missing instruction after index ${index}: ${pattern}`);
    index = match + 1;
  }
};

test('learners try the Stage numbers with the Cat before they need them', () => {
  const ids = lesson.chapters[0].steps.map(({ id }) => id);
  assert.ok(ids.indexOf('learn-stage-numbers') < ids.indexOf('setup-sprites-and-data'));
  assert.match(step('learn-stage-numbers').explanation, /480 pixels wide and 360 pixels high/);
  assertInOrder(step('learn-stage-numbers').instructions, [
    /click Create/,
    /x 0, y 0/,
    /y -60.*y -120.*bigger the number after the minus sign/,
    /Direction/,
    /one step is one pixel/,
    /delete the Cat/,
  ]);
  assert.ok(lesson.vocabulary.some(({ term }) => term === 'pixel'));
});

test('each message is created by the first script that uses it', () => {
  // Scratch discards message names that no block uses, so none are made ahead of time.
  assert.doesNotMatch(step('setup-sprites-and-data').instructions.join('\n'), /messages?/i);
  const creators = {
    'Build Bricks': 'build-stage-and-paddle',
    'Start Ball': 'build-stage-and-paddle',
    'Game Over': 'build-ordered-ball-loop',
    'Hit Brick': 'build-ball-brick-request',
    Win: 'build-ball-brick-request',
    'Apple Caught': 'build-apple-fall-and-catch',
  };
  for (const [message, id] of Object.entries(creators)) {
    assert.match(step(id).instructions.join('\n'), new RegExp(`New message.*create ${message}`), message);
  }
});

test('instructions explain how to size costumes without the Size box', () => {
  const setup = step('setup-sprites-and-data').instructions.join('\n');
  assert.match(setup, /80 x 10.*first is the width/);
  assert.match(setup, /Do not use the Size box/);
});

test('instructions point to finished code where the page actually shows it', () => {
  const learnerText = steps.flatMap((entry) => [entry.explanation, ...entry.instructions]).join('\n');
  assert.doesNotMatch(learnerText, /(?:shown|code) below/i);
  assert.match(learnerText, /finished code section on this page/);
});

test('the course overview lists what learners need instead of the finished design', () => {
  assert.ok(lesson.requirements.length <= 5);
  assert.doesNotMatch(lesson.requirements.join('\n'), /broadcast|clones|Hit Claimed/);
});
