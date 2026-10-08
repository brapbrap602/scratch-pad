const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YOUTUBE_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const STEP_KINDS = new Set(['observe', 'setup', 'build', 'debug', 'checkpoint']);
const CATEGORY_CLASSES = new Set([
  'cat-motion',
  'cat-looks',
  'cat-sound',
  'cat-events',
  'cat-control',
  'cat-sensing',
  'cat-operators',
  'cat-variables',
  'cat-my-blocks',
]);

const fail = (message) => {
  throw new TypeError(message);
};

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const expectObject = (value, path) => {
  if (!isObject(value)) fail(`${path} must be an object`);
  return value;
};

const expectExactKeys = (value, required, optional, path) => {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(`${path}.${key} is required`);
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${path}.${key} is not supported`);
  }
};

const expectText = (value, path) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${path} must be a non-empty string`);
  }
  return value;
};

const expectId = (value, path) => {
  expectText(value, path);
  if (!ID_PATTERN.test(value)) fail(`${path} must be a slug-like ID`);
  if (['__proto__', 'prototype', 'constructor'].includes(value)) {
    fail(`${path} uses a reserved ID`);
  }
  return value;
};

const expectArray = (value, path, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${path} must be ${allowEmpty ? 'an array' : 'a non-empty array'}`);
  }
  return value;
};

const validateTextList = (value, path, { rich = false, allowEmpty = false } = {}) => {
  expectArray(value, path, { allowEmpty });
  value.forEach((item, index) => {
    expectText(item, `${path}[${index}]`);
    if (rich) parseRichText(item);
  });
};

const readTag = (source, index) => {
  const rest = source.slice(index);
  const candidates = [
    ['<br>', { type: 'break' }],
    ['<strong>', { type: 'open', tag: 'strong' }],
    ['</strong>', { type: 'close', tag: 'strong' }],
    ['<em>', { type: 'open', tag: 'em' }],
    ['</em>', { type: 'close', tag: 'em' }],
    ['</span>', { type: 'close', tag: 'span' }],
  ];

  for (const [markup, token] of candidates) {
    if (rest.startsWith(markup)) return { length: markup.length, token };
  }

  const spanMatch = rest.match(/^<span class="([a-z-]+)">/);
  if (spanMatch && CATEGORY_CLASSES.has(spanMatch[1])) {
    return {
      length: spanMatch[0].length,
      token: { type: 'open', tag: 'span', className: spanMatch[1] },
    };
  }

  fail(`Unsupported or malformed markup near: ${rest.slice(0, 40)}`);
};

export const parseRichText = (source) => {
  expectText(source, 'rich text');
  const tokens = [];
  const openTags = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] === '`') {
      const end = source.indexOf('`', index + 1);
      if (end === -1) fail('Scratch source has an unmatched backtick');
      const value = source.slice(index + 1, end);
      if (value === '' || value.includes('\n')) {
        fail('Inline Scratch source must be non-empty and on one line');
      }
      tokens.push({ type: 'scratch', value });
      index = end + 1;
      continue;
    }

    if (source[index] === '<') {
      const { length, token } = readTag(source, index);
      if (token.type === 'open') {
        if (token.tag === 'span' && openTags.includes('span')) {
          fail('Category spans cannot be nested');
        }
        openTags.push(token.tag);
      } else if (token.type === 'close') {
        if (openTags.pop() !== token.tag) fail(`Unexpected closing ${token.tag} tag`);
      }
      tokens.push(token);
      index += length;
      continue;
    }

    const nextMarkup = source.indexOf('<', index);
    const nextScratch = source.indexOf('`', index);
    const candidates = [nextMarkup, nextScratch].filter((value) => value !== -1);
    const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
    const value = source.slice(index, end);
    if (value.includes('&')) fail('HTML entities are not supported in lesson prose');
    tokens.push({ type: 'text', value });
    index = end;
  }

  if (openTags.length > 0) fail(`Unclosed ${openTags.at(-1)} tag`);
  return tokens;
};

export const validateLessonIndex = (value) => {
  expectArray(value, 'lesson index');
  const seen = new Set();
  for (const [index, id] of value.entries()) {
    expectId(id, `lesson index[${index}]`);
    if (seen.has(id)) fail(`lesson index contains duplicate ID ${id}`);
    seen.add(id);
  }
  return value;
};

const validateCheckpoint = (value, path) => {
  expectObject(value, path);
  expectExactKeys(value, ['task', 'expectedResult', 'completeWhen'], [], path);
  expectText(value.task, `${path}.task`);
  parseRichText(value.task);
  expectText(value.expectedResult, `${path}.expectedResult`);
  parseRichText(value.expectedResult);
  validateTextList(value.completeWhen, `${path}.completeWhen`, { rich: true });
};

const validateStep = (step, path) => {
  expectObject(step, path);
  expectExactKeys(
    step,
    ['id', 'kind', 'title', 'explanation', 'instructions', 'hints', 'debuggingTips', 'checkpoint'],
    ['youtubeID', 'finishedCode'],
    path,
  );
  expectId(step.id, `${path}.id`);
  if (!STEP_KINDS.has(step.kind)) fail(`${path}.kind is not supported`);
  expectText(step.title, `${path}.title`);
  expectText(step.explanation, `${path}.explanation`);
  parseRichText(step.explanation);
  validateTextList(step.instructions, `${path}.instructions`, { rich: true });
  validateTextList(step.hints, `${path}.hints`, { rich: true, allowEmpty: true });
  expectArray(step.debuggingTips, `${path}.debuggingTips`, { allowEmpty: true });
  step.debuggingTips.forEach((tip, index) => {
    const tipPath = `${path}.debuggingTips[${index}]`;
    expectObject(tip, tipPath);
    expectExactKeys(tip, ['symptom', 'checks'], [], tipPath);
    expectText(tip.symptom, `${tipPath}.symptom`);
    parseRichText(tip.symptom);
    validateTextList(tip.checks, `${tipPath}.checks`, { rich: true });
  });
  validateCheckpoint(step.checkpoint, `${path}.checkpoint`);

  if (Object.hasOwn(step, 'youtubeID') && !YOUTUBE_PATTERN.test(step.youtubeID)) {
    fail(`${path}.youtubeID is invalid`);
  }
  if (Object.hasOwn(step, 'finishedCode')) {
    expectArray(step.finishedCode, `${path}.finishedCode`);
    step.finishedCode.forEach((code, index) => {
      const codePath = `${path}.finishedCode[${index}]`;
      expectObject(code, codePath);
      expectExactKeys(code, ['target', 'code'], [], codePath);
      expectText(code.target, `${codePath}.target`);
      expectText(code.code, `${codePath}.code`);
    });
  }
};

export const validateLessonDocument = (lesson, expectedId) => {
  expectObject(lesson, 'lesson');
  expectExactKeys(
    lesson,
    [
      'schemaVersion',
      'id',
      'title',
      'description',
      'objectives',
      'prerequisites',
      'requirements',
      'vocabulary',
      'chapters',
    ],
    [],
    'lesson',
  );
  if (lesson.schemaVersion !== 1) fail('lesson.schemaVersion must equal 1');
  expectId(lesson.id, 'lesson.id');
  if (expectedId !== undefined && lesson.id !== expectedId) {
    fail(`lesson.id must match ${expectedId}`);
  }
  expectText(lesson.title, 'lesson.title');
  expectText(lesson.description, 'lesson.description');
  validateTextList(lesson.objectives, 'lesson.objectives', { rich: true });
  validateTextList(lesson.prerequisites, 'lesson.prerequisites', { rich: true });
  validateTextList(lesson.requirements, 'lesson.requirements', { rich: true });

  expectArray(lesson.vocabulary, 'lesson.vocabulary');
  lesson.vocabulary.forEach((entry, index) => {
    const path = `lesson.vocabulary[${index}]`;
    expectObject(entry, path);
    expectExactKeys(entry, ['term', 'meaning'], [], path);
    expectText(entry.term, `${path}.term`);
    expectText(entry.meaning, `${path}.meaning`);
    parseRichText(entry.meaning);
  });

  expectArray(lesson.chapters, 'lesson.chapters');
  const chapterIds = new Set();
  const stepIds = new Set();
  lesson.chapters.forEach((chapter, chapterIndex) => {
    const path = `lesson.chapters[${chapterIndex}]`;
    expectObject(chapter, path);
    expectExactKeys(chapter, ['id', 'title', 'estimatedMinutes', 'objectives', 'steps'], [], path);
    expectId(chapter.id, `${path}.id`);
    if (chapterIds.has(chapter.id)) fail(`Duplicate chapter ID ${chapter.id}`);
    chapterIds.add(chapter.id);
    expectText(chapter.title, `${path}.title`);
    if (!Number.isInteger(chapter.estimatedMinutes) || chapter.estimatedMinutes < 90) {
      fail(`${path}.estimatedMinutes must be an integer of at least 90`);
    }
    validateTextList(chapter.objectives, `${path}.objectives`, { rich: true });
    expectArray(chapter.steps, `${path}.steps`);
    chapter.steps.forEach((step, stepIndex) => {
      validateStep(step, `${path}.steps[${stepIndex}]`);
      if (stepIds.has(step.id)) fail(`Duplicate step ID ${step.id}`);
      stepIds.add(step.id);
    });
    if (chapter.steps.at(-1).kind !== 'checkpoint') {
      fail(`${path} must end with a checkpoint step`);
    }
  });

  return lesson;
};

export const flattenLessonSteps = (lesson) =>
  lesson.chapters.flatMap((chapter) =>
    chapter.steps.map((step) => ({ ...step, chapterId: chapter.id, chapterTitle: chapter.title })),
  );

export const contentPolicy = {
  categoryClasses: CATEGORY_CLASSES,
};
