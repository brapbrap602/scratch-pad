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

const assertInstructionsInOrder = (instructions, patterns) => {
  let index = 0;
  for (const pattern of patterns) {
    const match = instructions.findIndex((instruction, candidate) =>
      candidate >= index && pattern.test(instruction));
    assert.notEqual(match, -1, `Missing instruction after index ${index}: ${pattern}`);
    index = match + 1;
  }
};

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

test('Space Invaders creates messages only when their first real scripts need them', () => {
  const shared = step('create-shared-language').instructions.join('\n');
  const march = step('receive-march-messages').instructions.join('\n');
  const firing = step('prepare-single-player-laser').instructions.join('\n');
  const endings = step('detect-win-and-finish-loss').instructions.join('\n');

  assert.match(shared, /create `Reset Game` and `Start Game`/);
  assert.match(shared, /Later chapters create each new message when its first real script is built/);
  assert.doesNotMatch(shared, /create `Reset Game`, `Start Game`, `Fire Laser`/);
  assert.match(march, /New message.*`March Right`/i);
  assert.match(march, /`March Left`.*New message/i);
  assert.match(march, /New message.*create `March Down`[\s\S]*create `Lose`/i);
  assert.match(firing, /New message.*create `Fire Laser`/i);
  assert.match(endings, /New message.*create `Win`/i);
  assert.match(endings, /New message.*create `End Cleanup`/i);
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
    'Alien - cloning and collision',
    'Player Laser',
    'Enemy Shot',
    'Bunker',
    'Mothership',
  ]) {
    assert.match(codeFor(target), /when I receive \[End Cleanup v\]/, target);
  }
});

test('Space Invaders terminal collisions are state-guarded without silent loop changes', () => {
  for (const target of ['Alien - cloning and collision', 'Bunker']) {
    assert.match(codeFor(target), /\(Game State\) = \[playing\]/, target);
  }

  assert.match(
    codeFor('Mothership'),
    /if <<<<\(Game State\) = \[playing\]>[\s\S]*touching \[Player Laser v\]\?>> then/,
  );

  assert.match(codeFor('Enemy Shot'), /when I receive \[Start Game v\]\nforever/);
  assert.match(codeFor('Mothership'), /when I receive \[Start Game v\]\nforever/);
  const auditInstructions = step('audit-architecture').instructions.join('\n');
  for (const target of ['Alien', 'Bunker', 'Mothership']) {
    assert.match(auditInstructions, new RegExp(`Game State.*playing.*${target}`, 'i'));
  }
});

test('Chapter 4 setup gives preteens the exact proven costume and reset UI path', () => {
  const setup = step('prepare-shots-and-bunkers');
  const instructions = setup.instructions.join('\n');
  const learnerText = [setup.explanation, instructions, ...setup.hints].join('\n');

  assert.match(instructions, /select Bunker.*click.*Costumes/i);
  assert.match(instructions, /type `Full`.*press Enter/i);
  assert.match(instructions, /right-click.*`Full`.*duplicate.*`Damaged`/i);
  assert.match(instructions, /right-click.*`Full`.*duplicate.*`Critical`/i);
  assert.match(instructions, /Eraser.*size.*10.*two.*upper edge.*`Damaged`.*three.*upper edge.*`Critical`.*solid.*center/i);
  assert.match(instructions, /existing `when I receive Reset Game` script.*under.*`hide`/i);
  assert.doesNotMatch(learnerText, /add a reset script/i);
  assert.match(learnerText, /trackpad.*two-finger/i);
});

test('Chapter 4 launcher explains the proven nested math and Boolean assembly order', () => {
  const launcher = step('launch-lane-enemy-shot');
  const instructions = launcher.instructions.join('\n');

  assertInstructionsInOrder(launcher.instructions, [
    /Events.*when I receive.*Start Game/i,
    /Control.*forever/i,
    /set x to.*`\+`/i,
    /Fleet X.*left.*`\+`.*`\*`.*right/i,
    /Shot Lane.*left.*`\*`.*45.*right/i,
    /set y to.*`-`/i,
    /Fleet Y.*left.*75.*right/i,
    /empty part of the Code area.*outer `or`/i,
    /second `or`.*left/i,
    /right.*outer `or`.*`not`.*Game State.*playing/i,
    /grab.*completed outer `or`.*place.*repeat until/i,
    /empty part of the Code area.*change y by -7.*wait 0.03/i,
    /drag.*inside.*repeat until/i,
    /after `repeat until`.*inside.*Game State.*playing/i,
  ]);
  assert.match(instructions, /Shot Lane.*checkbox.*eight/i);
});

test('Chapter 4 Player collision explains insertion, ordering, and repeatable testing', () => {
  const collision = step('enemy-shot-hits-player');
  const instructions = collision.instructions.join('\n');

  assert.match(instructions, /thin connection.*`change y by -7`.*`wait 0.03 seconds`/i);
  assert.match(instructions, /`and`.*left.*Enemy Shot Active.*right.*touching Player/i);
  assert.match(instructions, /first block.*set Enemy Shot Active to 0/i);
  assert.match(instructions, /under.*nested `if then`.*Game State.*playing/i);
  assert.match(instructions, /inside.*nested.*set Game State to lost.*broadcast Lose/i);
  assert.match(instructions, /miss.*Game State.*playing.*Enemy Shot Active.*0/i);
  assert.match(instructions, /hit.*Game State.*lost.*green flag.*reset/i);
});

test('Chapter 4 Bunkers explain clone numbering, sibling damage paths, and independent proof', () => {
  const bunkers = step('build-three-bunkers');
  const instructions = bunkers.instructions.join('\n');
  const code = bunkers.finishedCode.map(({ code: source }) => source).join('\n');

  assertInstructionsInOrder(bunkers.instructions, [
    /existing.*Reset Game.*hide.*set Bunker Number to 0.*repeat 3/i,
    /inside.*repeat.*create clone of myself/i,
    /directly under.*change Bunker Number by 1/i,
    /when I start as a clone/i,
    /-130.*left.*`\+`.*Bunker Number.*130.*right.*y.*-105/i,
    /set Health to 3.*switch costume to Full.*show.*forever/i,
    /`and`.*condition space/i,
    /left.*Laser Active.*right.*touching Player Laser/i,
    /first.*set Laser Active to 0/i,
    /change Health by -1/i,
    /Health = 2.*Damaged.*Health = 1.*Critical.*Health = 0.*hide.*delete this clone/i,
    /below.*first.*second.*if.*same forever.*not.*inside/i,
    /Enemy Shot Active.*touching Enemy Shot/i,
    /left bunker twice.*right bunker once/i,
    /Critical.*middle.*Full.*right.*Damaged/i,
    /left bunker.*third.*delete.*fourth/i,
    /left.*pass.*middle.*absorb/i,
    /Enemy Shot/i,
    /miss.*gap.*valid.*Game State.*playing/i,
    /lane.*Bunker/i,
  ]);
  const safeDeletion = /if <\(Health\) = \(0\)> then\n\s+hide\n\s+delete this clone/g;
  assert.equal([...code.matchAll(safeDeletion)].length, 2);
  assert.equal([...codeFor('Bunker').matchAll(safeDeletion)].length, 2);
});

test('Chapter 5 win testing preserves collision-safe laser movement', () => {
  const checkpoint = step('endings-checkpoint');
  const hints = checkpoint.hints.join('\n');
  const laserMovementBlueprints = steps
    .flatMap(({ finishedCode = [] }) => finishedCode)
    .filter(({ target, code }) => target.includes('Player Laser') && code.includes('change y by'));

  assert.doesNotMatch(hints, /move Player Laser by 20/i);
  assert.match(hints, /Stage.*three.*wait 0\.35 seconds.*wait 99 seconds/i);
  assert.match(hints, /Enemy Shot.*1\.5 to 3.*99 to 99.*Mothership.*8 to 14.*99 to 99/i);
  assert.match(checkpoint.hints[2], /keep Player Laser moving by 10.*cannot skip through a target/i);
  assert.match(checkpoint.hints[3], /restore all five original waits/i);
  assert.ok(laserMovementBlueprints.length > 0);
  for (const { code } of laserMovementBlueprints) {
    assert.match(code, /change y by \(10\)/);
    assert.doesNotMatch(code, /change y by \(20\)/);
  }
});
