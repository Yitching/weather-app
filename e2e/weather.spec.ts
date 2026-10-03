import { expect, test, type Page } from '@playwright/test';
import { mockOpenWeather } from './mockOpenWeather';

/**
 * A few key user journeys, run in a real browser on desktop and mobile.
 * Detailed behaviour (every error code, edge case, keyboard path) is covered
 * by the Vitest unit and integration tests in src/.
 */

const cityInput = (page: Page) => page.getByRole('combobox', { name: 'City' });
const countryInput = (page: Page) => page.getByRole('combobox', { name: 'Country' });
const searchButton = (page: Page) => page.getByRole('button', { name: 'Search', exact: true });
const historyItems = (page: Page) => page.getByRole('listitem');
const weatherSection = (page: Page) => page.getByRole('region', { name: "Today's Weather" });

/** Fakes the weather API, then opens the app. Returns the weather queries sent. */
async function openApp(page: Page) {
  const weatherQueries = await mockOpenWeather(page);
  await page.goto('/');
  return weatherQueries;
}

test('searches by city and country, and keeps the history after a reload', async ({ page }) => {
  const weatherQueries = await openApp(page);
  await expect(page.getByText('No Record')).toBeVisible();

  await cityInput(page).fill('Osaka');
  await countryInput(page).fill('Japan');
  await page.keyboard.press('Escape'); // close the country suggestions
  await searchButton(page).click();

  await expect(weatherSection(page)).toContainText('Osaka, JP');
  await expect(weatherSection(page)).toContainText('Humidity: 58%');
  expect(weatherQueries).toEqual(['Osaka,JP']);
  await expect(historyItems(page)).toHaveCount(1);

  await page.reload();
  await expect(historyItems(page)).toHaveCount(1);
  await expect(historyItems(page).first()).toContainText('Osaka, JP');
});

test('shows a clear message for an unknown city, and Clear resets the form', async ({ page }) => {
  await openApp(page);

  await cityInput(page).fill('xxx');
  await cityInput(page).press('Enter');

  await expect(page.getByRole('alert')).toHaveText('Not found. Please check the city and country.');
  await expect(page.getByText('No Record')).toBeVisible();

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(cityInput(page)).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('picks a city from the suggestions with the keyboard', async ({ page }) => {
  await openApp(page);

  await cityInput(page).pressSequentially('Joh');
  const suggestion = page.getByRole('option', { name: /Johor Bahru/ });
  await expect(suggestion).toBeVisible();
  // The list must sit on top of the page, not behind the weather card.
  await expect(suggestion).toBeInViewport();

  await cityInput(page).press('ArrowDown');
  await cityInput(page).press('Enter');

  await expect(weatherSection(page)).toContainText('Johor Bahru, MY');
  await expect(countryInput(page)).toHaveValue('Malaysia');
});

test('searches again from the history and deletes entries', async ({ page }) => {
  const weatherQueries = await openApp(page);
  for (const city of ['Seoul', 'Tokyo']) {
    await cityInput(page).fill(city);
    await page.keyboard.press('Escape');
    await searchButton(page).click();
    await expect(weatherSection(page)).toContainText(city);
  }
  await expect(historyItems(page).first()).toContainText('Tokyo, JP');

  await page.getByRole('button', { name: 'Search Seoul, KR again' }).click();
  await expect(weatherSection(page)).toContainText('Seoul, KR');
  await expect(historyItems(page).first()).toContainText('Seoul, KR');
  expect(weatherQueries.at(-1)).toBe('Seoul,KR');

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

test('fits the screen without horizontal scrolling', async ({ page }) => {
  await openApp(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
