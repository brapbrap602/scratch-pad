import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateLessonDocument } from '../../js/content.js';

const assertInstructionsInOrder = (instructions, patterns) => {
  let previous = -1;
  for (const pattern of patterns) {
    const index = instructions.findIndex((entry, position) => position > previous && pattern.test(entry));
    assert.notEqual(index, -1, `Missing ordered instruction ${pattern} after entry ${previous}`);
    previous = index;
  }
};

test('one-shot setup separates sprite-only IDs and connects preparation before combat', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  const setup = lesson.chapters.flatMap(({ steps }) => steps).find(({ id }) => id === 'one-numbered-shot');
  assertInstructionsInOrder(setup.instructions, [
    /delete all of Shot X.*set Game State to resetting.*add 0 to Shot X/,
    /delete all of Shot Active.*add 0 to Shot Active/,
    /On Tower.*ID.*For this sprite only/,
    /set ID to 1.*when I receive Prepare Tower/,
    /On Shot.*ID.*For this sprite only/,
    /On Shot.*when I receive Prepare Shot.*set ID to 1.*hide/,
    /On the Stage.*broadcast Prepare Shot and wait.*before Game State becomes combat/,
  ]);
});

test('level extension instructions preserve the reference and add separate settings branches', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  const steps = lesson.chapters.flatMap(({ steps }) => steps);
  const challenge = steps.find(({ id }) => id === 'design-your-own-level');
  assertInstructionsInOrder(challenge.instructions, [
    /Save.*tower-defense-two-levels\.sb3/,
    /separate.*if <\(Level\) = \(3\)> then.*after the Level 2 if.*Load level settings/,
    /Inside.*Waves in Level/,
    /separate.*if <\(Level\) = \(3\)> then.*after the Level 2 if.*Load wave settings/,
    /Inside.*positive Enemy Count and Spawn Gap/,
    /Final Level from 2 to 3/,
    /Revise one setting.*retest/,
  ]);
  const release = steps.find(({ id }) => id === 'tower-defense-release');
  assertInstructionsInOrder(release.instructions, [
    /different filename.*tower-defense-my-levels\.sb3/,
    /fresh editor.*tower-defense-two-levels\.sb3/,
    /Final Level to 2.*reopened file/,
    /another fresh editor.*separately saved extension/,
  ]);
});

test('tower defense begins with a runnable one-enemy checkpoint and a saved-project test', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  validateLessonDocument(lesson, 'tower-defense');
  const checkpoint = lesson.chapters[0].steps.at(-1);
  assert.equal(checkpoint.kind, 'checkpoint');
  assert.ok(checkpoint.finishedCode.some(({ target }) => target === 'Stage'));
  assert.ok(checkpoint.finishedCode.some(({ target }) => target === 'Enemy'));
  assert.match(checkpoint.instructions.join(' '), /Save to your computer/);
  assert.match(checkpoint.instructions.join(' '), /Load from your computer/);
  assert.match(checkpoint.checkpoint.expectedResult, /4/);
});

test('the complete reference resolves every My Block call on its own sprite', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  assert.deepEqual(lesson.chapters.map(({ id }) => id), [
    'one-lane', 'one-tower', 'one-shot', 'six-spots', 'waves-and-endings', 'make-another-level',
  ]);
  const reference = lesson.chapters.at(-1).steps.at(-1).finishedCode;
  const actors = new Map();
  for (const { target, code } of reference) {
    const actor = target.split(/ - |;/)[0];
    actors.set(actor, [...(actors.get(actor) ?? []), ...code.split('\n')]);
  }
  assert.deepEqual([...actors.keys()].sort(), ['Enemy', 'Next Level', 'Shot', 'Stage', 'Start Wave', 'Tower']);
  for (const [actor, lines] of actors) {
    const definitions = lines.filter((line) => line.startsWith('define '))
      .map((line) => line.slice(7).split(' (')[0]);
    assert.equal(new Set(definitions).size, definitions.length, `${actor} has duplicate definitions`);
    for (const line of lines.filter((line) => line.endsWith(' :: custom'))) {
      const name = line.trim().replace(/ :: custom$/, '').split(' (')[0];
      assert.ok(definitions.includes(name), `${actor} calls undefined My Block ${name}`);
    }
  }
});

test('Next Level cannot turn into Start Wave under a repeated click at the same position', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  const reference = lesson.chapters.at(-1).steps.at(-1).finishedCode;
  const center = (target) => {
    const code = reference.find((entry) => entry.target === target).code;
    const match = code.match(/go to x: \((-?\d+)\) y: \((-?\d+)\)/);
    assert.ok(match, `${target} needs an explicit position`);
    return { x: Number(match[1]), y: Number(match[2]) };
  };
  const start = center('Start Wave');
  const next = center('Next Level');
  // Maximum costume dimensions taught by the two button-building steps.
  const separatedHorizontally = Math.abs(start.x - next.x) > (130 + 190) / 2;
  const separatedVertically = Math.abs(start.y - next.y) > (30 + 32) / 2;
  assert.ok(separatedHorizontally || separatedVertically, 'Button bounds must not overlap across the level transition');
});
