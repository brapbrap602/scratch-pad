import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NARRATION_PROFILE,
  extractNarrationSections,
  splitNarrationSentences,
  validateNarrationManifest,
  verbalizeNarrationText,
} from '../../js/narration-content.js';
import { validateLessonDocument } from '../../js/content.js';

const loadLesson = async (id) =>
  validateLessonDocument(
    JSON.parse(await readFile(new URL(`../../curriculum/${id}.json`, import.meta.url), 'utf8')),
    id,
  );

test('extracts every visible learner-prose section exactly once', async () => {
  const expected = new Map([
    ['brick-breaker', 298],
    ['space-invaders', 436],
    ['tower-defense', 415],
  ]);
  let sentenceCount = 0;
  const speech = [];

  for (const [id, count] of expected) {
    const sections = extractNarrationSections(await loadLesson(id));
    assert.equal(sections.length, count);
    assert.equal(new Set(sections.map(({ id: sectionId }) => sectionId)).size, count);
    assert.equal(new Set(sections.flatMap(({ sourcePaths }) => sourcePaths)).size,
      sections.flatMap(({ sourcePaths }) => sourcePaths).length);
    assert.ok(sections.every(({ sentences }) => sentences.length > 0));
    sentenceCount += sections.reduce((total, section) => total + section.sentences.length, 0);
    speech.push(...sections.flatMap((section) => section.sentences.map((sentence) => sentence.speech)));
  }

  assert.equal(sentenceCount, 2288);
  assert.equal(new Set(speech).size, 2275);
});

test('verbalizes current Scratch syntax without leaking markup', () => {
  assert.equal(
    verbalizeNarrationText('Set `Fleet X + Shot Lane * 45` and `Is Clone = 1`.'),
    'Set Fleet X plus Shot Lane times 45 and Is Clone equals 1.',
  );
  assert.equal(
    verbalizeNarrationText('Move to x -230, y -175, then wait 0.35 seconds.'),
    'Move to x negative 230, y negative 175, then wait 0.35 seconds.',
  );
  assert.equal(
    verbalizeNarrationText('<strong>Use</strong><br>`broadcast Reset Game and wait`.'),
    'Use. broadcast Reset Game and wait.',
  );
  assert.equal(verbalizeNarrationText('Require `size < 160`.'), 'Require size less than 160.');
  assert.equal(
    verbalizeNarrationText('Check `y position > 175`.'),
    'Check y position greater than 175.',
  );
});

test('sentence splitting protects decimals and Scratch questions', () => {
  assert.deepEqual(
    splitNarrationSentences('Wait 0.35 seconds. Use key left arrow pressed? Then continue!'),
    ['Wait 0.35 seconds.', 'Use key left arrow pressed?', 'Then continue!'],
  );
});

test('manifest validation rejects stale speech and unsafe asset paths', async () => {
  const lesson = await loadLesson('brick-breaker');
  const sections = extractNarrationSections(lesson);
  const manifest = {
    schemaVersion: 1,
    lessonId: lesson.id,
    profile: NARRATION_PROFILE,
    sections: sections.map((section) => ({
      id: section.id,
      sourcePaths: section.sourcePaths,
      sentences: section.sentences.map(({ speech, sourcePath }, index) => ({
        sourcePath,
        speech,
        requestHash: `${String(index).padStart(64, '0')}`.slice(-64),
        src: `audio/assets/aa/${'a'.repeat(64)}.mp3`,
        sha256: 'a'.repeat(64),
        bytes: 1,
        durationMs: 1,
      })),
    })),
  };

  assert.equal(validateNarrationManifest(manifest, lesson), manifest);
  manifest.profile = {
    synthesisRevision: 1,
    splitterVersion: 1,
    normalizerVersion: 1,
    voice: 'en-US-BrianNeural',
  };
  assert.equal(validateNarrationManifest(manifest, lesson), manifest);

  const stale = structuredClone(manifest);
  stale.sections[0].sentences[0].speech += ' stale';
  assert.throws(() => validateNarrationManifest(stale, lesson), /speech/);

  const unsafe = structuredClone(manifest);
  unsafe.sections[0].sentences[0].src = '../escape.mp3';
  assert.throws(() => validateNarrationManifest(unsafe, lesson), /src/);

  const extra = structuredClone(manifest);
  extra.sections[0].sentences[0].unexpected = true;
  assert.throws(() => validateNarrationManifest(extra, lesson), /unsupported/);
});
