export const createNarrationPlayer = ({
  audioFactory = () => new Audio(),
  onState = () => {},
  onError = () => {},
} = {}) => {
  const audio = audioFactory();
  audio.preload = 'none';
  let epoch = 0;
  let activeSectionId = null;
  let queue = [];
  let sentenceIndex = -1;
  let state = 'idle';
  let desiredPlaying = false;
  let removeSourceListeners = () => {};

  const snapshot = () => ({ sectionId: activeSectionId, state, sentenceIndex });
  const emitState = () => onState(snapshot());

  const clearSource = () => {
    removeSourceListeners();
    removeSourceListeners = () => {};
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // Media cleanup is best-effort after the operation has been invalidated.
    }
  };

  const reset = ({ notify = true } = {}) => {
    const previousSectionId = activeSectionId;
    epoch += 1;
    activeSectionId = null;
    queue = [];
    sentenceIndex = -1;
    state = 'idle';
    desiredPlaying = false;
    clearSource();
    if (notify && previousSectionId !== null) {
      onState({ sectionId: previousSectionId, state: 'idle', sentenceIndex: -1 });
    }
  };

  const fail = (operationEpoch, error) => {
    if (operationEpoch !== epoch || activeSectionId === null) return;
    const failedSectionId = activeSectionId;
    reset({ notify: false });
    onState({ sectionId: failedSectionId, state: 'idle', sentenceIndex: -1 });
    onError(error instanceof Error ? error : new Error('Narration playback failed'));
  };

  const playCurrent = async (operationEpoch) => {
    if (operationEpoch !== epoch || !desiredPlaying) return;
    state = 'loading';
    emitState();
    try {
      await audio.play();
      if (operationEpoch !== epoch || !desiredPlaying) return;
      state = 'playing';
      emitState();
    } catch (error) {
      if (operationEpoch !== epoch || !desiredPlaying) return;
      fail(operationEpoch, error);
    }
  };

  const loadSentence = (index, operationEpoch) => {
    if (operationEpoch !== epoch || index < 0 || index >= queue.length) return;
    removeSourceListeners();
    sentenceIndex = index;
    const expectedSrc = queue[index].src;

    const ended = () => {
      if (
        operationEpoch !== epoch
        || !audio.ended
        || audio.src !== expectedSrc && !audio.src.endsWith(expectedSrc)
      ) return;
      if (sentenceIndex + 1 < queue.length) {
        loadSentence(sentenceIndex + 1, operationEpoch);
        void playCurrent(operationEpoch);
      } else {
        reset();
      }
    };
    const error = () => {
      if (operationEpoch !== epoch || !audio.error) return;
      fail(operationEpoch, new Error(`Unable to play narration audio: ${expectedSrc}`));
    };
    audio.addEventListener('ended', ended);
    audio.addEventListener('error', error);
    removeSourceListeners = () => {
      audio.removeEventListener('ended', ended);
      audio.removeEventListener('error', error);
    };
    audio.src = expectedSrc;
    audio.currentTime = 0;
  };

  const toggle = (sectionId, sentences) => {
    if (typeof sectionId !== 'string' || !Array.isArray(sentences) || sentences.length === 0) {
      throw new TypeError('Narration toggle requires a section ID and sentence queue');
    }
    if (sentences.some(({ src }) => typeof src !== 'string' || src === '')) {
      throw new TypeError('Narration sentence queue contains an invalid source');
    }

    if (activeSectionId === sectionId) {
      if (state === 'playing' || state === 'loading') {
        desiredPlaying = false;
        audio.pause();
        state = 'paused';
        emitState();
      } else if (state === 'paused') {
        desiredPlaying = true;
        void playCurrent(epoch);
      }
      return;
    }

    reset();
    activeSectionId = sectionId;
    queue = sentences.map(({ src }) => ({ src }));
    desiredPlaying = true;
    const operationEpoch = ++epoch;
    loadSentence(0, operationEpoch);
    void playCurrent(operationEpoch);
  };

  const handlePause = () => {
    if (activeSectionId === null || !desiredPlaying || state !== 'playing' || !audio.paused) return;
    desiredPlaying = false;
    state = 'paused';
    emitState();
  };
  audio.addEventListener('pause', handlePause);

  return {
    toggle,
    stop: () => reset(),
    getState: snapshot,
    destroy() {
      reset();
      audio.removeEventListener('pause', handlePause);
    },
  };
};
