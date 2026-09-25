import assert from 'node:assert/strict';
import test from 'node:test';
import { createNarrationGroups } from '../../js/narration-groups.js';

test('groups instructions and welcome lists without crossing step or help boundaries', () => {
  const ids = [
    'welcome/objective/000', 'welcome/objective/001',
    'welcome/prerequisite/000', 'welcome/requirement/000',
    'welcome/vocabulary/000', 'welcome/vocabulary/001',
    'chapter/first/overview', 'chapter/first/instruction/000',
    'chapter/first/instruction/001', 'chapter/first/checkpoint',
    'chapter/first/hint/000', 'chapter/first/hint/001',
    'chapter/first/debug/000', 'chapter/second/instruction/000',
  ];
  const sections = ids.map((id) => ({
    id, sentences: [{ src: `${id}-a.mp3` }, { src: `${id}-b.mp3` }],
  }));
  const original = structuredClone(sections);
  const groups = createNarrationGroups(sections);
  assert.equal(groups.size, 11);
  for (const [id, members] of [
    ['welcome/objective', [0, 1]],
    ['welcome/vocabulary', [4, 5]],
    ['chapter/first/instruction', [7, 8]],
    ['chapter/second/instruction', [13]],
  ]) {
    assert.deepEqual(groups.get(id).sentences, members.flatMap((index) => sections[index].sentences));
  }
  assert.ok(groups.has('chapter/first/hint/000'));
  assert.ok(groups.has('chapter/first/hint/001'));
  assert.ok(groups.has('chapter/first/debug/000'));
  assert.deepEqual(sections, original);
  assert.equal([...groups.values()].flatMap(({ sentences }) => sentences).length, 28);
});
