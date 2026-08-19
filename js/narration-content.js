import { parseRichText } from './content.js';

const HEX_64 = /^[0-9a-f]{64}$/;
const ASSET_PATH = /^audio\/assets\/([0-9a-f]{2})\/([0-9a-f]{64})\.mp3$/;

export const NARRATION_PROFILE = Object.freeze({
  voice: 'en-US-BrianNeural',
  normalizerVersion: 1,
  splitterVersion: 1,
  synthesisRevision: 1,
});

const padIndex = (index) => String(index).padStart(3, '0');

const verbalizeScratch = (source) =>
  source
    .replaceAll(/\[([^\]]+)\s+v\]/g, '$1')
    .replaceAll(/\s+>\s+/g, ' greater than ')
    .replaceAll(/\s+<\s+/g, ' less than ')
    .replaceAll(/[()[\]<>]/g, ' ')
    .replaceAll(/\?/g, '')
    .replaceAll(/\s*\*\s*/g, ' times ')
    .replaceAll(/\s*\+\s*/g, ' plus ')
    .replaceAll(/\s*=\s*/g, ' equals ')
    .replaceAll(/(^|\s)-(\d)/g, '$1negative $2')
    .replaceAll(/\s+-\s+/g, ' minus ')
    .replaceAll(/\s+/g, ' ')
    .trim();

export const verbalizeNarrationText = (source) => {
  const output = [];
  for (const token of parseRichText(source)) {
    if (token.type === 'text') output.push(token.value);
    if (token.type === 'scratch') output.push(verbalizeScratch(token.value));
    if (token.type === 'break') output.push('. ');
  }

  return output
    .join('')
    .replaceAll(/\b([xy])\s+-(\d)/gi, '$1 negative $2')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\s+([,.;:!?])/g, '$1')
    .replaceAll(/\.{2,}/g, '.')
    .trim();
};

export const splitNarrationSentences = (source) => {
  const text = source.trim();
  if (!text) return [];

  const sentences = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!'.!?'.includes(text[index])) continue;
    if (
      text[index] === '.'
      && /\d/.test(text[index - 1] || '')
      && /\d/.test(text[index + 1] || '')
    ) {
      continue;
    }

    let end = index + 1;
    while (/["')\]]/.test(text[end] || '')) end += 1;
    if (end < text.length && !/\s/.test(text[end])) continue;
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    while (/\s/.test(text[end] || '')) end += 1;
    start = end;
    index = end - 1;
  }

  const remainder = text.slice(start).trim();
  if (remainder) sentences.push(remainder);
  return sentences;
};

const buildSection = ({ id, kind, label, parts }) => {
  const sentences = parts.flatMap(({ path, text }) =>
    splitNarrationSentences(verbalizeNarrationText(text)).map((speech) => ({
      sourcePath: path,
      speech,
    })),
  );
  if (sentences.length === 0) throw new TypeError(`Narration section ${id} has no speech`);
  return {
    id,
    kind,
    label,
    sourcePaths: parts.map(({ path }) => path),
    sentences,
  };
};

const textPart = (path, text) => ({ path, text });

export const extractNarrationSections = (lesson) => {
  const sections = [];
  const add = (section) => sections.push(buildSection(section));

  add({
    id: 'welcome/description',
    kind: 'description',
    label: 'course introduction',
    parts: [textPart('description', lesson.description)],
  });
  lesson.objectives.forEach((text, index) => add({
    id: `welcome/objective/${padIndex(index)}`,
    kind: 'objective',
    label: `objective ${index + 1}`,
    parts: [textPart(`objectives/${index}`, text)],
  }));
  lesson.prerequisites.forEach((text, index) => add({
    id: `welcome/prerequisite/${padIndex(index)}`,
    kind: 'prerequisite',
    label: `prerequisite ${index + 1}`,
    parts: [textPart(`prerequisites/${index}`, text)],
  }));
  lesson.requirements.forEach((text, index) => add({
    id: `welcome/requirement/${padIndex(index)}`,
    kind: 'requirement',
    label: `requirement ${index + 1}`,
    parts: [textPart(`requirements/${index}`, text)],
  }));
  lesson.vocabulary.forEach((entry, index) => add({
    id: `welcome/vocabulary/${padIndex(index)}`,
    kind: 'vocabulary',
    label: `vocabulary term ${entry.term}`,
    parts: [
      textPart(`vocabulary/${index}/term`, entry.term),
      textPart(`vocabulary/${index}/meaning`, entry.meaning),
    ],
  }));

  lesson.chapters.forEach((chapter, chapterIndex) => {
    chapter.steps.forEach((step, stepIndex) => {
      const root = `chapters/${chapterIndex}/steps/${stepIndex}`;
      const idRoot = `${chapter.id}/${step.id}`;
      add({
        id: `${idRoot}/overview`,
        kind: 'overview',
        label: `${step.title} overview`,
        parts: [textPart(`${root}/explanation`, step.explanation)],
      });
      step.instructions.forEach((text, index) => add({
        id: `${idRoot}/instruction/${padIndex(index)}`,
        kind: 'instruction',
        label: `instruction ${index + 1}`,
        parts: [textPart(`${root}/instructions/${index}`, text)],
      }));
      step.hints.forEach((text, index) => add({
        id: `${idRoot}/hint/${padIndex(index)}`,
        kind: 'hint',
        label: `hint ${index + 1}`,
        parts: [textPart(`${root}/hints/${index}`, text)],
      }));
      step.debuggingTips.forEach((tip, index) => add({
        id: `${idRoot}/debug/${padIndex(index)}`,
        kind: 'debug',
        label: `debugging help for ${tip.symptom}`,
        parts: [
          textPart(`${root}/debuggingTips/${index}/symptom`, tip.symptom),
          ...tip.checks.map((text, checkIndex) =>
            textPart(`${root}/debuggingTips/${index}/checks/${checkIndex}`, text)),
        ],
      }));
      add({
        id: `${idRoot}/checkpoint`,
        kind: 'checkpoint',
        label: `${step.title} checkpoint`,
        parts: [
          textPart(`${root}/checkpoint/task`, step.checkpoint.task),
          textPart(`${root}/checkpoint/expectedResult`, step.checkpoint.expectedResult),
          ...step.checkpoint.completeWhen.map((text, index) =>
            textPart(`${root}/checkpoint/completeWhen/${index}`, text)),
        ],
      });
    });
  });

  const sectionIds = new Set();
  const sourcePaths = new Set();
  for (const section of sections) {
    if (sectionIds.has(section.id)) throw new TypeError(`Duplicate narration section ${section.id}`);
    sectionIds.add(section.id);
    for (const path of section.sourcePaths) {
      if (sourcePaths.has(path)) throw new TypeError(`Duplicate narrated source ${path}`);
      sourcePaths.add(path);
    }
  }
  return sections;
};

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const expectExactKeys = (value, keys, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (!sameJson(actual, expected)) throw new TypeError(`${path} has unsupported or missing properties`);
};

export const validateNarrationManifest = (manifest, lesson) => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('Narration manifest must be an object');
  }
  expectExactKeys(manifest, ['schemaVersion', 'lessonId', 'profile', 'sections'], 'Narration manifest');
  if (manifest.schemaVersion !== 1) throw new TypeError('Narration manifest schemaVersion must equal 1');
  if (manifest.lessonId !== lesson.id) throw new TypeError('Narration manifest lessonId does not match');
  expectExactKeys(
    manifest.profile,
    ['voice', 'normalizerVersion', 'splitterVersion', 'synthesisRevision'],
    'Narration profile',
  );
  for (const [key, value] of Object.entries(NARRATION_PROFILE)) {
    if (manifest.profile[key] !== value) throw new TypeError(`Narration profile ${key} does not match`);
  }
  if (!Array.isArray(manifest.sections)) throw new TypeError('Narration manifest sections must be an array');

  const expected = extractNarrationSections(lesson);
  if (manifest.sections.length !== expected.length) throw new TypeError('Narration manifest section count does not match');

  manifest.sections.forEach((section, sectionIndex) => {
    expectExactKeys(section, ['id', 'sourcePaths', 'sentences'], `Narration section ${sectionIndex}`);
    const expectedSection = expected[sectionIndex];
    if (section.id !== expectedSection.id) throw new TypeError(`Narration section id does not match at ${sectionIndex}`);
    if (!sameJson(section.sourcePaths, expectedSection.sourcePaths)) {
      throw new TypeError(`Narration sourcePaths do not match for ${section.id}`);
    }
    if (!Array.isArray(section.sentences) || section.sentences.length !== expectedSection.sentences.length) {
      throw new TypeError(`Narration sentence count does not match for ${section.id}`);
    }
    section.sentences.forEach((sentence, sentenceIndex) => {
      expectExactKeys(
        sentence,
        ['sourcePath', 'speech', 'requestHash', 'src', 'sha256', 'bytes', 'durationMs'],
        `Narration sentence ${section.id}/${sentenceIndex}`,
      );
      const expectedSentence = expectedSection.sentences[sentenceIndex];
      if (sentence.sourcePath !== expectedSentence.sourcePath) {
        throw new TypeError(`Narration sourcePath does not match for ${section.id}`);
      }
      if (sentence.speech !== expectedSentence.speech) {
        throw new TypeError(`Narration speech does not match for ${section.id}`);
      }
      if (!HEX_64.test(sentence.requestHash)) throw new TypeError(`Invalid requestHash for ${section.id}`);
      if (!HEX_64.test(sentence.sha256)) throw new TypeError(`Invalid sha256 for ${section.id}`);
      const match = sentence.src.match(ASSET_PATH);
      if (!match || match[1] !== sentence.sha256.slice(0, 2) || match[2] !== sentence.sha256) {
        throw new TypeError(`Invalid src for ${section.id}`);
      }
      if (!Number.isInteger(sentence.bytes) || sentence.bytes <= 0) {
        throw new TypeError(`Invalid bytes for ${section.id}`);
      }
      if (!Number.isInteger(sentence.durationMs) || sentence.durationMs <= 0) {
        throw new TypeError(`Invalid durationMs for ${section.id}`);
      }
    });
  });
  return manifest;
};
