import { mkdir, readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import { validateLessonDocument } from '../../js/content.js';
import { NARRATION_PROFILE, extractNarrationSections } from '../../js/narration-content.js';

const output = 'visual-results';
const manifests = new Map(await Promise.all(
  ['brick-breaker', 'space-invaders'].map(async (lessonId) => {
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
  await page.getByRole('button', { name: /Checkpoint: Release Space Invaders/ }).click();
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
