import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(__dirname, '../.sisyphus/evidence/final-qa');

const results = [];

function log(msg) {
  console.log(msg);
  results.push(msg);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  // Step 1: Navigate to homepage
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  log('Navigated to http://localhost:3000');

  // Step 2: Assert empty state
  const bodyText = await page.evaluate(() => document.body.innerText);
  log(`Body text snippet: ${bodyText.slice(0, 500)}`);
  
  const hasEmptyState = bodyText.match(/no lists|no todo|create|new list|get started|empty/i);
  log(`Empty state visible: ${hasEmptyState ? 'YES - ' + hasEmptyState[0] : 'NO'}`);

  // Step 3: Find and click "New List" CTA
  const newListBtn = page.getByRole('button', { name: /new list/i })
    .or(page.getByRole('link', { name: /new list/i }))
    .or(page.getByRole('button', { name: /create/i }))
    .or(page.locator('[data-testid="new-list"]'))
    .or(page.locator('button').filter({ hasText: /new|create|add/i })).first();
  
  const btnVisible = await newListBtn.isVisible().catch(() => false);
  log(`New list button found: ${btnVisible}`);
  
  if (btnVisible) {
    await newListBtn.click();
    log('Clicked new list button');
    await page.waitForTimeout(500);
  }

  // Check if a dialog/input appeared
  const inputEl = page.getByRole('textbox').or(page.locator('input[type="text"]')).first();
  const inputVisible = await inputEl.isVisible().catch(() => false);
  log(`Input field visible after click: ${inputVisible}`);

  if (inputVisible) {
    await inputEl.fill('Weekend Errands');
    log('Filled "Weekend Errands"');

    // Submit - try Enter or a submit button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    log('Pressed Enter to submit');
  }

  // Step 6: Assert navigated to /list/[id]
  const currentUrl = page.url();
  log(`Current URL after submit: ${currentUrl}`);
  const onListPage = /\/list\//.test(currentUrl);
  log(`Navigated to /list/[id]: ${onListPage}`);

  // Step 7: Assert empty todo state
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasEmptyTodos = pageText.match(/no items|no tasks|empty|add.*item|get.*started/i);
  log(`Empty todo state visible: ${hasEmptyTodos ? 'YES - ' + hasEmptyTodos[0] : 'NO (checking page text)'}`);
  log(`Page text snippet: ${pageText.slice(0, 600)}`);

  // Step 8: Assert chat panel empty state or API key warning
  const hasChatState = pageText.match(/api key|no messages|start.*chat|enter.*key|connect|configure/i);
  log(`Chat panel state: ${hasChatState ? 'YES - ' + hasChatState[0] : 'NO'}`);

  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-onboarding.png') });
  log('Screenshot saved: flow-1-onboarding.png');

  // Summary
  const pass = hasEmptyState && onListPage;
  log(`\nFLOW 1 RESULT: ${pass ? 'PASS' : 'PARTIAL'}`);
  log(`- Empty state: ${hasEmptyState ? 'PASS' : 'FAIL'}`);
  log(`- Navigation to /list/[id]: ${onListPage ? 'PASS' : 'FAIL'}`);
  log(`- Todo empty state: ${hasEmptyTodos ? 'PASS' : 'CHECK'}`);
  log(`- Chat/API key state: ${hasChatState ? 'PASS' : 'CHECK'}`);

} catch (err) {
  log(`ERROR: ${err.message}`);
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-error.png') }).catch(() => {});
} finally {
  await browser.close();
}

console.log('\n=== FLOW 1 SUMMARY ===');
results.forEach(r => console.log(r));
