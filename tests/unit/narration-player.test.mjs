import assert from 'node:assert/strict';
import test from 'node:test';

import { createNarrationPlayer } from '../../js/narration-player.js';

class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.currentTime = 0;
    this.ended = false;
    this.error = null;
    this.paused = true;
    this.src = '';
    this.playCalls = 0;
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  load() {}

  removeAttribute(name) {
    if (name === 'src') this.src = '';
  }

  emit(type) {
    if (type === 'ended') this.ended = true;
    if (type === 'error') this.error = new Error('media error');
    this.dispatchEvent(new Event(type));
    if (type === 'ended') this.ended = false;
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('plays an ordered sentence queue and returns to idle at the end', async () => {
  const audio = new FakeAudio();
  const states = [];
  const player = createNarrationPlayer({
    audioFactory: () => audio,
    onState: (state) => states.push(state),
  });

  player.toggle('overview', [{ src: 'one.mp3' }, { src: 'two.mp3' }]);
  await flush();
  assert.equal(audio.src, 'one.mp3');
  assert.equal(player.getState().state, 'playing');

  audio.emit('ended');
  await flush();
  assert.equal(audio.src, 'two.mp3');
  assert.equal(player.getState().state, 'playing');

  audio.emit('ended');
  assert.deepEqual(player.getState(), { sectionId: null, state: 'idle', sentenceIndex: -1 });
  assert.equal(states.at(-1).state, 'idle');
});

test('pauses and resumes the current sentence without resetting time', async () => {
  const audio = new FakeAudio();
  const player = createNarrationPlayer({ audioFactory: () => audio });
  const queue = [{ src: 'one.mp3' }];

  player.toggle('instruction', queue);
  await flush();
  audio.currentTime = 1.25;
  player.toggle('instruction', queue);
  assert.equal(player.getState().state, 'paused');
  assert.equal(audio.currentTime, 1.25);

  player.toggle('instruction', queue);
  await flush();
  assert.equal(player.getState().state, 'playing');
  assert.equal(audio.currentTime, 1.25);
});

test('ignores stale play failures and media events after switching sections', async () => {
  const audio = new FakeAudio();
  let rejectOld;
  audio.play = () => new Promise((resolve, reject) => {
    audio.paused = false;
    if (!rejectOld) rejectOld = reject;
    else resolve();
  });
  const errors = [];
  const player = createNarrationPlayer({
    audioFactory: () => audio,
    onError: (error) => errors.push(error),
  });

  player.toggle('old', [{ src: 'old.mp3' }]);
  player.toggle('new', [{ src: 'new.mp3' }]);
  await flush();
  rejectOld(new DOMException('replaced', 'AbortError'));
  audio.dispatchEvent(new Event('ended'));
  audio.dispatchEvent(new Event('pause'));
  await flush();

  assert.equal(errors.length, 0);
  assert.equal(player.getState().sectionId, 'new');
  assert.equal(player.getState().state, 'playing');
});

test('stop resets source, time, and active queue', async () => {
  const audio = new FakeAudio();
  const player = createNarrationPlayer({ audioFactory: () => audio });
  player.toggle('hint', [{ src: 'hint.mp3' }]);
  await flush();
  audio.currentTime = 2;

  player.stop();
  assert.equal(audio.src, '');
  assert.equal(audio.currentTime, 0);
  assert.deepEqual(player.getState(), { sectionId: null, state: 'idle', sentenceIndex: -1 });
});
