import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressStore, PROGRESS_KEY } from '../../js/progress.js';

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
};

test('uses a fresh versioned key and ignores legacy progress', () => {
  const storage = memoryStorage({ scratchProgress: '{"brick-breaker":[0,1]}' });
  const store = createProgressStore(storage);

  assert.equal(PROGRESS_KEY, 'scratchLessonsProgress:v1');
  assert.deepEqual(store.getLesson('brick-breaker'), {
    completedStepIds: [],
    lastViewedStepId: null,
  });
});

test('viewing and completing are independent ID-based actions', () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);

  store.markViewed('brick-breaker', 'place-paddle');
  assert.deepEqual(store.getLesson('brick-breaker'), {
    completedStepIds: [],
    lastViewedStepId: 'place-paddle',
  });

  store.setCompleted('brick-breaker', 'place-paddle', true);
  store.setCompleted('brick-breaker', 'place-paddle', true);
  assert.deepEqual(store.getLesson('brick-breaker').completedStepIds, ['place-paddle']);

  store.setCompleted('brick-breaker', 'place-paddle', false);
  assert.deepEqual(store.getLesson('brick-breaker').completedStepIds, []);
});

test('corrupt or unavailable storage never prevents session progress', () => {
  const brokenStorage = {
    getItem: () => '{',
    setItem: () => {
      throw new DOMException('blocked', 'SecurityError');
    },
  };
  const store = createProgressStore(brokenStorage);

  assert.doesNotThrow(() => store.markViewed('space-invaders', 'map-the-game'));
  assert.equal(store.getLesson('space-invaders').lastViewedStepId, 'map-the-game');
  assert.equal(store.isPersistent(), false);
});

test('ticked instructions are saved per step and survive a reload', () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);
  store.setInstructionChecked('brick-breaker', 'place-paddle', 2, true);
  store.setInstructionChecked('brick-breaker', 'place-paddle', 0, true);
  store.setInstructionChecked('brick-breaker', 'place-paddle', 2, true);
  assert.deepEqual(store.getCheckedInstructions('brick-breaker', 'place-paddle'), [0, 2]);

  const reloaded = createProgressStore(storage);
  assert.deepEqual(reloaded.getCheckedInstructions('brick-breaker', 'place-paddle'), [0, 2]);
  reloaded.setInstructionChecked('brick-breaker', 'place-paddle', 0, false);
  reloaded.setInstructionChecked('brick-breaker', 'place-paddle', 2, false);
  assert.deepEqual(reloaded.getCheckedInstructions('brick-breaker', 'place-paddle'), []);
  assert.deepEqual(reloaded.getLesson('brick-breaker'), { completedStepIds: [], lastViewedStepId: null });
});

test('malformed ticked-instruction data is dropped, not trusted', () => {
  const storage = memoryStorage({
    [PROGRESS_KEY]: JSON.stringify({
      version: 1,
      lessons: { 'brick-breaker': { completedStepIds: [], checkedInstructions: { 'Bad Id': [1], 'ok-step': [1, -1, 'x', 1.5, 3] } } },
    }),
  });
  const store = createProgressStore(storage);
  assert.deepEqual(store.getCheckedInstructions('brick-breaker', 'ok-step'), [1, 3]);
  assert.deepEqual(store.getCheckedInstructions('brick-breaker', 'Bad Id'), []);
});
