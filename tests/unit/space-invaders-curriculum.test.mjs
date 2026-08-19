import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const lesson = JSON.parse(
  await readFile(new URL('../../curriculum/space-invaders.json', import.meta.url), 'utf8'),
);
const steps = lesson.chapters.flatMap(({ steps: chapterSteps }) => chapterSteps);
const step = (id) => steps.find((candidate) => candidate.id === id);
const codeFor = (target) => step('final-release-checkpoint').finishedCode
  .find((entry) => entry.target === target).code;

test('Space Invaders supports chapter recovery without a Scratch account', () => {
  const chapterCheckpoints = lesson.chapters.map(({ steps: chapterSteps }) => chapterSteps.at(-1));
  for (const checkpoint of chapterCheckpoints) {
    assert.match(checkpoint.instructions.join('\n'), /File > Save to your computer/);
  }

  const learnerText = JSON.stringify(lesson);
  assert.doesNotMatch(learnerText, /project notes/i);
  assert.doesNotMatch(learnerText, /share (?:or )?(?:the )?project/i);
  assert.match(learnerText, /File > Load from your computer/);
});

test('Space Invaders explicitly teaches the safe invasion rule and its test path', () => {
  const receivers = step('receive-march-messages');
  assert.match(receivers.instructions.join('\n'), /y position.*-60.*Game State.*playing/i);
  assert.match(receivers.checkpoint.task, /Stage/i);
  assert.doesNotMatch(receivers.checkpoint.task, /Click each Alien receiver/i);

  const invasionCode = codeFor('Alien - fleet march and invasion');
  assert.match(invasionCode, /\(y position\) < \(-60\)/);
});

test('Space Invaders cleans up every sprite before stopping at an ending', () => {
  const endingCode = codeFor('Stage - win and endings');
  for (const message of ['Win', 'Lose']) {
    assert.match(
      endingCode,
      new RegExp(`when I receive \\[${message} v\\][\\s\\S]*broadcast \\[End Cleanup v\\] and wait[\\s\\S]*switch backdrop[\\s\\S]*stop \\[all v\\]`),
    );
  }

  for (const target of [
    'Player - reset and movement',
    'Alien - factory and collision',
    'Player Laser',
    'Enemy Shot',
    'Bunker',
    'Mothership',
  ]) {
    assert.match(codeFor(target), /when I receive \[End Cleanup v\]/, target);
  }
});

test('Space Invaders terminal collisions are state-guarded without silent loop changes', () => {
  for (const target of ['Alien - factory and collision', 'Bunker']) {
    assert.match(codeFor(target), /\(Game State\) = \[playing\]/, target);
  }

  assert.match(
    codeFor('Mothership'),
    /if <<<<\(Game State\) = \[playing\]>[\s\S]*touching \[Player Laser v\]\?>> then/,
  );

  assert.match(codeFor('Enemy Shot'), /when I receive \[Start Game v\]\nforever/);
  assert.match(codeFor('Mothership'), /when I receive \[Start Game v\]\nforever/);
  assert.match(step('audit-architecture').instructions.join('\n'), /Game State.*playing.*Alien.*Bunker.*Mothership/i);
});
