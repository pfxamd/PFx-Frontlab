import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'HTML' })).toBeVisible();
});

test('first render displays live HTML, CSS and JavaScript experiment', async ({ page }) => {
  await expect(page.getByText('PFx Frontlab Engine')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'HTML' })).toHaveAttribute('aria-selected', 'true');
  const frame = page.frameLocator('.frame-host iframe');
  await expect(frame.getByText('Move things')).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Interact with the orb' })).toBeVisible();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('HTML edits update live preview', async ({ page }) => {
  const editor = page.locator('.editor-mount .cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('<main><h1 id="verified">Live editing works</h1></main>');
  await expect(page.frameLocator('.frame-host iframe').locator('#verified')).toHaveText('Live editing works');
});

test('language tabs switch documents without clearing their contents', async ({ page }) => {
  await page.getByRole('tab', { name: 'CSS' }).click();
  await expect(page.locator('.cm-content')).toContainText('box-sizing');
  await page.getByRole('tab', { name: 'JavaScript' }).click();
  await expect(page.locator('.cm-content')).toContainText('addEventListener');
  await page.getByRole('tab', { name: 'HTML' }).click();
  await expect(page.locator('.cm-content')).toContainText('INTERACTIVE STUDY');
});

test('responsive controls and theme toggle operate', async ({ page }) => {
  await page.getByRole('button', { name: 'Phone width' }).click();
  await expect(page.locator('.preview-device')).toHaveCSS('width', '390px');
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('projects can be created and are persisted locally', async ({ page }) => {
  await page.getByRole('button', { name: 'Experiments' }).click();
  await expect(page.getByRole('dialog', { name: 'Your experiments' })).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await expect(page.getByLabel('Experiment name')).toHaveValue('Untitled experiment');
  await expect(page.frameLocator('.frame-host iframe').getByText('Untitled experiment')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('pfx-frontlab:projects:v1') || '[]').length)).toBe(2);
});

test('console shows runtime diagnostics from user code', async ({ page }) => {
  await page.getByRole('tab', { name: 'JavaScript' }).click();
  await page.getByRole('button', { name: 'Console', exact: true }).click();
  await expect(page.locator('.console-output')).toContainText('Frontlab experiment ready');
});

test('mobile layout keeps editing and preview accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.source-pane')).toBeVisible();
  await expect(page.locator('.preview-pane')).toBeVisible();
  await expect(page.locator('.frame-host iframe')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/frontlab-mobile.png', fullPage: true });
});
