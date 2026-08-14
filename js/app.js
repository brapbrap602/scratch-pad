import {
  flattenLessonSteps,
  parseRichText,
  validateLessonDocument,
  validateLessonIndex,
} from './content.js';
import { createProgressStore } from './progress.js';

const lessonSelect = document.querySelector('#lesson-select');
const stepsList = document.querySelector('#steps-list');
const courseNavToggle = document.querySelector('#course-nav-toggle');
const contentArea = document.querySelector('#content-area');
const status = document.querySelector('#app-status');
const error = document.querySelector('#app-error');
const progress = createProgressStore();

let currentLesson = null;
let currentSteps = [];
let currentStepId = null;
let requestController = null;
let requestVersion = 0;
let scratchSourceId = 0;
let lessonLoading = false;

const element = (tag, options = {}) => {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) node.setAttribute(name, value);
  }
  return node;
};

const setStatus = (message) => {
  status.textContent = message;
  status.classList.toggle('visually-hidden', message === '');
};

const setError = (message) => {
  error.textContent = message;
  error.classList.toggle('visually-hidden', message === '');
};

const appendRichText = (container, source) => {
  const stack = [container];
  for (const token of parseRichText(source)) {
    const parent = stack.at(-1);
    if (token.type === 'text') parent.append(document.createTextNode(token.value));
    if (token.type === 'break') parent.append(element('br'));
    if (token.type === 'scratch') {
      const code = element('code', { className: 'scratch-source scratch-inline-source' });
      code.textContent = token.value;
      parent.append(code);
    }
    if (token.type === 'open') {
      const child = element(token.tag, { className: token.className || '' });
      parent.append(child);
      stack.push(child);
    }
    if (token.type === 'close') stack.pop();
  }
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

const renderPendingScratch = (root, includeDisplay = false) => {
  root.querySelectorAll('.scratch-inline-source').forEach((node) => renderScratchNode(node, true));
  if (includeDisplay) {
    root.querySelectorAll('.scratch-display-source').forEach((node) => renderScratchNode(node, false));
  }
};

const appendTextList = (parent, items, className = '') => {
  const list = element('ul', { className });
  for (const item of items) list.append(element('li', { text: item }));
  parent.append(list);
};

const updateNavigationState = () => {
  if (!currentLesson) return;
  const lessonProgress = progress.getLesson(currentLesson.id);
  for (const button of stepsList.querySelectorAll('.step-button')) {
    const completed = lessonProgress.completedStepIds.includes(button.dataset.stepId);
    if (button.dataset.stepId === currentStepId) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    const mark = button.querySelector('.completion-mark');
    mark.textContent = completed ? 'Completed' : '';
    mark.classList.toggle('visually-hidden', !completed);
  }
};

const renderNavigation = () => {
  stepsList.replaceChildren();
  const lessonProgress = progress.getLesson(currentLesson.id);
  let stepNumber = 0;
  for (const chapter of currentLesson.chapters) {
    const group = element('section', { className: 'chapter-group' });
    group.append(element('h3', { text: chapter.title }));
    const completedCount = chapter.steps.filter((step) =>
      lessonProgress.completedStepIds.includes(step.id),
    ).length;
    group.append(
      element('p', {
        className: 'chapter-meta',
        text: `${completedCount} of ${chapter.steps.length} complete - ${chapter.estimatedMinutes} minutes`,
      }),
    );
    const list = element('ul', { className: 'step-list' });
    for (const step of chapter.steps) {
      stepNumber += 1;
      const item = element('li');
      const button = element('button', {
        className: 'step-button',
        attrs: { type: 'button', 'data-step-id': step.id },
      });
      button.append(element('span', { text: `${stepNumber}. ${step.title}` }));
      button.append(
        element('span', {
          className: `completion-mark ${lessonProgress.completedStepIds.includes(step.id) ? '' : 'visually-hidden'}`,
          text: lessonProgress.completedStepIds.includes(step.id) ? 'Completed' : '',
        }),
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
  card.append(element('p', { className: 'prose', text: currentLesson.description }));
  card.append(element('h3', { text: 'What you will learn' }));
  appendTextList(card, currentLesson.objectives, 'criteria-list');
  card.append(element('h3', { text: 'Before you start' }));
  appendTextList(card, currentLesson.prerequisites, 'criteria-list');
  card.append(element('h3', { text: 'What you need' }));
  appendTextList(card, currentLesson.requirements, 'criteria-list');

  const vocabulary = element('details');
  vocabulary.append(element('summary', { text: 'Course vocabulary' }));
  const definitions = element('dl', { className: 'details-content' });
  for (const entry of currentLesson.vocabulary) {
    definitions.append(element('dt', { text: entry.term }));
    definitions.append(element('dd', { text: entry.meaning }));
  }
  vocabulary.append(definitions);
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
  card.append(start);
  contentArea.replaceChildren(card);
  updateNavigationState();
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
  if (step.hints.length > 0) {
    const heading = element('h3', { text: 'Hints' });
    parent.append(heading);
    step.hints.forEach((hint, index) => {
      const details = element('details');
      details.append(element('summary', { text: `Hint ${index + 1}` }));
      const body = element('div', { className: 'details-content prose' });
      appendRichText(body, hint);
      details.append(body);
      parent.append(details);
    });
  }

  if (step.debuggingTips.length > 0) {
    const heading = element('h3', { text: 'Debugging help' });
    parent.append(heading);
    for (const tip of step.debuggingTips) {
      const details = element('details');
      details.append(element('summary', { text: tip.symptom }));
      const body = element('div', { className: 'details-content prose' });
      const list = element('ol', { className: 'instruction-list' });
      for (const check of tip.checks) {
        const item = element('li');
        appendRichText(item, check);
        list.append(item);
      }
      body.append(list);
      details.append(body);
      parent.append(details);
    }
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
        if (entryContainer.open) renderPendingScratch(entryContainer, true);
      });
      body.append(entryContainer);
    } else {
      body.append(scroll);
    }
  }
  details.append(body);
  details.addEventListener('toggle', () => {
    if (details.open && step.finishedCode.length === 1) renderPendingScratch(details, true);
  });
  parent.append(details);
};

const navigateToStep = (stepId, { focus = true } = {}) => {
  const index = currentSteps.findIndex((step) => step.id === stepId);
  if (index === -1) return;
  const step = currentSteps[index];
  currentStepId = step.id;
  progress.markViewed(currentLesson.id, step.id);
  renderNavigation();

  const article = element('article', { className: 'content-column' });
  article.append(
    element('p', {
      className: 'eyebrow',
      text: `${step.chapterTitle} - Step ${index + 1} of ${currentSteps.length}`,
    }),
  );
  const heading = element('h2', {
    className: 'step-title',
    text: step.title,
    attrs: { id: 'content-heading', tabindex: '-1' },
  });
  article.append(heading);
  const explanation = element('div', { className: 'prose' });
  appendRichText(explanation, step.explanation);
  article.append(explanation);

  article.append(element('h3', { text: 'Build it' }));
  const instructions = element('ol', { className: 'instruction-list prose' });
  for (const instruction of step.instructions) {
    const item = element('li');
    appendRichText(item, instruction);
    instructions.append(item);
  }
  article.append(instructions);
  appendVideo(article, step);

  const checkpoint = element('section', { className: 'checkpoint' });
  checkpoint.append(element('h3', { text: 'Test your work' }));
  checkpoint.append(element('p', { text: step.checkpoint.task }));
  checkpoint.append(element('p', { text: `Expected: ${step.checkpoint.expectedResult}` }));
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
  renderPendingScratch(article);
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

const loadLesson = async (lessonId) => {
  requestController?.abort();
  requestController = new AbortController();
  const version = ++requestVersion;
  lessonLoading = true;
  currentLesson = null;
  currentSteps = [];
  currentStepId = null;
  stepsList.replaceChildren();
  setError('');
  setStatus(`Loading ${lessonId.replaceAll('-', ' ')}...`);
  contentArea.setAttribute('aria-busy', 'true');
  const loadingCard = element('div', { className: 'content-column card' });
  loadingCard.append(element('h2', { id: 'content-heading', text: 'Loading lesson' }));
  loadingCard.append(element('p', { text: 'Preparing chapters and checkpoints...' }));
  contentArea.replaceChildren(loadingCard);
  try {
    const response = await fetch(`./curriculum/${lessonId}.json`, {
      signal: requestController.signal,
    });
    if (!response.ok) throw new Error(`Lesson request failed with ${response.status}`);
    const lesson = validateLessonDocument(await response.json(), lessonId);
    if (version !== requestVersion) return;
    currentLesson = lesson;
    currentSteps = flattenLessonSteps(lesson);
    renderNavigation();
    renderWelcome();
    setStatus(`${lesson.title} loaded.`);
    if (!progress.isPersistent()) setStatus(`${lesson.title} loaded. Progress will not be saved.`);
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
  } catch (indexError) {
    lessonSelect.replaceChildren(element('option', { text: 'Projects unavailable' }));
    setError('Could not load the project list. Serve this site over HTTP and try again.');
    console.error(indexError);
  }
};

lessonSelect.addEventListener('change', () => {
  if (lessonSelect.value) loadLesson(lessonSelect.value);
});

stepsList.addEventListener('click', (event) => {
  if (lessonLoading) return;
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

loadLessonIndex();
