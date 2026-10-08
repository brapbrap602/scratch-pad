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
    /File > Save now.*reference/,
    /File > Save as a copy/,
    /title to Tower Defense My Levels/,
    /separate.*if <\(Level\) = \(3\)> then.*after the Level 2 if.*Load level settings/,
    /Inside.*Waves in Level/,
    /separate.*if <\(Level\) = \(3\)> then.*after the Level 2 if.*Load wave settings/,
    /Inside.*positive Enemy Count and Spawn Gap/,
    /Final Level from 2 to 3/,
    /Revise one setting.*retest/,
  ]);
  const release = steps.find(({ id }) => id === 'tower-defense-release');
  assertInstructionsInOrder(release.instructions, [
    /Tower Defense My Levels.*File > Save now/,
    /My Stuff.*See inside on Tower Defense,/,
    /Final Level to 2.*reopened project/,
    /My Stuff again.*Tower Defense My Levels/,
  ]);
});

test('tower defense begins with a runnable one-enemy checkpoint and a saved-project test', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  validateLessonDocument(lesson, 'tower-defense');
  const checkpoint = lesson.chapters[0].steps.at(-1);
  assert.equal(checkpoint.kind, 'checkpoint');
  assert.ok(checkpoint.finishedCode.some(({ target }) => target === 'Stage'));
  assert.ok(checkpoint.finishedCode.some(({ target }) => target === 'Enemy'));
  assert.match(checkpoint.instructions.join(' '), /File > Save now/);
  assert.match(checkpoint.instructions.join(' '), /My Stuff/);
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

// Mirrors the finished game's update order: spawn, Tower Step, Enemy Step, countdown.
const playWave = ({ count, gap, hp, built, reload, health }) => {
  const shotX = Array(7).fill(0); const active = Array(7).fill(0); const wait = Array(7).fill(0);
  let spawned = 0; let countdown = 0; let coins = 0; const enemies = [];
  for (let update = 0; update < 10000; update += 1) {
    if (spawned < count && countdown === 0) {
      const lane = (spawned % 3) + 1;
      spawned += 1;
      enemies.push({ firstSlot: lane * 2 - 1, hp, x: 220 });
      countdown = gap;
    }
    for (let id = 1; id <= 6; id += 1) {
      if (!built.includes(id)) continue;
      if (active[id] === 1 && shotX[id] > 230) active[id] = 0;
      if (wait[id] > 0) wait[id] -= 1;
      if (active[id] === 0 && wait[id] === 0) { shotX[id] = -135; active[id] = 1; wait[id] = reload; }
      shotX[id] += 10;
    }
    for (const enemy of [...enemies]) {
      enemy.x -= 2;
      for (const slot of [enemy.firstSlot, enemy.firstSlot + 1]) {
        if (enemy.hp > 0 && active[slot] === 1 && !(shotX[slot] < enemy.x - 12) && !(shotX[slot] - 10 > enemy.x + 14)) {
          active[slot] = 0;
          enemy.hp -= 1;
        }
      }
      if (enemy.hp < 1) { coins += 10; enemies.splice(enemies.indexOf(enemy), 1); }
      else if (enemy.x < -209) { health -= 1; enemies.splice(enemies.indexOf(enemy), 1); }
    }
    if (health < 1) return { health, coins };
    if (spawned === count && enemies.length === 0) return { health, coins };
    if (countdown > 0) countdown -= 1;
  }
  throw new Error('wave did not finish');
};

const playLevel = (settings, order) => {
  let { coins, health } = settings;
  const built = [];
  for (const wave of settings.waves) {
    while (built.length < order.length && coins >= 30) { built.push(order[built.length]); coins -= 30; }
    const result = playWave({ ...wave, hp: settings.hp, reload: settings.reload, built, health });
    coins += result.coins;
    health = result.health;
    if (health < 1) return 0;
  }
  return health;
};

test('reload time and Level 2 settings make tower placement matter', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  const reference = lesson.chapters.at(-1).steps.at(-1).finishedCode;
  const tower = reference.find(({ target }) => target.startsWith('Tower - shooting')).code;
  assert.match(tower, /if <\(Reload\) > \(0\)> then\n\s+change \[Reload v\] by \(-1\)/);
  assert.match(tower, /if <<\(item \(ID\) of \[Shot Active v\]\) = \(0\)> and <\(Reload\) = \(0\)>> then/);
  assert.match(tower, /set \[Reload v\] to \(Reload Time\)/);

  const stage = reference.find(({ target }) => target.startsWith('Stage - two-level')).code;
  const value = (pattern) => Number(stage.match(pattern)[1]);
  const common = {
    coins: value(/define Load level settings\nset \[Starting Coins v\] to \((\d+)\)/),
    health: value(/set \[Starting Health v\] to \((\d+)\)/),
    hp: value(/set \[Enemy HP v\] to \((\d+)\)\nset \[Reload Time/),
    reload: value(/set \[Reload Time v\] to \((\d+)\)/),
  };
  const levelOne = { ...common, waves: [3, 3, 6].map((count) => ({ count, gap: 18 })) };
  const levelTwo = {
    ...common,
    coins: value(/if <\(Level\) = \(2\)> then\n  set \[Waves in Level v\] to \(2\)\n  set \[Starting Coins v\] to \((\d+)\)/),
    hp: value(/set \[Starting Coins v\] to \(\d+\)\n  set \[Enemy HP v\] to \((\d+)\)/),
    waves: [6, 9].map((count) => ({ count, gap: 15 })),
  };
  const oneEachLane = [1, 3, 5];
  const everyLaneThenExtras = [1, 3, 5, 2, 4, 6];
  const twoLanes = [1, 2, 3, 4];

  assert.equal(playLevel(levelOne, oneEachLane), common.health, 'Level 1 is a fair first level');
  assert.ok(playLevel(levelOne, twoLanes) < common.health, 'Level 1 still shows an unguarded lane');
  const thin = playLevel(levelTwo, oneEachLane);
  assert.ok(thin > 0 && thin < common.health, `one tower per lane should barely survive Level 2 (health ${thin})`);
  assert.equal(playLevel(levelTwo, everyLaneThenExtras), common.health, 'spending coins on extra towers pays off');
  assert.equal(playLevel(levelTwo, twoLanes), 0, 'leaving a lane open loses Level 2');
  assert.equal(playLevel({ ...levelTwo, reload: 0 }, oneEachLane), common.health, 'without reload, placement would not matter');
});

test('Chapters 4 and 5 open with a clone warm-up and end every step with something to run', async () => {
  const lesson = JSON.parse(await readFile(new URL('../../curriculum/tower-defense.json', import.meta.url), 'utf8'));
  const [chapterFour, chapterFive] = lesson.chapters.slice(3, 5);
  const warmUp = chapterFour.steps[0];
  assert.equal(warmUp.id, 'try-a-clone');
  assert.match(warmUp.finishedCode[0].code, /set \[My Number v\] to \(1\)[\s\S]*create clone[\s\S]*set \[My Number v\] to \(0\)/);
  assert.match(warmUp.instructions.at(-1), /delete/i);

  for (const step of [...chapterFour.steps, ...chapterFive.steps].filter(({ kind }) => kind !== 'checkpoint')) {
    assert.doesNotMatch(step.checkpoint.task, /trace|explain|on paper|work out|read the/i, `${step.id} checkpoint should be run, not traced on paper`);
  }
  // Each Chapter 4 step that adds a Stage message shows the green-flag script that sends it.
  for (const [id, message] of [['number-the-spots', 'Initialize Originals'], ['make-six-towers', 'Present Level'], ['enemies-in-three-lanes', 'Spawn Enemy']]) {
    const stage = chapterFour.steps.find((step) => step.id === id).finishedCode.find(({ code }) => code.startsWith('when green flag clicked'));
    assert.ok(stage?.code.includes(`broadcast [${message} v] and wait`), `${id} should show the Stage sending ${message}`);
  }
});
