import { expect, test } from '@playwright/test';

test('real MP3 playback advances through Build it without another click', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function Audio() {
      const audio = new NativeAudio();
      window.__realNarrationAudio = audio;
      return audio;
    };
  });
  await page.route('https://**', (route) => route.abort());
  await page.goto('/');
  await page.getByLabel('Project').selectOption('tower-defense');
  await page.locator('.step-button').first().click();
  const control = page.locator('button[data-narration-section-id$="/instruction"]');
  await control.click();
  await expect.poll(() => page.evaluate(() => {
    const audio = window.__realNarrationAudio;
    return !audio.paused && audio.currentTime > 0 && Number.isFinite(audio.duration);
  })).toBe(true);
  const firstSource = await page.evaluate(() => window.__realNarrationAudio.src);
  // Seek near the real end, then let the browser deliver its native media events.
  await page.evaluate(() => {
    const audio = window.__realNarrationAudio;
    audio.currentTime = audio.duration - 0.15;
  });
  await expect.poll(() => page.evaluate((first) => {
    const audio = window.__realNarrationAudio;
    return audio.src !== first && !audio.paused && audio.currentTime > 0;
  }, firstSource), { message: 'The second clip should play without another click' }).toBe(true);
  await expect(control).toHaveAccessibleName('Pause narration: Build it');
});
