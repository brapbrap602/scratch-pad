import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { collectLessonNames, inlineCategory } from '../../js/inline-blocks.js';

const lesson = async (id) => JSON.parse(await readFile(new URL(`../../curriculum/${id}.json`, import.meta.url), 'utf8'));

test('inline blocks are coloured by the Scratch category a learner finds them in', () => {
  const cases = {
    'when I receive Reset Game': 'events',
    'broadcast Hit Brick and wait': 'events',
    'when I start as a clone': 'control',
    'repeat until not Game State = playing': 'control',
    'if on edge, bounce': 'motion',
    'go to x: (0) y: (-145)': 'motion',
    'change y by -7': 'motion',
    'switch costume to Cracked': 'looks',
    'set size to 100%': 'looks',
    'touching Player Laser': 'sensing',
    'Laser Active = 1': 'operators',
    'pick random 1 to 5': 'operators',
    'set Laser Active to 0': 'variables',
    'add 0 to Shot X': 'variables',
    'start sound': 'sound',
    'define Try to build': 'my-blocks',
  };
  for (const [source, category] of Object.entries(cases)) assert.equal(inlineCategory(source), category, source);
});

test('lesson names decide whether a bare word is a variable, a My Block, or just a name', async () => {
  const names = collectLessonNames(await lesson('tower-defense'));
  assert.equal(inlineCategory('Reload Time', names), 'variables');
  assert.equal(inlineCategory('Shot X', names), 'variables');
  assert.equal(inlineCategory('Try to build', names), 'my-blocks');
  assert.equal(inlineCategory('Tower', names), null);
  assert.equal(inlineCategory('For this sprite only', names), null);
  assert.ok(!names.variables.has('myself'), 'clone menus are not variables');
});
