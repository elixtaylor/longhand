import { expect, test, type Page } from '@playwright/test';

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console: ${message.text()}`);
    }
  });
  return failures;
}

async function expectHealthyPage(page: Page, failures: string[]) {
  await expect(page.locator('body')).not.toHaveText('');
  await expect(
    page.locator(
      '.vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]',
    ),
  ).toHaveCount(0);
  expect(failures).toEqual([]);
}

async function openCalculator(page: Page, label: RegExp) {
  await page.goto('/calculators');
  const cards = page.locator('.calculator-card');
  await expect(cards).toHaveCount(37);
  await cards.filter({ hasText: label }).click();
  await expect(page.locator('form.structured-form')).toBeVisible();
}

test('all public pages load directly without runtime errors', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  const routes = [
    {
      path: '/',
      title: 'Longhand',
      locator: page.getByRole('heading', {
        name: 'Longhand maths workspace',
      }),
    },
    {
      path: '/calculators',
      title: 'Calculators | Longhand',
      locator: page.getByRole('heading', { name: 'Choose a calculator' }),
    },
    {
      path: '/graphing',
      title: 'Graphs and Equations | Longhand',
      locator: page.getByRole('heading', { name: 'Graphs and Equations' }),
    },
    {
      path: '/settings',
      title: 'Settings | Longhand',
      locator: page.getByRole('heading', { name: 'Settings' }),
    },
  ];

  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response?.ok(), `${route.path} returned ${response?.status()}`).toBe(
      true,
    );
    await expect(route.locator).toBeVisible();
    await expect(page).toHaveTitle(route.title);
  }

  await expectHealthyPage(page, failures);
});

test('free-text input detects and solves a plain-English quadratic', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  await page.goto('/');
  await page
    .getByLabel('Your problem')
    .fill('solve x squared plus 5x plus 6 equals 0');
  await expect(
    page.getByText('Quadratic equations', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show the working' }).click();
  await expect(page.getByText('Answer', { exact: true })).toBeVisible();
  await expect(page.locator('.solution .katex')).not.toHaveCount(0);
  await expectHealthyPage(page, failures);
});

test('calculator search, topics and empty-state recovery stay usable', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  await page.goto('/calculators');
  await expect(page.locator('.calculator-card-blurb').first()).toBeVisible();

  const cards = page.locator('.calculator-card');
  await expect(cards).toHaveCount(37);
  await page.getByLabel('Search calculators').fill('semicircle');
  await expect(cards).toHaveCount(1);
  await expect(page.getByText('Angle in a semicircle')).toBeVisible();

  await page.getByLabel('Search calculators').fill('not a real calculator');
  await expect(
    page.getByRole('heading', { name: 'No calculators found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show all calculators' }).click();
  await expect(cards).toHaveCount(37);

  await page
    .getByRole('button', { name: 'Circle geometry 15', exact: true })
    .click();
  await expect(cards).toHaveCount(15);
  await expect(page.getByText('Circle measurements')).toBeVisible();
  await expect(
    page.locator('.calculator-results').getByText('Right-angled triangle'),
  ).toHaveCount(0);
  await expectHealthyPage(page, failures);
});

test('secondary calculator copy meets AA contrast in every theme', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  await page.goto('/calculators');
  await expect(page.locator('.calculator-card-blurb').first()).toBeVisible();

  for (const theme of ['mono', 'editorial', 'notebook', 'warm']) {
    for (const dark of ['off', 'on']) {
      const contrast = await page.evaluate(
        ({ nextTheme, nextDark }) => {
          document.documentElement.dataset.theme = nextTheme;
          document.documentElement.dataset.dark = nextDark;

          function channels(colour: string): number[] {
            return (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          }
          function luminance(colour: string): number {
            const [red, green, blue] = channels(colour).map((channel) => {
              const value = channel / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          }

          const foreground = getComputedStyle(
            document.querySelector<HTMLElement>('.calculator-card-blurb')!,
          ).color;
          const background = getComputedStyle(document.body).backgroundColor;
          const lighter = Math.max(
            luminance(foreground),
            luminance(background),
          );
          const darker = Math.min(luminance(foreground), luminance(background));
          return (lighter + 0.05) / (darker + 0.05);
        },
        { nextTheme: theme, nextDark: dark },
      );
      expect(
        contrast,
        `${theme} (${dark}) contrast ${contrast}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }

  await expectHealthyPage(page, failures);
});

test('every calculator directory entry opens a working form', async ({
  page,
}) => {
  test.slow();
  const failures = captureRuntimeFailures(page);
  await page.goto('/calculators');
  const directoryCards = page.locator('.calculator-card');
  await expect(directoryCards).toHaveCount(37);
  const count = await directoryCards.count();
  expect(count).toBe(37);

  for (let index = 0; index < count; index++) {
    const cards = page.locator('.calculator-card');
    const label = await cards
      .nth(index)
      .locator('.calculator-card-label')
      .innerText();
    await cards.nth(index).click();
    await expect(
      page.locator('form.structured-form'),
      `${label} did not open a calculator form`,
    ).toBeVisible();
    await expect(
      page.locator('form.structured-form button[type="submit"]'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Clear', exact: true }),
    ).toBeVisible();
    await page.goto('/calculators');
    await expect(page.locator('.calculator-card')).toHaveCount(37);
  }

  await expectHealthyPage(page, failures);
});

test('a structured right-triangle calculator derives and solves values', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  await page.goto('/calculators');
  await page
    .locator('.calculator-card')
    .filter({ hasText: /^Right-angled triangle/ })
    .click();
  await page.getByLabel('a', { exact: true }).fill('3');
  await page.getByLabel('b', { exact: true }).fill('4');
  await expect(page.getByLabel('c', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.locator('.solution .answer-label')).toBeVisible();
  await expectHealthyPage(page, failures);
});

test('bespoke calculator forms submit valid work to their engines', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);

  await test.step('complex arithmetic', async () => {
    await openCalculator(page, /^Complex numbers/);
    await page.getByLabel('z₁ — real part').fill('3');
    await page.getByLabel('z₁ — imaginary part').fill('4');
    await page.getByLabel('z₂ — real part').fill('1');
    await page.getByLabel('z₂ — imaginary part').fill('-2');
    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await expect(page.locator('.solution .answer-label')).toBeVisible();
  });

  await test.step('single-event probability', async () => {
    await openCalculator(page, /^Probability/);
    await page.getByLabel('Favourable outcomes').fill('3');
    await page.getByLabel('Total outcomes').fill('8');
    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await expect(page.locator('.solution .answer-label')).toBeVisible();
  });

  await test.step('proof by induction', async () => {
    await openCalculator(page, /^Proof by induction/);
    await page.getByLabel('Summand f(r)').fill('r');
    await page.getByRole('button', { name: 'Show the proof' }).click();
    await expect(page.locator('.solution .answer-label')).toBeVisible();
  });

  await test.step('matrix arithmetic', async () => {
    await openCalculator(page, /^Matrix arithmetic/);
    for (const [matrix, values] of [
      ['Matrix A', [1, 2, 3, 4]],
      ['Matrix B', [5, 6, 7, 8]],
    ] as const) {
      for (const [index, value] of values.entries()) {
        const row = Math.floor(index / 2) + 1;
        const column = (index % 2) + 1;
        await page
          .getByLabel(`${matrix}, row ${row}, column ${column}`)
          .fill(String(value));
      }
    }
    await page.getByRole('button', { name: 'Solve', exact: true }).click();
    await expect(page.locator('.solution .answer-label')).toBeVisible();
  });

  await expectHealthyPage(page, failures);
});

test('the calculator directory does not overflow a narrow viewport', async ({
  page,
}) => {
  const failures = captureRuntimeFailures(page);
  await page.goto('/calculators');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByLabel('Search calculators')).toBeVisible();
  await expectHealthyPage(page, failures);
});
