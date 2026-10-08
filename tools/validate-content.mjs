import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { validateLessonDocument, validateLessonIndex } from '../js/content.js';
import { extractNarrationSections } from '../js/narration-content.js';

const curriculumDirectory = path.resolve('curriculum');
const readJson = async (filename) =>
  JSON.parse(await readFile(path.join(curriculumDirectory, filename), 'utf8'));

const index = validateLessonIndex(await readJson('lessons.json'));
const files = (await readdir(curriculumDirectory))
  .filter((filename) => filename.endsWith('.json') && filename !== 'lessons.json')
  .sort();
const expectedFiles = index.map((id) => `${id}.json`).sort();

if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
  throw new Error(`Lesson manifest mismatch. Expected ${expectedFiles.join(', ')}, found ${files.join(', ')}`);
}

let stepCount = 0;
let narrationSectionCount = 0;
let narrationSentenceCount = 0;
for (const id of index) {
  const lesson = validateLessonDocument(await readJson(`${id}.json`), id);
  stepCount += lesson.chapters.reduce((total, chapter) => total + chapter.steps.length, 0);
  const sections = extractNarrationSections(lesson);
  narrationSectionCount += sections.length;
  narrationSentenceCount += sections.reduce((total, section) => total + section.sentences.length, 0);
}

if (narrationSectionCount !== 1149 || narrationSentenceCount !== 2292) {
  throw new Error(
    `Narration inventory changed: ${narrationSectionCount} sections, ${narrationSentenceCount} sentences.`,
  );
}

console.log(
  `Validated ${index.length} lessons, ${stepCount} steps, ${narrationSectionCount} narration sections, and ${narrationSentenceCount} sentence references.`,
);
