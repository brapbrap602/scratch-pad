import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  parseRichText,
  validateLessonDocument,
  validateLessonIndex,
} from '../../js/content.js';

const loadJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('the real lesson index and curricula satisfy the runtime contract', async () => {
  const index = await loadJson('../../curriculum/lessons.json');
  assert.deepEqual(validateLessonIndex(index), index);

  for (const slug of index) {
    const lesson = await loadJson(`../../curriculum/${slug}.json`);
    assert.equal(validateLessonDocument(lesson, slug), lesson);
  }
});

test('all chapter and step IDs are unique and every chapter ends in a checkpoint', async () => {
  for (const slug of ['brick-breaker', 'space-invaders']) {
    const lesson = await loadJson(`../../curriculum/${slug}.json`);
    const chapterIds = lesson.chapters.map(({ id }) => id);
    const steps = lesson.chapters.flatMap(({ steps }) => steps);
    const stepIds = steps.map(({ id }) => id);

    assert.equal(new Set(chapterIds).size, chapterIds.length);
    assert.equal(new Set(stepIds).size, stepIds.length);
    for (const chapter of lesson.chapters) {
      assert.equal(chapter.steps.at(-1).kind, 'checkpoint');
    }
  }
});

test('rich text preserves Scratch predicates as text tokens', () => {
  assert.deepEqual(
    parseRichText('Use `if <touching [Ball v]?> then` now.'),
    [
      { type: 'text', value: 'Use ' },
      { type: 'scratch', value: 'if <touching [Ball v]?> then' },
      { type: 'text', value: ' now.' },
    ],
  );
});

test('rich text accepts only the documented mini-markup', () => {
  assert.deepEqual(parseRichText('<strong>Check</strong><br><span class="cat-motion">Motion</span>'), [
    { type: 'open', tag: 'strong' },
    { type: 'text', value: 'Check' },
    { type: 'close', tag: 'strong' },
    { type: 'break' },
    { type: 'open', tag: 'span', className: 'cat-motion' },
    { type: 'text', value: 'Motion' },
    { type: 'close', tag: 'span' },
  ]);

  for (const unsafe of [
    '<img src=x onerror=alert(1)>',
    '<span class="cat-motion fixed">Motion</span>',
    '<svg><script>alert(1)</script></svg>',
    '<strong onclick="alert(1)">Check</strong>',
    '`unclosed',
  ]) {
    assert.throws(() => parseRichText(unsafe));
  }
});

test('runtime validation rejects unsafe IDs and malformed lessons', async () => {
  assert.throws(() => validateLessonIndex(['../secrets']));
  assert.throws(() => validateLessonIndex(['brick-breaker', 'brick-breaker']));

  const lesson = await loadJson('../../curriculum/brick-breaker.json');
  const malformed = structuredClone(lesson);
  malformed.chapters[0].steps[0].youtubeID = 'bad" onload="x';
  assert.throws(() => validateLessonDocument(malformed, lesson.id));
});
