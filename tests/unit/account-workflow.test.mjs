import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ids = JSON.parse(await readFile(new URL('../../curriculum/lessons.json', import.meta.url), 'utf8'));

test('every lesson keeps projects in the learner\'s Scratch account, never in downloaded files', async () => {
  for (const id of ids) {
    const lesson = JSON.parse(await readFile(new URL(`../../curriculum/${id}.json`, import.meta.url), 'utf8'));
    const learnerText = JSON.stringify(lesson);
    assert.match(lesson.requirements[0], /scratch\.mit\.edu.*signed in/, id);
    assert.doesNotMatch(learnerText, /Save to your computer|Load from your computer|\.sb3|desktop app|fresh editor/i, id);
    for (const chapter of lesson.chapters) {
      const checkpoint = chapter.steps.at(-1);
      assert.match(checkpoint.instructions.join('\n'), /File > Save now/, `${id} ${checkpoint.id}`);
    }
  }
});
