import { expect, test, type Page } from '@playwright/test';
import { mockOpenWeather } from './mockOpenWeather';

/**
 * A few key user journeys, run in a real browser on desktop and mobile.
 * Detailed behaviour (every error code, edge case, keyboard path) is covered
 * by the Vitest unit and integration tests in src/.
 */

const searchInput = (page: Page) => page.getByRole('combobox', { name: 'Location' });
const searchButton = (page: Page) => page.getByRole('button', { name: 'Search', exact: true });
const historyItems = (page: Page) => page.getByRole('listitem');
const weatherSection = (page: Page) => page.getByRole('region', { name: "Today's Weather" });

/** Fakes the weather API, then opens the app. Returns the names looked up. */
async function openApp(page: Page) {
  const lookedUpNames = await mockOpenWeather(page);
  await page.goto('/');
  return lookedUpNames;
}

test('searches by city and country, and keeps the history after a reload', async ({ page }) => {
  const lookedUpNames = await openApp(page);
  await expect(page.getByText('No Record')).toBeVisible();

  await searchInput(page).fill('Osaka, Japan');
  await page.keyboard.press('Escape'); // close the suggestions
  await searchButton(page).click();

  await expect(weatherSection(page)).toContainText('Osaka, JP');
  await expect(weatherSection(page)).toContainText('Humidity: 58%');
  expect(lookedUpNames).toContain('Osaka,JP');
  await expect(historyItems(page)).toHaveCount(1);

  await page.reload();
  await expect(historyItems(page)).toHaveCount(1);
  await expect(historyItems(page).first()).toContainText('Osaka, JP');
});

test('shows a clear message for an unknown city, and Clear resets the form', async ({ page }) => {
  await openApp(page);

  await searchInput(page).fill('xxx');
  await searchInput(page).press('Enter');

  await expect(page.getByRole('alert')).toHaveText('Not found. Please check the city and country.');
  await expect(page.getByText('No Record')).toBeVisible();

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(searchInput(page)).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('picks a city from the suggestions with the keyboard', async ({ page }) => {
  const lookedUpNames = await openApp(page);

  await searchInput(page).pressSequentially('Joh');
  const suggestion = page.getByRole('option', { name: /Johor Bahru/ });
  await expect(suggestion).toBeVisible();
  // The list must sit on top of the page, not behind the weather card.
  await expect(suggestion).toBeInViewport();

  await searchInput(page).press('ArrowDown');
  await searchInput(page).press('Enter');

  await expect(weatherSection(page)).toContainText('Johor Bahru, MY');
  await expect(searchInput(page)).toHaveValue('Johor Bahru, MY');
  // The suggestion's own coordinates were used: no lookup of "Johor Bahru" by name.
  expect(lookedUpNames.every((name) => name.startsWith('Joh') && name.length <= 3)).toBe(true);
});

test('searches again from the history and deletes entries', async ({ page }) => {
  const lookedUpNames = await openApp(page);
  for (const city of ['Seoul', 'Tokyo']) {
    await searchInput(page).fill(city);
    await page.keyboard.press('Escape');
    await searchButton(page).click();
    await expect(weatherSection(page)).toContainText(city);
  }
  await expect(historyItems(page).first()).toContainText('Tokyo, JP');
  const lookupsBefore = lookedUpNames.length;

  await page.getByRole('button', { name: 'Search Seoul, KR again' }).click();
  await expect(weatherSection(page)).toContainText('Seoul, KR');
  await expect(historyItems(page).first()).toContainText('Seoul, KR');
  // The saved coordinates were used: no new lookup by name.
  expect(lookedUpNames.slice(lookupsBefore).filter((name) => name.startsWith('Seoul'))).toEqual([]);

  await page.getByRole('button', { name: 'Delete Tokyo, JP from history' }).click();
  await page.getByRole('button', { name: 'Delete Seoul, KR from history' }).click();
  await expect(page.getByText('No Record')).toBeVisible();
});

test('switches theme and remembers it after a reload', async ({ page }) => {
  await openApp(page);
  const html = page.locator('html');
  const initialTheme = await html.getAttribute('data-theme');
  const otherTheme = initialTheme === 'dark' ? 'light' : 'dark';

  await page.getByRole('button', { name: `Switch to ${otherTheme} theme` }).click();
  await expect(html).toHaveAttribute('data-theme', otherTheme);

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', otherTheme);
});

test('demo data works without the weather API and is remembered', async ({ page }) => {
  const lookedUpNames = await openApp(page);
  const demoSwitch = page.getByRole('switch', { name: 'Demo data' });

  await demoSwitch.click();
  await expect(demoSwitch).toBeChecked();
  await searchInput(page).fill('Lon');
  await page.getByRole('option', { name: /London.*Ontario/ }).click();

  await expect(weatherSection(page)).toContainText('London, CA');
  await expect(weatherSection(page)).toContainText('Humidity: 73%');
  expect(lookedUpNames).toEqual([]);

  await page.reload();
  await expect(demoSwitch).toBeChecked();
});

test('narrows suggestions to a country, and searches a country by its capital', async ({
  page,
}) => {
  await openApp(page);

  await searchInput(page).pressSequentially('Se');
  await expect(page.getByRole('option', { name: /Seoul/ })).toBeVisible();
  await searchInput(page).pressSequentially(', Japan'); // Seoul is in Korea
  await expect(page.getByRole('option')).toHaveCount(0);
  await searchInput(page).fill('Japan');
  await expect(page.getByRole('option', { name: /Tokyo.*Capital of Japan/ })).toBeVisible();
  await searchInput(page).press('Enter');

  await expect(weatherSection(page)).toContainText('Tokyo, JP');
});

test('fits the screen without horizontal scrolling', async ({ page }) => {
  await openApp(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
