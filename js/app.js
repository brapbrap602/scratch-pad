import {
  flattenLessonSteps,
  parseRichText,
  validateLessonDocument,
  validateLessonIndex,
} from './content.js';
import { gameArt } from './game-art.js';
import { CATEGORY_LABELS, collectLessonNames, inlineCategory } from './inline-blocks.js';
import { validateNarrationManifest } from './narration-content.js';
import { createNarrationPlayer } from './narration-player.js';
import { createNarrationGroups } from './narration-groups.js';
import { createProgressStore } from './progress.js';

const lessonSelect = document.querySelector('#lesson-select');
const stepsList = document.querySelector('#steps-list');
const courseNavToggle = document.querySelector('#course-nav-toggle');
const contentArea = document.querySelector('#content-area');
const status = document.querySelector('#app-status');
const error = document.querySelector('#app-error');
const narrationStatus = document.querySelector('#narration-status');
const themeToggle = document.querySelector('#theme-toggle');
const progress = createProgressStore();

let currentLesson = null;
let currentSteps = [];
let currentStepId = null;
let requestController = null;
let requestVersion = 0;
let scratchSourceId = 0;
let lessonLoading = false;
let narrationSections = new Map();
let lessonNames = { myBlocks: new Set(), variables: new Set() };
let lessonSummaries = [];
// Chapters the learner has opened in the sidebar; the current step's chapter is always open.
let openChapterIds = new Set();

const element = (tag, options = {}) => {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) node.setAttribute(name, value);
  }
  return node;
};

const setStatus = (message, { visible = false } = {}) => {
  status.textContent = message;
  status.classList.toggle('visually-hidden', !visible || message === '');
};

const setError = (message) => {
  error.textContent = message;
  error.classList.toggle('visually-hidden', message === '');
};

const setNarrationStatus = (message) => {
  narrationStatus.textContent = message;
  narrationStatus.classList.toggle('visually-hidden', message === '');
};

// Inline items are blocks or names written in plain words; show them as chips
// coloured by the Scratch category where the learner finds them.
const inlineChip = (source) => {
  const category = inlineCategory(source, lessonNames);
  const chip = element('code', {
    className: `inline-chip ${category ? `chip-${category}` : 'chip-name'}`,
    text: source,
  });
  if (category) {
    chip.dataset.category = category;
    chip.title = `Find it in ${CATEGORY_LABELS[category]}`;
  }
  return chip;
};

const appendRichText = (container, source) => {
  const stack = [container];
  for (const token of parseRichText(source)) {
    const parent = stack.at(-1);
    if (token.type === 'text') parent.append(document.createTextNode(token.value));
    if (token.type === 'break') parent.append(element('br'));
    if (token.type === 'scratch') parent.append(inlineChip(token.value));
    if (token.type === 'open') {
      const child = element(token.tag, { className: token.className || '' });
      parent.append(child);
      stack.push(child);
    }
    if (token.type === 'close') stack.pop();
  }
};

const narrationIcon = (state) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shape = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  };
  if (state === 'playing' || state === 'loading') {
    svg.append(
      shape('rect', { x: '6', y: '5', width: '4', height: '14', rx: '1' }),
      shape('rect', { x: '14', y: '5', width: '4', height: '14', rx: '1' }),
    );
  } else {
    svg.append(shape('path', { d: 'M8 5v14l11-7z' }));
  }
  return svg;
};

const setNarrationButtonState = (button, state) => {
  const active = state === 'playing' || state === 'loading';
  button.dataset.state = state;
  button.setAttribute(
    'aria-label',
    `${active ? 'Pause' : 'Play'} narration: ${button.dataset.narrationLabel}`,
  );
  button.title = active ? 'Pause narration' : 'Play narration';
  button.replaceChildren(narrationIcon(state));
};

const narrationPlayer = createNarrationPlayer({
  onState: ({ sectionId, state }) => {
    if (!sectionId) return;
    document.querySelectorAll('button[data-narration-section-id]').forEach((button) => {
      if (button.dataset.narrationSectionId === sectionId) setNarrationButtonState(button, state);
    });
  },
  onError: () => setNarrationStatus('Narration could not be played. Try again.'),
});

const createNarrationSlot = (sectionId, label) => {
  const slot = element('span', {
    className: 'narration-slot',
    attrs: {
      'data-narration-slot-id': sectionId,
      'data-narration-label': label,
    },
  });
  const section = narrationSections.get(sectionId);
  if (section) {
    const button = element('button', {
      className: 'narration-button',
      attrs: {
        type: 'button',
        'data-narration-section-id': sectionId,
        'data-narration-label': label,
      },
    });
    setNarrationButtonState(button, 'idle');
    slot.append(button);
  }
  return slot;
};

const attachNarrationControls = (root = document) => {
  root.querySelectorAll('[data-narration-slot-id]').forEach((slot) => {
    if (slot.children.length > 0) return;
    const section = narrationSections.get(slot.dataset.narrationSlotId);
    if (!section) return;
    const button = element('button', {
      className: 'narration-button',
      attrs: {
        type: 'button',
        'data-narration-section-id': section.id,
        'data-narration-label': slot.dataset.narrationLabel,
      },
    });
    setNarrationButtonState(button, 'idle');
    slot.append(button);
  });
};

const renderScratchNode = (node, inline) => {
  if (node.dataset.scratchRendered === 'true') return;
  node.dataset.scratchRendered = 'true';
  if (!window.scratchblocks) {
    node.classList.add('scratch-fallback');
    return;
  }
  const id = `scratch-source-${++scratchSourceId}`;
  node.id = id;
  try {
    window.scratchblocks.renderMatching(`#${id}`, { style: 'scratch3', inline });
  } catch (renderError) {
    node.dataset.scratchRendered = 'false';
    console.error('Scratchblocks rendering failed:', renderError);
  }
};

const renderPendingScratch = (root) => {
  root.querySelectorAll('.scratch-display-source').forEach((node) => renderScratchNode(node, false));
};

const appendNarratedHeading = (parent, title, sectionId) => {
  const row = element('div', { className: 'narrated-heading section-heading' });
  row.append(element('h3', { text: title }), createNarrationSlot(sectionId, title));
  parent.append(row);
};

const createNarratedItem = (text, sectionId, label) => {
  const row = element('div', { className: 'narrated-list-row' });
  row.append(createNarrationSlot(sectionId, label), text);
  return row;
};

const richElement = (tag, source, className = '') => {
  const node = element(tag, { className });
  appendRichText(node, source);
  return node;
};

const appendTextList = (parent, items, className = '', narration = null) => {
  const list = element('ul', { className });
  items.forEach((item, index) => {
    const li = element('li');
    if (narration) {
      li.append(createNarratedItem(
        richElement('span', item),
        `${narration.prefix}/${String(index).padStart(3, '0')}`,
        `${narration.label} ${index + 1}`,
      ));
    } else {
      appendRichText(li, item);
    }
    list.append(li);
  });
  parent.append(list);
};

const updateNavigationState = () => {
  if (!currentLesson) return;
  const lessonProgress = progress.getLesson(currentLesson.id);
  for (const button of stepsList.querySelectorAll('.step-button')) {
    const completed = lessonProgress.completedStepIds.includes(button.dataset.stepId);
    if (button.dataset.stepId === currentStepId) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.classList.toggle('is-complete', completed);
    const mark = button.querySelector('.completion-mark');
    mark.textContent = completed ? 'Completed' : '';
  }
};

const progressBar = (done, total, label) => {
  const track = element('div', {
    className: 'progress-track',
    attrs: {
      role: 'progressbar',
      'aria-label': label,
      'aria-valuemin': '0',
      'aria-valuemax': String(total),
      'aria-valuenow': String(done),
    },
  });
  const fill = element('div', { className: 'progress-fill' });
  fill.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  track.append(fill);
  return track;
};

const renderNavigation = () => {
  stepsList.replaceChildren();
  const lessonProgress = progress.getLesson(currentLesson.id);
  const completedIds = new Set(lessonProgress.completedStepIds);
  const focusStepId = currentStepId ?? lessonProgress.lastViewedStepId ?? currentSteps[0]?.id;
  const focusChapter = currentSteps.find(({ id }) => id === focusStepId)?.chapterId;
  if (focusChapter) openChapterIds.add(focusChapter);

  const totalDone = currentSteps.filter(({ id }) => completedIds.has(id)).length;
  const overview = element('div', { className: 'course-progress' });
  overview.append(
    element('p', { className: 'course-progress-label', text: `${totalDone} of ${currentSteps.length} steps done` }),
    progressBar(totalDone, currentSteps.length, `${currentLesson.title} progress`),
  );
  stepsList.append(overview);

  let stepNumber = 0;
  for (const chapter of currentLesson.chapters) {
    const open = openChapterIds.has(chapter.id);
    const completedCount = chapter.steps.filter((step) => completedIds.has(step.id)).length;
    const group = element('section', { className: 'chapter-group' });
    const listId = `chapter-steps-${chapter.id}`;
    const toggle = element('button', {
      className: 'chapter-toggle',
      attrs: {
        type: 'button',
        'aria-expanded': String(open),
        'aria-controls': listId,
        'data-chapter-toggle': chapter.id,
        'data-chapter-for-step': chapter.steps.map(({ id }) => id).join(' '),
      },
    });
    const done = completedCount === chapter.steps.length;
    toggle.append(
      element('span', { className: 'chapter-title', text: chapter.title }),
      element('span', {
        className: 'chapter-meta',
        text: `${done ? 'All done' : `${completedCount} of ${chapter.steps.length} done`} · ${chapter.estimatedMinutes} min`,
      }),
    );
    group.append(element('h3', { className: 'chapter-heading' }));
    group.querySelector('.chapter-heading').append(toggle);
    if (done) group.classList.add('is-complete');

    const list = element('ul', { className: 'step-list', attrs: { id: listId } });
    list.hidden = !open;
    for (const step of chapter.steps) {
      stepNumber += 1;
      const item = element('li');
      const button = element('button', {
        className: 'step-button',
        attrs: { type: 'button', 'data-step-id': step.id },
      });
      button.append(
        element('span', { className: 'step-dot', attrs: { 'aria-hidden': 'true' } }),
        element('span', { className: 'step-number', text: `${stepNumber}. ` }),
        element('span', { className: 'step-label', text: step.title }),
        element('span', { className: 'completion-mark visually-hidden' }),
      );
      item.append(button);
      list.append(item);
    }
    group.append(list);
    stepsList.append(group);
  }
  updateNavigationState();
};

const renderWelcome = () => {
  currentStepId = null;
  const card = element('div', { className: 'content-column card' });
  card.append(element('h2', { text: currentLesson.title, attrs: { id: 'content-heading' } }));
  const description = element('div', { className: 'narrated-section' });
  description.append(
    createNarrationSlot('welcome/description', 'course introduction'),
    element('p', { className: 'prose', text: currentLesson.description }),
  );
  card.append(description);
  appendNarratedHeading(card, 'What you will learn', 'welcome/objective');
  appendTextList(card, currentLesson.objectives, 'criteria-list', {
    prefix: 'welcome/objective', label: 'objective',
  });
  appendNarratedHeading(card, 'Before you start', 'welcome/prerequisite');
  appendTextList(card, currentLesson.prerequisites, 'criteria-list', {
    prefix: 'welcome/prerequisite', label: 'prerequisite',
  });
  appendNarratedHeading(card, 'What you need', 'welcome/requirement');
  appendTextList(card, currentLesson.requirements, 'criteria-list', {
    prefix: 'welcome/requirement', label: 'requirement',
  });

  const vocabulary = element('details');
  vocabulary.append(element('summary', { text: 'Course vocabulary' }));
  const vocabularyBody = element('div', { className: 'details-content' });
  vocabularyBody.append(createNarrationSlot('welcome/vocabulary', 'Course vocabulary'));
  const definitions = element('dl');
  currentLesson.vocabulary.forEach((entry, index) => {
    definitions.append(element('dt', { text: entry.term }));
    const meaning = element('dd');
    meaning.append(createNarratedItem(
      richElement('span', entry.meaning),
      `welcome/vocabulary/${String(index).padStart(3, '0')}`,
      `vocabulary term ${entry.term}`,
    ));
    definitions.append(meaning);
  });
  vocabularyBody.append(definitions);
  vocabulary.append(vocabularyBody);
  vocabulary.addEventListener('toggle', () => {
    const activeId = narrationPlayer.getState().sectionId;
    if (!vocabulary.open && (activeId === 'welcome/vocabulary' || activeId?.startsWith('welcome/vocabulary/'))) {
      narrationPlayer.stop();
    }
  });
  card.append(vocabulary);

  const lessonProgress = progress.getLesson(currentLesson.id);
  const startId = currentSteps.some(({ id }) => id === lessonProgress.lastViewedStepId)
    ? lessonProgress.lastViewedStepId
    : currentSteps[0].id;
  const start = element('button', {
    className: 'button button-primary',
    text: lessonProgress.lastViewedStepId ? 'Resume course' : 'Start course',
    attrs: { type: 'button', 'data-step-id': startId },
  });
  const startActions = element('div', { className: 'course-start-actions' });
  startActions.append(start);
  card.append(startActions);
  contentArea.replaceChildren(card);
  updateNavigationState();
};

const stepCount = (lesson) => lesson.chapters.reduce((total, chapter) => total + chapter.steps.length, 0);

// Home: one card per game with its picture, size, progress, and a start or continue button.
const renderHome = () => {
  narrationPlayer.stop();
  requestController?.abort();
  requestVersion += 1;
  lessonLoading = false;
  currentLesson = null;
  currentSteps = [];
  currentStepId = null;
  delete document.documentElement.dataset.lesson;
  lessonSelect.value = '';
  document.body.classList.add('is-home');
  setNarrationStatus('');
  stepsList.replaceChildren(element('p', { className: 'chapter-meta', text: 'Pick a game to see its chapters.' }));

  const card = element('div', { className: 'content-column card' });
  card.append(element('h2', { text: 'Pick a game to build', attrs: { id: 'content-heading', tabindex: '-1' } }));
  card.append(element('p', {
    className: 'home-intro',
    text: 'Each game is built step by step in Scratch, and each one teaches new skills. Your progress is saved in this browser.',
  }));
  const grid = element('ul', { className: 'game-grid' });
  for (const lesson of lessonSummaries) {
    const lessonProgress = progress.getLesson(lesson.id);
    const total = stepCount(lesson);
    const steps = flattenLessonSteps(lesson);
    const done = steps.filter(({ id }) => lessonProgress.completedStepIds.includes(id)).length;
    const resumeStep = steps.find(({ id }) => id === lessonProgress.lastViewedStepId);
    const minutes = lesson.chapters.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0);

    const item = element('li', { className: 'game-card', attrs: { 'data-lesson-card': lesson.id } });
    const art = element('div', { className: 'game-card-art' });
    art.append(gameArt(lesson.id));
    const body = element('div', { className: 'game-card-body' });
    body.append(
      element('h3', { text: lesson.title }),
      element('p', { className: 'game-card-description', text: lesson.description }),
      element('p', {
        className: 'game-card-meta',
        text: `${lesson.chapters.length} chapters · about ${Math.round(minutes / 60)} hours · ${done} of ${total} steps done`,
      }),
    );
    body.append(progressBar(done, total, `${lesson.title} progress`));
    const open = element('button', {
      className: 'button',
      text: resumeStep ? `Continue: ${resumeStep.title}` : `Start ${lesson.title}`,
      attrs: { type: 'button', 'data-open-lesson': lesson.id, ...(resumeStep ? { 'data-resume-step': resumeStep.id } : {}) },
    });
    body.append(open);
    item.append(art, body);
    grid.append(item);
  }
  card.append(grid);
  contentArea.replaceChildren(card);
  contentArea.scrollTop = 0;
};

const appendVideo = (parent, step) => {
  if (!step.youtubeID) return;
  const wrapper = element('div', { className: 'video-container' });
  const frame = element('iframe', {
    attrs: {
      src: `https://www.youtube-nocookie.com/embed/${step.youtubeID}`,
      title: `${step.title} inspiration video`,
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'encrypted-media; picture-in-picture',
      allowfullscreen: '',
    },
  });
  wrapper.append(frame);
  parent.append(wrapper);
  const fallback = element('p', { text: 'If the video does not load, ' });
  const link = element('a', {
    text: 'watch it on YouTube',
    attrs: {
      href: `https://www.youtube.com/watch?v=${step.youtubeID}`,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  });
  fallback.append(link, document.createTextNode('.'));
  parent.append(fallback);
};

const appendHints = (parent, step) => {
  const sectionRoot = `${step.chapterId}/${step.id}`;
  if (step.hints.length > 0) {
    const heading = element('h3', { text: 'Hints' });
    parent.append(heading);
    step.hints.forEach((hint, index) => {
      const details = element('details');
      details.append(element('summary', { text: `Hint ${index + 1}` }));
      const body = element('div', { className: 'details-content narrated-help' });
      const sectionId = `${sectionRoot}/hint/${String(index).padStart(3, '0')}`;
      const text = element('div', { className: 'prose' });
      body.append(createNarrationSlot(sectionId, `hint ${index + 1}`));
      appendRichText(text, hint);
      body.append(text);
      details.append(body);
      details.addEventListener('toggle', () => {
        if (!details.open && narrationPlayer.getState().sectionId === sectionId) narrationPlayer.stop();
      });
      parent.append(details);
    });
  }

  if (step.debuggingTips.length > 0) {
    const heading = element('h3', { text: 'Debugging help' });
    parent.append(heading);
    step.debuggingTips.forEach((tip, index) => {
      const details = element('details');
      details.append(richElement('summary', tip.symptom));
      const body = element('div', { className: 'details-content narrated-help' });
      const sectionId = `${sectionRoot}/debug/${String(index).padStart(3, '0')}`;
      body.append(createNarrationSlot(sectionId, `debugging help for ${tip.symptom}`));
      const list = element('ol', { className: 'instruction-list prose' });
      for (const check of tip.checks) {
        const item = element('li');
        appendRichText(item, check);
        list.append(item);
      }
      body.append(list);
      details.append(body);
      details.addEventListener('toggle', () => {
        if (!details.open && narrationPlayer.getState().sectionId === sectionId) narrationPlayer.stop();
      });
      parent.append(details);
    });
  }
};

const appendFinishedCode = (parent, step) => {
  if (!step.finishedCode) return;
  const details = element('details');
  details.append(element('summary', { text: 'Show finished code' }));
  const body = element('div', { className: 'details-content' });
  for (const entry of step.finishedCode) {
    const entryContainer = step.finishedCode.length > 1 ? element('details') : body;
    if (step.finishedCode.length > 1) {
      entryContainer.append(element('summary', { text: entry.target }));
    } else {
      entryContainer.append(element('p', { className: 'code-label', text: entry.target }));
    }
    const scroll = element('div', { className: 'code-scroll' });
    const source = element('pre', { className: 'scratch-source scratch-display-source' });
    source.textContent = entry.code;
    scroll.append(source);
    if (step.finishedCode.length > 1) {
      const entryBody = element('div', { className: 'details-content' });
      entryBody.append(scroll);
      entryContainer.append(entryBody);
      entryContainer.addEventListener('toggle', () => {
        if (entryContainer.open) renderPendingScratch(entryContainer);
      });
      body.append(entryContainer);
    } else {
      body.append(scroll);
    }
  }
  details.append(body);
  details.addEventListener('toggle', () => {
    if (details.open && step.finishedCode.length === 1) renderPendingScratch(details);
  });
  parent.append(details);
};

const navigateToStep = (stepId, { focus = true } = {}) => {
  const index = currentSteps.findIndex((step) => step.id === stepId);
  if (index === -1) return;
  narrationPlayer.stop();
  setNarrationStatus('');
  const step = currentSteps[index];
  const sectionRoot = `${step.chapterId}/${step.id}`;
  currentStepId = step.id;
  progress.markViewed(currentLesson.id, step.id);
  openChapterIds = new Set([step.chapterId]);
  renderNavigation();

  const article = element('article', { className: 'content-column' });
  const chapterSteps = currentSteps.filter(({ chapterId }) => chapterId === step.chapterId);
  const eyebrow = element('p', { className: 'eyebrow' });
  eyebrow.append(
    element('span', {
      className: 'step-badge',
      text: `Step ${chapterSteps.indexOf(step) + 1} of ${chapterSteps.length}`,
    }),
    element('span', { text: step.chapterTitle }),
  );
  article.append(eyebrow);
  const heading = element('h2', {
    className: 'step-title',
    text: step.title,
    attrs: { id: 'content-heading', tabindex: '-1' },
  });
  const headingRow = element('div', { className: 'narrated-heading' });
  headingRow.append(heading, createNarrationSlot(`${sectionRoot}/overview`, `${step.title} overview`));
  article.append(headingRow);
  const explanation = element('div', { className: 'prose' });
  appendRichText(explanation, step.explanation);
  article.append(explanation);

  appendNarratedHeading(article, 'Build it', `${sectionRoot}/instruction`);
  const instructions = element('ol', {
    className: 'instruction-list build-instructions prose',
    attrs: { role: 'list' },
  });
  step.instructions.forEach((instruction, index) => {
    const item = element('li');
    const number = element('span', {
      className: 'instruction-number',
      text: `${index + 1}.`,
      attrs: { 'aria-hidden': 'true' },
    });
    const text = element('span');
    appendRichText(text, instruction);
    const row = createNarratedItem(
      text,
      `${sectionRoot}/instruction/${String(index).padStart(3, '0')}`,
      `instruction ${index + 1}`,
    );
    row.insertBefore(number, text);
    item.append(row);
    instructions.append(item);
  });
  article.append(instructions);
  appendVideo(article, step);

  const checkpoint = element('section', { className: 'checkpoint' });
  const checkpointHeading = element('div', { className: 'narrated-heading' });
  checkpointHeading.append(
    element('h3', { text: 'Test your work' }),
    createNarrationSlot(`${sectionRoot}/checkpoint`, `${step.title} checkpoint`),
  );
  checkpoint.append(checkpointHeading);
  checkpoint.append(richElement('p', step.checkpoint.task, 'checkpoint-task'));
  checkpoint.append(element('h4', { text: 'Expected result' }));
  checkpoint.append(richElement('p', step.checkpoint.expectedResult));
  checkpoint.append(element('h4', { text: 'You’re done when' }));
  appendTextList(checkpoint, step.checkpoint.completeWhen, 'criteria-list');
  article.append(checkpoint);
  appendHints(article, step);
  appendFinishedCode(article, step);

  const actions = element('div', { className: 'step-actions' });
  if (index > 0) {
    actions.append(
      element('button', {
        className: 'button button-secondary',
        text: 'Previous step',
        attrs: { type: 'button', 'data-step-id': currentSteps[index - 1].id },
      }),
    );
  }
  const completed = progress.getLesson(currentLesson.id).completedStepIds.includes(step.id);
  actions.append(
    element('button', {
      className: 'button button-complete',
      text: completed ? 'Mark step incomplete' : 'Mark step complete',
      attrs: {
        type: 'button',
        'data-completion-step-id': step.id,
        'aria-pressed': String(completed),
      },
    }),
  );
  if (index < currentSteps.length - 1) {
    actions.append(
      element('button', {
        className: 'button button-primary',
        text: 'Next step',
        attrs: { type: 'button', 'data-step-id': currentSteps[index + 1].id },
      }),
    );
  }
  article.append(actions);
  contentArea.replaceChildren(article);
  updateNavigationState();
  contentArea.scrollTop = 0;
  if (window.matchMedia('(max-width: 767px)').matches) {
    stepsList.classList.add('mobile-collapsed');
    courseNavToggle.setAttribute('aria-expanded', 'false');
    courseNavToggle.textContent = 'Show chapters';
    contentArea.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  if (focus) heading.focus({ preventScroll: false });
};

const loadLesson = async (lessonId, { resumeStepId = null } = {}) => {
  document.body.classList.remove('is-home');
  narrationPlayer.stop();
  requestController?.abort();
  requestController = new AbortController();
  const version = ++requestVersion;
  lessonLoading = true;
  currentLesson = null;
  currentSteps = [];
  currentStepId = null;
  narrationSections = new Map();
  stepsList.replaceChildren();
  setError('');
  setNarrationStatus('');
  setStatus(`Loading ${lessonId.replaceAll('-', ' ')}...`);
  contentArea.setAttribute('aria-busy', 'true');
  const loadingCard = element('div', { className: 'content-column card' });
  loadingCard.append(element('h2', { id: 'content-heading', text: 'Loading lesson' }));
  loadingCard.append(element('p', { text: 'Preparing chapters and checkpoints...' }));
  contentArea.replaceChildren(loadingCard);
  const narrationRequest = fetch(`./audio/manifests/${lessonId}.json`, {
    signal: requestController.signal,
  }).then(
    (response) => ({ response }),
    (requestError) => ({ requestError }),
  );
  try {
    const response = await fetch(`./curriculum/${lessonId}.json`, {
      signal: requestController.signal,
    });
    if (!response.ok) throw new Error(`Lesson request failed with ${response.status}`);
    const lesson = validateLessonDocument(await response.json(), lessonId);
    if (version !== requestVersion) return;
    currentLesson = lesson;
    openChapterIds = new Set();
    document.documentElement.dataset.lesson = lesson.id;
    lessonNames = collectLessonNames(lesson);
    currentSteps = flattenLessonSteps(lesson);
    renderNavigation();
    renderWelcome();
    if (resumeStepId && currentSteps.some(({ id }) => id === resumeStepId)) navigateToStep(resumeStepId);
    setStatus(`${lesson.title} loaded.`);
    if (!progress.isPersistent()) setStatus(`${lesson.title} loaded. Progress will not be saved.`, { visible: true });
    void (async () => {
      const result = await narrationRequest;
      if (version !== requestVersion) return;
      try {
        if (result.requestError) throw result.requestError;
        if (!result.response.ok) throw new Error(`Narration request failed with ${result.response.status}`);
        const manifest = validateNarrationManifest(await result.response.json(), lesson);
        if (version !== requestVersion) return;
        narrationSections = createNarrationGroups(manifest.sections);
        for (const section of manifest.sections) narrationSections.set(section.id, section);
        attachNarrationControls(contentArea);
      } catch (narrationError) {
        if (narrationError.name === 'AbortError' || version !== requestVersion) return;
        setNarrationStatus('Read-aloud is not available for this lesson right now. The written steps work as usual.');
        console.warn(narrationError);
      }
    })();
  } catch (loadError) {
    if (loadError.name === 'AbortError' || version !== requestVersion) return;
    currentLesson = null;
    currentSteps = [];
    stepsList.replaceChildren();
    const card = element('div', { className: 'content-column card' });
    card.append(element('h2', { id: 'content-heading', text: 'Lesson unavailable' }));
    card.append(element('p', { text: 'This lesson could not be loaded. Choose another project or try again.' }));
    contentArea.replaceChildren(card);
    setError('Could not load the selected lesson.');
    console.error(loadError);
  } finally {
    if (version === requestVersion) {
      lessonLoading = false;
      contentArea.removeAttribute('aria-busy');
    }
  }
};

const loadLessonIndex = async () => {
  setStatus('Loading projects...');
  try {
    const response = await fetch('./curriculum/lessons.json');
    if (!response.ok) throw new Error(`Lesson index request failed with ${response.status}`);
    const ids = validateLessonIndex(await response.json());
    lessonSelect.replaceChildren(element('option', { text: 'Choose a project...', attrs: { value: '' } }));
    for (const id of ids) {
      lessonSelect.append(
        element('option', {
          text: id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
          attrs: { value: id },
        }),
      );
    }
    lessonSelect.disabled = false;
    setStatus('Projects loaded.');
    const summaries = await Promise.all(ids.map(async (id) => {
      try {
        const lessonResponse = await fetch(`./curriculum/${id}.json`);
        if (!lessonResponse.ok) return null;
        return validateLessonDocument(await lessonResponse.json(), id);
      } catch {
        return null;
      }
    }));
    lessonSummaries = summaries.filter(Boolean);
    if (!currentLesson && !lessonLoading && lessonSelect.value === '') renderHome();
  } catch (indexError) {
    lessonSelect.replaceChildren(element('option', { text: 'Projects unavailable' }));
    setError('Could not load the project list. Serve this site over HTTP and try again.');
    console.error(indexError);
  }
};

lessonSelect.addEventListener('change', () => {
  narrationPlayer.stop();
  if (lessonSelect.value) loadLesson(lessonSelect.value);
  else renderHome();
});

stepsList.addEventListener('click', (event) => {
  if (lessonLoading) return;
  const chapterToggle = event.target.closest('button[data-chapter-toggle]');
  if (chapterToggle) {
    const id = chapterToggle.dataset.chapterToggle;
    const open = chapterToggle.getAttribute('aria-expanded') !== 'true';
    if (open) openChapterIds.add(id);
    else openChapterIds.delete(id);
    chapterToggle.setAttribute('aria-expanded', String(open));
    document.getElementById(chapterToggle.getAttribute('aria-controls')).hidden = !open;
    return;
  }
  const button = event.target.closest('button[data-step-id]');
  if (button) navigateToStep(button.dataset.stepId);
});

courseNavToggle.addEventListener('click', () => {
  const collapsed = stepsList.classList.toggle('mobile-collapsed');
  courseNavToggle.setAttribute('aria-expanded', String(!collapsed));
  courseNavToggle.textContent = collapsed ? 'Show chapters' : 'Hide chapters';
});

contentArea.addEventListener('click', (event) => {
  if (lessonLoading) return;
  const narration = event.target.closest('button[data-narration-section-id]');
  if (narration) {
    const section = narrationSections.get(narration.dataset.narrationSectionId);
    if (section) {
      setNarrationStatus('');
      narrationPlayer.toggle(
        section.id,
        section.sentences.map((sentence) => ({
          src: new URL(sentence.src, document.baseURI).href,
        })),
      );
    }
    return;
  }
  const opener = event.target.closest('button[data-open-lesson]');
  if (opener) {
    lessonSelect.value = opener.dataset.openLesson;
    loadLesson(opener.dataset.openLesson, { resumeStepId: opener.dataset.resumeStep ?? null });
    return;
  }
  const navigation = event.target.closest('button[data-step-id]');
  if (navigation) {
    navigateToStep(navigation.dataset.stepId);
    return;
  }
  const completion = event.target.closest('button[data-completion-step-id]');
  if (!completion) return;
  const stepId = completion.dataset.completionStepId;
  const completed = completion.getAttribute('aria-pressed') === 'true';
  progress.setCompleted(currentLesson.id, stepId, !completed);
  completion.setAttribute('aria-pressed', String(!completed));
  completion.textContent = !completed ? 'Mark step incomplete' : 'Mark step complete';
  renderNavigation();
  updateNavigationState();
});

// Light or dark: follow the device until the learner chooses, then remember the choice.
const THEME_KEY = 'scratchLessonsTheme';
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
const activeTheme = () => document.documentElement.dataset.theme ?? (prefersLight.matches ? 'light' : 'dark');
const showTheme = () => themeToggle.setAttribute('aria-pressed', String(activeTheme() === 'light'));
themeToggle.addEventListener('click', () => {
  const next = activeTheme() === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // The choice still applies for this visit.
  }
  showTheme();
});
prefersLight.addEventListener('change', showTheme);
showTheme();

window.addEventListener('pagehide', () => narrationPlayer.stop());

loadLessonIndex();
