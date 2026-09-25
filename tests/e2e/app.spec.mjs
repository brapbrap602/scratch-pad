import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { validateLessonDocument } from '../../js/content.js';
import { NARRATION_PROFILE, extractNarrationSections } from '../../js/narration-content.js';
import { createNarrationGroups } from '../../js/narration-groups.js';

const narrationManifest = async (lessonId) => {
  const lesson = validateLessonDocument(
    JSON.parse(await readFile(new URL(`../../curriculum/${lessonId}.json`, import.meta.url), 'utf8')),
    lessonId,
  );
  const digest = 'a'.repeat(64);
  let clipIndex = 0;
  return {
    schemaVersion: 1,
    lessonId,
    profile: NARRATION_PROFILE,
    sections: extractNarrationSections(lesson).map((section) => ({
      id: section.id,
      sourcePaths: section.sourcePaths,
      sentences: section.sentences.map((sentence) => ({
        ...sentence,
        requestHash: digest,
        src: `audio/assets/aa/aa${(++clipIndex).toString(16).padStart(62, '0')}.mp3`,
        sha256: `aa${clipIndex.toString(16).padStart(62, '0')}`,
        bytes: 1,
        durationMs: 1,
      })),
    })),
  };
};

const narrationFixtures = new Map(await Promise.all(
  ['brick-breaker', 'space-invaders', 'tower-defense'].map(async (id) => [id, await narrationManifest(id)]),
));

const installExternalStubs = async (page) => {
  await page.addInitScript(() => {
    window.__narrationAudio = [];
    // Keep narration state deterministic without involving browser media decoders or network playback.
    class StubAudio extends EventTarget {
      constructor() {
        super();
        this.currentTime = 0;
        this.ended = false;
        this.error = null;
        this.paused = true;
        this.preload = 'none';
        this.source = '';
      }

      get src() {
        return this.source;
      }

      set src(value) {
        this.source = new URL(value, document.baseURI).href;
      }

      play() {
        this.paused = false;
        return Promise.resolve();
      }

      pause() {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      }

      load() {}

      getAttribute(name) {
        return name === 'src' && this.source ? this.source : null;
      }

      removeAttribute(name) {
        if (name === 'src') this.source = '';
      }
    }

    window.Audio = function Audio() {
      const media = new StubAudio();
      window.__narrationAudio.push(media);
      return media;
    };
  });
  await page.route('**/audio/manifests/*.json', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1).replace('.json', '');
    const manifest = narrationFixtures.get(id);
    return manifest
      ? route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) })
      : route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.route('https://cdn.tailwindcss.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.tailwind={config:{}};' }),
  );
  await page.route('https://cdn.tailwindcss.com/', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.tailwind={config:{}};' }),
  );
  await page.route('https://cdn.jsdelivr.net/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.__scratchSources=[];window.scratchblocks={renderMatching(selector,options){document.querySelectorAll(selector).forEach((node)=>{window.__scratchSources.push({source:node.textContent,options});node.dataset.rendered='true';});}};`,
    }),
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Video placeholder</p>' }),
  );
};

test.beforeEach(async ({ page }) => {
  await installExternalStubs(page);
  await page.goto('/');
});

test('loads chaptered lessons and uses semantic milestone controls', async ({ page }) => {
  const selector = page.getByLabel('Project');
  await expect(selector).toBeEnabled();
  await expect(selector.locator('option')).toHaveCount(4);

  await selector.selectOption('brick-breaker');
  await expect(page.getByRole('heading', { name: 'Brick Breaker', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Project Foundations' })).toBeVisible();

  const firstStep = page.locator('.step-button[data-step-id="observe-complete-game"]');
  await firstStep.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Read the Game Like a Developer' })).toBeFocused();
  await expect(firstStep).toHaveAttribute('aria-current', 'step');
});

test('navigation does not complete work and explicit completion persists', async ({ page }) => {
  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Read the Game Like a Developer/ }).click();

  const completion = page.getByRole('button', { name: /Mark step complete/ });
  await expect(completion).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /Next step/ }).click();
  await page.getByRole('button', { name: /Read the Game Like a Developer/ }).click();
  await expect(completion).toHaveAttribute('aria-pressed', 'false');

  await completion.click();
  await expect(page.getByRole('button', { name: /Mark step incomplete/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Read the Game Like a Developer/ }).click();
  await expect(page.getByRole('button', { name: /Mark step incomplete/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('plays, pauses, advances, and resets a sentence narration queue', async ({ page }) => {
  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Read the Game Like a Developer/ }).click();

  const control = page.locator(
    'button[data-narration-section-id="project-foundations/observe-complete-game/overview"]',
  );
  await control.click();
  await expect(control).toHaveAccessibleName('Pause narration: Read the Game Like a Developer overview');
  const firstSource = await page.evaluate(() => window.__narrationAudio[0].src);
  expect(firstSource).toContain('/audio/assets/aa/');

  await control.click();
  await expect(control).toHaveAccessibleName('Play narration: Read the Game Like a Developer overview');
  await control.click();
  await page.evaluate(() => {
    window.__narrationAudio[0].ended = true;
    window.__narrationAudio[0].dispatchEvent(new Event('ended'));
    window.__narrationAudio[0].ended = false;
  });
  await expect(control).toHaveAccessibleName('Pause narration: Read the Game Like a Developer overview');

  await page.getByRole('button', { name: /Next step/ }).click();
  await expect(page.getByRole('heading', { name: 'Create the Sprites, Backdrops, and Shared Data' })).toBeFocused();
  expect(await page.evaluate(() => window.__narrationAudio[0].getAttribute('src'))).toBeNull();
});

test('Build it plays all instructions in order alongside individual controls', async ({ page }) => {
  await page.getByLabel('Project').selectOption('tower-defense');
  await page.locator('.step-button').first().click();
  const build = page.getByRole('button', { name: 'Play narration: Build it', exact: true });
  await expect(build).toHaveCount(1);
  await expect(page.locator('.instruction-list .narration-button')).toHaveCount(
    await page.locator('article > .instruction-list > li').count(),
  );
  const groupId = await build.getAttribute('data-narration-section-id');
  const sentences = narrationFixtures.get('tower-defense').sections
    .filter(({ id }) => id.startsWith(`${groupId}/`))
    .flatMap(({ sentences }) => sentences);
  expect(sentences.length).toBeGreaterThan(1);
  await build.click();
  const control = page.locator(`button[data-narration-section-id="${groupId}"]`);
  for (const [index, sentence] of sentences.entries()) {
    await expect.poll(() => page.evaluate(() => window.__narrationAudio[0].src))
      .toContain(sentence.src);
    await expect(control).toHaveAccessibleName('Pause narration: Build it');
    if (index === 1) {
      await control.click();
      await expect(control).toHaveAccessibleName('Play narration: Build it');
      await control.click();
      expect(await page.evaluate(() => window.__narrationAudio[0].src)).toContain(sentence.src);
    }
    await page.evaluate(() => {
      const audio = window.__narrationAudio[0];
      audio.ended = true;
      audio.dispatchEvent(new Event('ended'));
      audio.ended = false;
    });
  }
  await expect(control).toHaveAccessibleName('Play narration: Build it');
  expect(await page.evaluate(() => window.__narrationAudio[0].getAttribute('src'))).toBeNull();

  await control.click();
  await page.locator('button[data-narration-section-id$="/overview"]').click();
  await expect(control).toHaveAccessibleName('Play narration: Build it');
  await expect(page.locator('button[data-narration-section-id$="/overview"]'))
    .toHaveAttribute('aria-label', /Pause narration/);
});

test('individual instruction playback stops at its boundary and switches cleanly with play all', async ({ page }) => {
  const section = narrationFixtures.get('tower-defense').sections.find(({ id, sentences }) =>
    id.includes('/instruction/') && sentences.length > 1,
  );
  expect(section).toBeTruthy();
  await page.getByLabel('Project').selectOption('tower-defense');
  await page.locator(`.step-button[data-step-id="${section.id.split('/')[1]}"]`).click();
  const group = page.locator('button[data-narration-section-id$="/instruction"]');
  const item = page.locator(`button[data-narration-section-id="${section.id}"]`);
  await group.click();
  await item.click();
  await expect(group).toHaveAccessibleName('Play narration: Build it');
  for (const sentence of section.sentences) {
    await expect.poll(() => page.evaluate(() => window.__narrationAudio[0].src)).toContain(sentence.src);
    await expect(item).toHaveAttribute('aria-label', /^Pause narration:/);
    await page.evaluate(() => {
      const audio = window.__narrationAudio[0];
      audio.ended = true;
      audio.paused = true;
      audio.dispatchEvent(new Event('pause'));
      audio.dispatchEvent(new Event('ended'));
      audio.ended = false;
    });
  }
  await expect(item).toHaveAttribute('aria-label', /^Play narration:/);
  expect(await page.evaluate(() => window.__narrationAudio[0].getAttribute('src'))).toBeNull();
  await item.click();
  await group.click();
  await expect(item).toHaveAttribute('aria-label', /^Play narration:/);
  await expect(group).toHaveAccessibleName('Pause narration: Build it');
});

test('welcome narration groups lists and stops vocabulary when collapsed', async ({ page }) => {
  await page.getByLabel('Project').selectOption('tower-defense');
  for (const title of ['What you will learn', 'Before you start', 'What you need']) {
    await expect(page.getByRole('button', { name: `Play narration: ${title}`, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Play narration: objective 1', exact: true })).toBeVisible();
  const vocabulary = page.getByRole('button', { name: 'Play narration: Course vocabulary', exact: true });
  await expect(vocabulary).toBeHidden();
  await page.locator('summary').filter({ hasText: 'Course vocabulary' }).click();
  await vocabulary.click();
  await page.locator('summary').filter({ hasText: 'Course vocabulary' }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationAudio[0].getAttribute('src'))).toBeNull();
  await page.locator('summary').filter({ hasText: 'Course vocabulary' }).click();
  await page.locator('button[data-narration-section-id="welcome/vocabulary/000"]').click();
  await page.locator('summary').filter({ hasText: 'Course vocabulary' }).click();
  await expect.poll(() => page.evaluate(() => window.__narrationAudio[0].getAttribute('src'))).toBeNull();
});

test('shows hint and debugging narration only inside opened help', async ({ page }) => {
  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Read the Game Like a Developer/ }).click();

  const hint = page.getByText('Hint 1').locator('..');
  const hintAudio = hint.locator('button[data-narration-section-id$="/hint/000"]');
  await expect(hintAudio).toBeHidden();
  await hint.locator('summary').click();
  await expect(hintAudio).toBeVisible();
  await hintAudio.click();
  await expect(hintAudio).toHaveAccessibleName('Pause narration: hint 1');
  await hint.locator('summary').click();
  await expect
    .poll(() => page.evaluate(() => window.__narrationAudio[0].getAttribute('src')))
    .toBeNull();
});

test('keeps written lessons usable when narration metadata is unavailable', async ({ page }) => {
  await page.unroute('**/audio/manifests/*.json');
  await page.route('**/audio/manifests/*.json', (route) => route.fulfill({ status: 404, body: 'Not found' }));

  await page.getByLabel('Project').selectOption('space-invaders');
  await expect(page.getByRole('heading', { name: 'Space Invaders', exact: true })).toBeVisible();
  await expect(page.getByText('Narration is unavailable for this lesson.')).toBeVisible();
  await expect(page.locator('.narration-button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start course' })).toBeEnabled();
});

test('finished Scratch code preserves angle-bracket predicates and renders once', async ({ page }) => {
  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Move, Detect a Miss, Then Bounce/ }).click();
  const details = page.getByText('Show finished code').locator('..');
  await details.click();
  const codeEntries = details.locator(':scope > .details-content > details');
  for (let index = 0; index < (await codeEntries.count()); index += 1) {
    await codeEntries.nth(index).locator('summary').click();
  }

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__scratchSources.some(({ source }) =>
          source.includes('if <(y position) < (-165)> then'),
        ),
      ),
    )
    .toBe(true);
  const sources = await page.evaluate(() => window.__scratchSources.map(({ source }) => source));
  const count = sources.length;
  if (await codeEntries.count()) {
    for (let index = 0; index < (await codeEntries.count()); index += 1) {
      await codeEntries.nth(index).locator('summary').click();
      await codeEntries.nth(index).locator('summary').click();
    }
  } else {
    await details.click();
    await details.click();
  }
  await expect.poll(() => page.evaluate(() => window.__scratchSources.length)).toBe(count);
});

test('the latest lesson selection wins an out-of-order response race', async ({ page }) => {
  let releaseBrick;
  const brickResponse = new Promise((resolve) => {
    releaseBrick = resolve;
  });
  await page.route('**/curriculum/brick-breaker.json', async (route) => {
    await brickResponse;
    await route.continue();
  });

  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByLabel('Project').selectOption('space-invaders');
  await expect(page.getByRole('heading', { name: 'Space Invaders', exact: true })).toBeVisible();
  releaseBrick();
  await page.waitForTimeout(100);
  await expect(page.getByRole('heading', { name: 'Space Invaders', exact: true })).toBeVisible();
  await expect(page.getByLabel('Project')).toHaveValue('space-invaders');
});

test('has no serious accessibility violations in a rendered step', async ({ page }) => {
  await page.getByLabel('Project').selectOption('space-invaders');
  await page.getByRole('button', { name: /Map the Complete Game/ }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))).toEqual([]);
});

test('keeps the lesson reachable without horizontal page overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByLabel('Project').selectOption('space-invaders');
  await page.getByRole('button', { name: 'Show chapters' }).click();
  await page.getByRole('button', { name: /Map the Complete Game/ }).click();

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  await expect(page.getByRole('button', { name: /Next step/ })).toBeVisible();
  const headingBox = await page.getByRole('heading', { name: 'Map the Complete Game' }).boundingBox();
  expect(headingBox.y).toBeGreaterThanOrEqual(0);
  expect(headingBox.y).toBeLessThan(568);
});

test('keeps desktop navigation fixed while lesson content scrolls independently', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.getByLabel('Project').selectOption('space-invaders');
  await page.getByRole('button', { name: /Checkpoint: Finish Space Invaders/ }).click();

  const nav = page.locator('.steps-nav');
  const navTopBefore = (await nav.boundingBox()).y;
  await page.locator('#content-area').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect.poll(() => page.locator('#content-area').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

  const measurements = await page.evaluate(() => ({
    contentScrollTop: document.querySelector('#content-area').scrollTop,
    contentScrollHeight: document.querySelector('#content-area').scrollHeight,
    contentClientHeight: document.querySelector('#content-area').clientHeight,
    documentScrollTop: document.documentElement.scrollTop,
    bodyScrollTop: document.body.scrollTop,
  }));
  const navTopAfter = (await nav.boundingBox()).y;

  expect(measurements.contentScrollHeight).toBeGreaterThan(measurements.contentClientHeight);
  expect(measurements.contentScrollTop).toBeGreaterThan(0);
  expect(measurements.documentScrollTop).toBe(0);
  expect(measurements.bodyScrollTop).toBe(0);
  expect(navTopAfter).toBe(navTopBefore);
});

test('renders every real curriculum step without page errors', async ({ page }) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const lessonId of narrationFixtures.keys()) {
    await page.getByLabel('Project').selectOption(lessonId);
    await expect(page.locator('.step-button').first()).toBeVisible();
    await expect(page.locator('.narration-button').first()).toBeAttached();
    const narrationIds = new Set(await page.locator('[data-narration-slot-id]').evaluateAll((slots) =>
      slots.map((slot) => slot.dataset.narrationSlotId),
    ));
    const stepIds = await page.locator('.step-button').evaluateAll((buttons) =>
      buttons.map((button) => button.dataset.stepId),
    );

    for (const stepId of stepIds) {
      await page.locator(`.step-button[data-step-id="${stepId}"]`).click();
      await expect(page.locator('#content-heading')).toBeFocused();
      await expect(page.getByRole('heading', { name: 'Test your work' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Mark step (complete|incomplete)/ })).toBeVisible();
      for (const id of await page.locator('[data-narration-slot-id]').evaluateAll((slots) =>
        slots.map((slot) => slot.dataset.narrationSlotId),
      )) narrationIds.add(id);

      const details = page.locator('article details');
      for (let index = 0; index < (await details.count()); index += 1) {
        const item = details.nth(index);
        if (!(await item.evaluate((node) => node.open))) {
          await item.evaluate((node) => {
            node.open = true;
            node.dispatchEvent(new Event('toggle'));
          });
        }
      }
    }
    const sections = narrationFixtures.get(lessonId).sections;
    const expectedIds = [...new Set([
      ...createNarrationGroups(sections).keys(), ...sections.map(({ id }) => id),
    ])].sort();
    expect([...narrationIds].sort()).toEqual(expectedIds);
  }

  expect(pageErrors).toEqual([]);
});
