export const PROGRESS_KEY = 'scratchLessonsProgress:v1';

const EMPTY_LESSON = () => ({ completedStepIds: [], lastViewedStepId: null });
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalize = (value) => {
  const normalized = { version: 1, lessons: {} };
  if (value === null || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) {
    return normalized;
  }
  if (value.lessons === null || typeof value.lessons !== 'object' || Array.isArray(value.lessons)) {
    return normalized;
  }

  for (const [lessonId, lesson] of Object.entries(value.lessons)) {
    if (!ID_PATTERN.test(lessonId) || lesson === null || typeof lesson !== 'object') continue;
    const completed = Array.isArray(lesson.completedStepIds)
      ? [...new Set(lesson.completedStepIds.filter((id) => typeof id === 'string' && ID_PATTERN.test(id)))]
      : [];
    const lastViewedStepId =
      typeof lesson.lastViewedStepId === 'string' && ID_PATTERN.test(lesson.lastViewedStepId)
        ? lesson.lastViewedStepId
        : null;
    normalized.lessons[lessonId] = { completedStepIds: completed, lastViewedStepId };
  }
  return normalized;
};

export const createProgressStore = (storage = globalThis.localStorage) => {
  let persistent = true;
  let state;
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    state = normalize(raw === null ? null : JSON.parse(raw));
  } catch {
    state = normalize(null);
    persistent = false;
  }

  const save = () => {
    try {
      storage.setItem(PROGRESS_KEY, JSON.stringify(state));
    } catch {
      persistent = false;
    }
  };

  const ensureLesson = (lessonId) => {
    if (!ID_PATTERN.test(lessonId)) throw new TypeError('Invalid lesson ID');
    state.lessons[lessonId] ??= EMPTY_LESSON();
    return state.lessons[lessonId];
  };

  return {
    getLesson(lessonId) {
      const lesson = ensureLesson(lessonId);
      return {
        completedStepIds: [...lesson.completedStepIds],
        lastViewedStepId: lesson.lastViewedStepId,
      };
    },
    markViewed(lessonId, stepId) {
      if (!ID_PATTERN.test(stepId)) throw new TypeError('Invalid step ID');
      ensureLesson(lessonId).lastViewedStepId = stepId;
      save();
    },
    setCompleted(lessonId, stepId, completed) {
      if (!ID_PATTERN.test(stepId)) throw new TypeError('Invalid step ID');
      const lesson = ensureLesson(lessonId);
      lesson.completedStepIds = lesson.completedStepIds.filter((id) => id !== stepId);
      if (completed) lesson.completedStepIds.push(stepId);
      save();
    },
    isPersistent: () => persistent,
  };
};
