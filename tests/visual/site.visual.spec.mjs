import { mkdir, readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import { validateLessonDocument } from '../../js/content.js';
import { NARRATION_PROFILE, extractNarrationSections } from '../../js/narration-content.js';

const output = 'visual-results';
const manifests = new Map(await Promise.all(
  ['brick-breaker', 'space-invaders', 'tower-defense'].map(async (lessonId) => {
    const lesson = validateLessonDocument(
      JSON.parse(await readFile(new URL(`../../curriculum/${lessonId}.json`, import.meta.url), 'utf8')),
      lessonId,
    );
    const digest = 'a'.repeat(64);
    return [lessonId, {
      schemaVersion: 1,
      lessonId,
      profile: NARRATION_PROFILE,
      sections: extractNarrationSections(lesson).map((section) => ({
        id: section.id,
        sourcePaths: section.sourcePaths,
        sentences: section.sentences.map((sentence) => ({
          ...sentence,
          requestHash: digest,
          src: `audio/assets/aa/${digest}.mp3`,
          sha256: digest,
          bytes: 1,
          durationMs: 1,
        })),
      })),
    }];
  }),
));

test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
});

test('captures real desktop and mobile course states', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Video intentionally skipped during visual QA.</p>' }),
  );
  await page.route('**/audio/manifests/*.json', (route) => {
    const lessonId = new URL(route.request().url()).pathname.split('/').at(-1).replace('.json', '');
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifests.get(lessonId)) });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByLabel('Project')).toBeEnabled();
  await page.screenshot({ path: `${output}/01-home-desktop.png`, fullPage: true });

  await page.getByLabel('Project').selectOption('brick-breaker');
  await page.getByRole('button', { name: /Move, Detect a Miss, Then Bounce/ }).click();
  await expect(page.locator('button[data-narration-section-id$="build-ordered-ball-loop/overview"]')).toBeVisible();
  await page.getByText('Show finished code').click();
  const brickCodeEntry = page
    .getByText('Show finished code')
    .locator('..')
    .locator(':scope > .details-content > details')
    .first();
  if (await brickCodeEntry.count()) await brickCodeEntry.locator('summary').click();
  await expect(brickCodeEntry.locator('.scratch-display-source, .scratchblocks').first()).toBeVisible();
  await page.screenshot({ path: `${output}/02-brick-code-desktop.png`, fullPage: true });

  await page.getByLabel('Project').selectOption('space-invaders');
  await page.getByRole('button', { name: /Checkpoint: Finish Space Invaders/ }).click();
  const invadersCode = page.getByText('Show finished code').locator('..');
  await invadersCode.locator('summary').first().click();
  for (const [target, filename] of [
    ['Stage - win and endings', '03a-invaders-endings-code.png'],
    ['Alien - fleet march and invasion', '03b-invaders-invasion-code.png'],
    ['Enemy Shot', '03c-invaders-enemy-shot-code.png'],
    ['Bunker', '03d-invaders-bunker-code.png'],
    ['Mothership', '03e-invaders-mothership-code.png'],
  ]) {
    const entry = invadersCode
      .locator(':scope > .details-content > details')
      .filter({ has: page.locator('summary', { hasText: target }) });
    await entry.locator('summary').click();
    await expect(entry.locator('.scratch-display-source, .scratchblocks').first()).toBeVisible();
    await entry.screenshot({ path: `${output}/${filename}` });
    await entry.locator('summary').click();
  }
  await invadersCode
    .locator(':scope > .details-content > details')
    .filter({ has: page.locator('summary', { hasText: 'Stage - win and endings' }) })
    .locator('summary')
    .click();
  await page.screenshot({ path: `${output}/03-invaders-final-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show chapters' }).click();
  await page.getByRole('button', { name: /Map the Complete Game/ }).click();
  const heading = page.getByRole('heading', { name: 'Map the Complete Game' });
  await expect(heading).toBeFocused();
  const box = await heading.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(844);
  await page.getByText('Hint 1').locator('..').locator('summary').click();
  await page.screenshot({ path: `${output}/04-invaders-mobile.png`, fullPage: true });

  expect(pageErrors).toEqual([]);
});

test('captures tower defense lists, My Blocks, level settings, and mobile challenge', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByLabel('Project').selectOption('tower-defense');
  await expect(page.getByRole('heading', { name: 'Tower Defense', exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/05-tower-defense-desktop.png` });

  for (const [stepId, filename, expectedText] of [
    ['check-a-numbered-shot', '06-tower-defense-shot-blocks.png', 'slot'],
    ['level-two-settings', '07-tower-defense-level-settings.png', 'Load level settings'],
  ]) {
    await page.locator(`.step-button[data-step-id="${stepId}"]`).click();
    const code = page.getByText('Show finished code').locator('..');
    await code.locator('summary').first().click();
    const nested = code.locator(':scope > .details-content > details').first();
    const entry = await nested.count() ? nested : code.locator(':scope > .details-content');
    if (await nested.count()) await nested.locator('summary').click();
    await expect(entry.locator('svg').first()).toBeVisible();
    await expect(entry.locator('svg').first()).toContainText(new RegExp(expectedText.split(' ').join('\\s*')));
    if (stepId === 'check-a-numbered-shot') {
      await expect(entry.locator('.sb3-custom-arg').first()).toHaveCSS('fill', 'rgb(255, 102, 128)');
    }
    await entry.evaluate((node) => {
      const area = node.closest('.content-area');
      area.scrollTo({
        top: area.scrollTop + node.getBoundingClientRect().top - area.getBoundingClientRect().top - 16,
        behavior: 'instant',
      });
    });
    await page.screenshot({ path: `${output}/${filename}` });
    if (stepId === 'check-a-numbered-shot') {
      const scroll = entry.locator('.code-scroll');
      await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
      expect(await scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
      await page.screenshot({ path: `${output}/06b-tower-defense-shot-blocks-right.png` });
    } else {
      await entry.locator('svg text').last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/07b-tower-defense-level-settings-bottom.png` });
    }
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole('button', { name: 'Show chapters' }).click();
  await page.locator('.step-button[data-step-id="design-your-own-level"]').click();
  await expect(page.getByRole('heading', { name: 'Your Challenge: Design Level 3' })).toBeFocused();
  const referenceSave = page.locator('.instruction-list > li').filter({ hasText: 'File > Save as a copy' });
  await expect(referenceSave.locator('.inline-chip')).toHaveCount(0);
  const levelBranch = page.locator('.instruction-list > li').filter({ hasText: 'Load level settings' });
  await expect(levelBranch.locator('.inline-chip.chip-control').first()).toBeVisible();
  await expect(levelBranch.locator('.inline-chip.chip-my-blocks').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: `${output}/08-tower-defense-mobile-challenge.png`, fullPage: true });
  expect(errors).toEqual([]);
});
