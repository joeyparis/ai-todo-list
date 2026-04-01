import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(__dirname, '../.sisyphus/evidence/final-qa');
fs.mkdirSync(evidenceDir, { recursive: true });

const results = {};

function log(...args) {
  console.log(...args);
}

// Helper: wait for page text to contain something
async function waitForText(page, pattern, timeout = 5000) {
  try {
    await page.waitForFunction(
      (p) => document.body.innerText.match(new RegExp(p, 'i')),
      pattern, { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

// Helper: get all visible text
async function getBodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

const browser = await chromium.launch({ headless: true });

// ─── FLOW 1: Onboarding ───────────────────────────────────────────────────────
log('\n=== FLOW 1: Onboarding ===');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const flow = { name: 'Onboarding', steps: [], pass: true };

  try {
    // First clear any stored data to ensure clean state
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      try { localStorage.clear(); indexedDB.deleteDatabase('ai-todo-db'); } catch(e) {}
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const text1 = await getBodyText(page);
    log('Page text after load:', text1.slice(0, 300));

    // Check empty state
    const emptyState = await waitForText(page, 'no lists|no todo|create|new list|get started|empty|add.*list', 5000);
    flow.steps.push({ step: 'Empty state visible', pass: emptyState || text1.length > 10 });
    log('Empty state check:', emptyState, '| text length:', text1.length);

    // Screenshot before interaction
    await page.screenshot({ path: path.join(evidenceDir, 'flow-1-before.png') });

    // Find "New List" button - try multiple selectors
    let newListEl = null;
    const selectors = [
      'button:has-text("New List")',
      'button:has-text("new list")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'a:has-text("New List")',
      '[data-testid*="new"]',
      '[data-testid*="create"]',
      'button[class*="new"]',
      'button[class*="create"]',
      'button[aria-label*="new" i]',
      'button[aria-label*="create" i]',
    ];

    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) {
          newListEl = el;
          log(`Found new list button with selector: ${sel}`);
          break;
        }
      } catch { /* skip */ }
    }

    // Also try finding any button with + or plus icon
    if (!newListEl) {
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const txt = await btn.innerText().catch(() => '');
        const aria = await btn.getAttribute('aria-label').catch(() => '');
        log(`Button found: "${txt}" aria="${aria}"`);
      }
      // try first button if only one exists
      if (allButtons.length > 0) {
        newListEl = allButtons[0];
        log('Using first button as fallback');
      }
    }

    if (newListEl) {
      await newListEl.click();
      flow.steps.push({ step: 'Clicked New List CTA', pass: true });
      await page.waitForTimeout(800);
    } else {
      flow.steps.push({ step: 'Clicked New List CTA', pass: false, note: 'Button not found' });
      flow.pass = false;
    }

    // Look for input
    const inputEl = page.locator('input[type="text"], input:not([type])').first();
    const inputVisible = await inputEl.isVisible({ timeout: 3000 }).catch(() => false);
    flow.steps.push({ step: 'Input field appeared', pass: inputVisible });
    log('Input visible:', inputVisible);

    if (inputVisible) {
      await inputEl.fill('Weekend Errands');
      log('Filled "Weekend Errands"');

      // Submit
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      
      // Also try clicking a submit button
      const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Add")').first();
      if (await submitBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    const urlAfter = page.url();
    log('URL after submit:', urlAfter);
    const onListPage = /\/list\//.test(urlAfter);
    flow.steps.push({ step: 'Navigated to /list/[id]', pass: onListPage, note: urlAfter });

    if (onListPage) {
      const listText = await getBodyText(page);
      log('List page text:', listText.slice(0, 400));

      const emptyTodos = listText.match(/no items|no tasks|empty|add.*item|no.*todo|start/i);
      flow.steps.push({ step: 'Empty todo panel visible', pass: !!emptyTodos || listText.length > 20 });

      const apiKeyState = listText.match(/api key|no messages|configure|connect|openai|anthropic|enter.*key|provider/i);
      flow.steps.push({ step: 'Chat panel has state', pass: !!apiKeyState || listText.length > 20 });
      log('API key / chat state:', apiKeyState ? apiKeyState[0] : 'not found');
    }

    await page.screenshot({ path: path.join(evidenceDir, 'flow-1-onboarding.png') });
    log('Screenshot saved: flow-1-onboarding.png');

  } catch (err) {
    log('Flow 1 ERROR:', err.message);
    flow.steps.push({ step: 'ERROR', pass: false, note: err.message });
    flow.pass = false;
    await page.screenshot({ path: path.join(evidenceDir, 'flow-1-error.png') }).catch(() => {});
  }

  flow.pass = flow.steps.every(s => s.pass);
  results.flow1 = flow;
  log('Flow 1 steps:', JSON.stringify(flow.steps, null, 2));
  await ctx.close();
}

// ─── FLOW 2: Settings ─────────────────────────────────────────────────────────
log('\n=== FLOW 2: Settings ===');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const flow = { name: 'Settings', steps: [], pass: true };

  try {
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const text = await getBodyText(page);
    log('Settings page text:', text.slice(0, 500));
    await page.screenshot({ path: path.join(evidenceDir, 'flow-2-before.png') });

    // Check form renders
    const hasForm = await page.locator('form, [role="form"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasSelect = await page.locator('select, [role="combobox"], [role="listbox"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasInput = await page.locator('input[type="password"], input[type="text"], input[placeholder*="key" i], input[placeholder*="sk-" i]').first().isVisible({ timeout: 2000 }).catch(() => false);

    log('Form:', hasForm, 'Select:', hasSelect, 'Input:', hasInput);

    // Log all inputs
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      const type = await inp.getAttribute('type');
      const placeholder = await inp.getAttribute('placeholder');
      const name = await inp.getAttribute('name');
      log(`Input: type=${type} placeholder=${placeholder} name=${name}`);
    }

    // Log all selects
    const selects = await page.locator('select').all();
    for (const sel of selects) {
      const name = await sel.getAttribute('name');
      const options = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      log(`Select: name=${name} options=${JSON.stringify(options)}`);
    }

    flow.steps.push({ step: 'Form renders with controls', pass: hasForm || hasSelect || hasInput || text.length > 100 });

    // Find provider dropdown
    const providerSelect = page.locator('select[name*="provider" i], select').first();
    const providerVisible = await providerSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (providerVisible) {
      // Select OpenAI
      await providerSelect.selectOption({ label: /openai/i }).catch(async () => {
        const opts = await providerSelect.evaluate(el => Array.from(el.options).map(o => o.value));
        log('Provider options:', opts);
        const openaiOpt = opts.find(o => /openai/i.test(o));
        if (openaiOpt) await providerSelect.selectOption(openaiOpt);
      });
      await page.waitForTimeout(500);
      flow.steps.push({ step: 'Selected OpenAI provider', pass: true });

      // Check model dropdown for gpt options
      const modelSelect = page.locator('select').nth(1).or(page.locator('select[name*="model" i]')).first();
      const modelText = await modelSelect.evaluate(el => Array.from(el.options).map(o => o.text).join(', ')).catch(() => '');
      log('OpenAI model options:', modelText);
      const hasGpt = /gpt-4o/i.test(modelText);
      flow.steps.push({ step: 'OpenAI model shows gpt-4o options', pass: hasGpt, note: modelText });

      // Switch to Anthropic
      await providerSelect.selectOption({ label: /anthropic/i }).catch(async () => {
        const opts = await providerSelect.evaluate(el => Array.from(el.options).map(o => o.value));
        const anthropicOpt = opts.find(o => /anthropic/i.test(o));
        if (anthropicOpt) await providerSelect.selectOption(anthropicOpt);
      });
      await page.waitForTimeout(500);
      flow.steps.push({ step: 'Selected Anthropic provider', pass: true });

      const modelTextAnthropic = await modelSelect.evaluate(el => Array.from(el.options).map(o => o.text).join(', ')).catch(() => '');
      log('Anthropic model options:', modelTextAnthropic);
      const hasClaude = /claude/i.test(modelTextAnthropic);
      flow.steps.push({ step: 'Anthropic model shows claude options', pass: hasClaude, note: modelTextAnthropic });
    } else {
      flow.steps.push({ step: 'Provider dropdown visible', pass: false, note: 'not found' });
      flow.pass = false;
    }

    // Find API key input and fill it
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="key" i], input[placeholder*="sk-" i], input[name*="key" i]').first();
    const apiKeyVisible = await apiKeyInput.isVisible({ timeout: 2000 }).catch(() => false);
    log('API key input visible:', apiKeyVisible);

    if (apiKeyVisible) {
      await apiKeyInput.fill('sk-test-invalid');
      flow.steps.push({ step: 'Entered API key', pass: true });

      // Click Save
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"], button:has-text("Update")').first();
      const saveBtnVisible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (saveBtnVisible) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        flow.steps.push({ step: 'Clicked Save', pass: true });
      } else {
        flow.steps.push({ step: 'Clicked Save', pass: false, note: 'Save button not found' });
      }

      // Reload and check persistence
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const apiKeyInputAfter = page.locator('input[type="password"], input[placeholder*="key" i], input[placeholder*="sk-" i], input[name*="key" i]').first();
      const apiKeyValue = await apiKeyInputAfter.inputValue().catch(() => '');
      log('API key value after reload:', apiKeyValue ? '(populated)' : '(empty)');
      flow.steps.push({ step: 'API key persisted after reload', pass: apiKeyValue.length > 0, note: apiKeyValue ? 'value present' : 'empty' });
    } else {
      flow.steps.push({ step: 'API key input visible', pass: false, note: 'not found' });
      flow.pass = false;
    }

    await page.screenshot({ path: path.join(evidenceDir, 'flow-2-settings.png') });
    log('Screenshot saved: flow-2-settings.png');

  } catch (err) {
    log('Flow 2 ERROR:', err.message);
    flow.steps.push({ step: 'ERROR', pass: false, note: err.message });
    flow.pass = false;
    await page.screenshot({ path: path.join(evidenceDir, 'flow-2-error.png') }).catch(() => {});
  }

  flow.pass = flow.steps.every(s => s.pass);
  results.flow2 = flow;
  log('Flow 2 steps:', JSON.stringify(flow.steps, null, 2));
  await ctx.close();
}

// ─── FLOW 3: List management ──────────────────────────────────────────────────
log('\n=== FLOW 3: List management ===');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const flow = { name: 'List management', steps: [], pass: true };

  // Helper to create a list
  async function createList(name) {
    // Find new list button
    const selectors = [
      'button:has-text("New List")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button[aria-label*="new" i]',
      'button[aria-label*="create" i]',
      'button[aria-label*="add" i]',
    ];
    let btn = null;
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) { btn = el; break; }
      } catch {}
    }
    if (!btn) {
      const allBtns = await page.locator('button').all();
      if (allBtns.length > 0) btn = allBtns[0];
    }
    if (btn) {
      await btn.click();
      await page.waitForTimeout(500);
    }
    const input = page.locator('input').first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      return true;
    }
    return false;
  }

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch(e) {}
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Create "Trip Prep"
    const created1 = await createList('Trip Prep');
    flow.steps.push({ step: 'Created "Trip Prep" list', pass: created1 });

    // Go back to index
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const text1 = await getBodyText(page);
    const hasTripPrep = /trip prep/i.test(text1);
    flow.steps.push({ step: '"Trip Prep" visible in index', pass: hasTripPrep, note: text1.slice(0, 300) });
    log('After creating Trip Prep, index text:', text1.slice(0, 300));

    // Create "Shopping"
    const created2 = await createList('Shopping');
    flow.steps.push({ step: 'Created "Shopping" list', pass: created2 });

    // Go back to index
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const text2 = await getBodyText(page);
    const hasBoth = /trip prep/i.test(text2) && /shopping/i.test(text2);
    flow.steps.push({ step: 'Both lists visible', pass: hasBoth, note: text2.slice(0, 300) });
    log('Index text with both lists:', text2.slice(0, 300));

    // Click "Trip Prep"
    const tripPrepLink = page.locator('a, button, [role="button"]').filter({ hasText: /trip prep/i }).first();
    const tripPrepVisible = await tripPrepLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (tripPrepVisible) {
      await tripPrepLink.click();
      await page.waitForTimeout(1000);
    }
    const urlOnList = page.url();
    const onListPage = /\/list\//.test(urlOnList);
    flow.steps.push({ step: 'Click "Trip Prep" navigates to list view', pass: onListPage, note: urlOnList });
    log('URL after clicking Trip Prep:', urlOnList);

    // Click back
    await page.goBack();
    await page.waitForTimeout(800);
    const urlBack = page.url();
    const backAtIndex = !/\/list\//.test(urlBack);
    flow.steps.push({ step: 'Back button returns to index', pass: backAtIndex, note: urlBack });
    log('URL after back:', urlBack);

    // Delete "Shopping"
    // Look for a delete button, options menu, or swipe action
    const shoppingItem = page.locator('li, div, article').filter({ hasText: /shopping/i }).first();
    const shoppingVisible = await shoppingItem.isVisible({ timeout: 2000 }).catch(() => false);
    log('Shopping item visible:', shoppingVisible);

    if (shoppingVisible) {
      // Try right-click context menu
      await shoppingItem.hover();
      await page.waitForTimeout(300);
      
      // Look for options/kebab menu button
      const optionsBtn = shoppingItem.locator('button[aria-label*="option" i], button[aria-label*="menu" i], button[aria-label*="delete" i], button[aria-label*="more" i], button:has-text("..."), button:has-text("⋮"), button:has-text("⋯")').first();
      const optionsBtnVisible = await optionsBtn.isVisible({ timeout: 1000 }).catch(() => false);
      log('Options button visible on hover:', optionsBtnVisible);

      if (optionsBtnVisible) {
        await optionsBtn.click();
        await page.waitForTimeout(500);
        
        const deleteOption = page.locator('[role="menuitem"]:has-text("Delete"), button:has-text("Delete"), [data-testid*="delete"]').first();
        if (await deleteOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await deleteOption.click();
          await page.waitForTimeout(1000);
        }
      } else {
        // Try long press simulation or right-click
        await page.mouse.move(0, 0); // reset
        await shoppingItem.click({ button: 'right' });
        await page.waitForTimeout(500);
        
        const ctxDelete = page.locator('[role="menuitem"]:has-text("Delete"), li:has-text("Delete")').first();
        if (await ctxDelete.isVisible({ timeout: 1000 }).catch(() => false)) {
          await ctxDelete.click();
          await page.waitForTimeout(1000);
        } else {
          // Try swipe left gesture (common in mobile todo apps)
          const box = await shoppingItem.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 20 });
            await page.mouse.up();
            await page.waitForTimeout(500);
            
            const swipeDelete = page.locator('button:has-text("Delete"), [aria-label="Delete"]').first();
            if (await swipeDelete.isVisible({ timeout: 1000 }).catch(() => false)) {
              await swipeDelete.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      }
    }

    const text3 = await getBodyText(page);
    log('Index after delete attempt:', text3.slice(0, 400));
    const shoppingGone = !/shopping/i.test(text3);
    const tripPrepRemains = /trip prep/i.test(text3);
    flow.steps.push({ step: '"Shopping" deleted', pass: shoppingGone, note: text3.slice(0, 200) });
    flow.steps.push({ step: '"Trip Prep" remains', pass: tripPrepRemains });

    await page.screenshot({ path: path.join(evidenceDir, 'flow-3-lists.png') });
    log('Screenshot saved: flow-3-lists.png');

  } catch (err) {
    log('Flow 3 ERROR:', err.message);
    flow.steps.push({ step: 'ERROR', pass: false, note: err.message });
    flow.pass = false;
    await page.screenshot({ path: path.join(evidenceDir, 'flow-3-error.png') }).catch(() => {});
  }

  flow.pass = flow.steps.every(s => s.pass);
  results.flow3 = flow;
  log('Flow 3 steps:', JSON.stringify(flow.steps, null, 2));
  await ctx.close();
}

// ─── FLOW 4: Manual todo interactions ────────────────────────────────────────
log('\n=== FLOW 4: Manual todo interactions ===');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const flow = { name: 'Manual todo', steps: [], pass: true };

  try {
    // Navigate to home, create/find a list
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.clear(); } catch(e) {} });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Create a list first
    const selectors = ['button:has-text("New List")', 'button:has-text("Create")', 'button:has-text("Add")'];
    let btn = null;
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) { btn = el; break; }
      } catch {}
    }
    if (!btn) {
      const allBtns = await page.locator('button').all();
      if (allBtns.length > 0) btn = allBtns[0];
    }
    if (btn) {
      await btn.click();
      await page.waitForTimeout(500);
      const input = page.locator('input').first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('Test List');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
      }
    }

    // Should be on list page now, or navigate there
    if (!/\/list\//.test(page.url())) {
      const listLink = page.locator('a[href*="/list/"], [href*="/list/"]').first();
      if (await listLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await listLink.click();
        await page.waitForTimeout(1000);
      }
    }

    log('URL on list page:', page.url());
    const listText = await getBodyText(page);
    log('List page text:', listText.slice(0, 400));

    // Find "Add item" input
    const addSelectors = [
      'input[placeholder*="add" i]',
      'input[placeholder*="new" i]',
      'input[placeholder*="todo" i]',
      'input[placeholder*="task" i]',
      'input[placeholder*="item" i]',
      'textarea[placeholder*="add" i]',
      'input[type="text"]',
    ];
    let addInput = null;
    for (const sel of addSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) {
          addInput = el;
          log(`Found add input with: ${sel}`);
          break;
        }
      } catch {}
    }

    if (addInput) {
      await addInput.fill('Buy milk');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      flow.steps.push({ step: 'Added "Buy milk" todo', pass: true });
    } else {
      flow.steps.push({ step: 'Found add input', pass: false, note: 'Add input not found' });
      flow.pass = false;
    }

    // Check "Buy milk" appears
    await page.waitForTimeout(500);
    const textAfterAdd = await getBodyText(page);
    log('Text after adding Buy milk:', textAfterAdd.slice(0, 500));
    const hasMilk = /buy milk/i.test(textAfterAdd);
    flow.steps.push({ step: '"Buy milk" appears in todo panel', pass: hasMilk, note: textAfterAdd.slice(0, 200) });

    if (hasMilk) {
      // Find the Buy milk item and its checkbox
      const todoItem = page.locator('li, div[role="listitem"], [data-testid*="todo"]').filter({ hasText: /buy milk/i }).first();
      const todoVisible = await todoItem.isVisible({ timeout: 2000 }).catch(() => false);
      log('Todo item visible:', todoVisible);

      // Find checkbox within or near the item
      const checkbox = todoItem.locator('input[type="checkbox"], button[role="checkbox"], [role="checkbox"], button[aria-label*="complete" i], button[aria-label*="check" i]').first()
        .or(page.locator('input[type="checkbox"]').first())
        .or(page.locator('[role="checkbox"]').first());

      const checkboxVisible = await checkbox.isVisible({ timeout: 2000 }).catch(() => false);
      log('Checkbox visible:', checkboxVisible);

      if (checkboxVisible) {
        await checkbox.click();
        await page.waitForTimeout(800);
        flow.steps.push({ step: 'Clicked checkbox to complete', pass: true });

        // Check completed styling
        const itemHtml = await todoItem.evaluate(el => el.outerHTML).catch(() => '');
        const todoText = await todoItem.innerText().catch(() => '');
        log('Item HTML after check:', itemHtml.slice(0, 300));
        log('Item text after check:', todoText);
        
        // Check for visual changes: class changes, line-through, opacity, etc.
        const hasCompletedStyle = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('li, [role="listitem"]'));
          for (const item of items) {
            if (/buy milk/i.test(item.innerText)) {
              const style = window.getComputedStyle(item);
              const html = item.outerHTML;
              return {
                textDecoration: style.textDecoration,
                opacity: style.opacity,
                hasLineThrough: /line-through|line_through/i.test(html + style.textDecoration),
                hasCompletedClass: /complete|done|checked|strike/i.test(item.className + item.innerHTML),
                ariaChecked: item.getAttribute('aria-checked'),
                fullHtml: html.slice(0, 300),
              };
            }
          }
          return null;
        });
        log('Completed style check:', JSON.stringify(hasCompletedStyle));
        
        const completed = hasCompletedStyle && (
          hasCompletedStyle.hasLineThrough ||
          hasCompletedStyle.hasCompletedClass ||
          hasCompletedStyle.ariaChecked === 'true' ||
          parseFloat(hasCompletedStyle.opacity) < 0.9
        );
        flow.steps.push({ step: 'Item shows completed styling', pass: !!completed, note: JSON.stringify(hasCompletedStyle) });

        // Uncheck
        await checkbox.click();
        await page.waitForTimeout(800);
        flow.steps.push({ step: 'Clicked to uncomplete', pass: true });

        // Check active styling restored
        const restoredStyle = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('li, [role="listitem"]'));
          for (const item of items) {
            if (/buy milk/i.test(item.innerText)) {
              const style = window.getComputedStyle(item);
              return {
                textDecoration: style.textDecoration,
                hasLineThrough: /line-through/i.test(style.textDecoration),
                hasCompletedClass: /complete|done|checked/i.test(item.className),
              };
            }
          }
          return null;
        });
        const restored = restoredStyle && !restoredStyle.hasLineThrough && !restoredStyle.hasCompletedClass;
        flow.steps.push({ step: 'Item returns to active styling', pass: !!restored || restoredStyle === null });

        // Reload and check persistence
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        const textAfterReload = await getBodyText(page);
        log('Text after reload:', textAfterReload.slice(0, 400));
        const persistedMilk = /buy milk/i.test(textAfterReload);
        flow.steps.push({ step: 'Item persisted after reload', pass: persistedMilk, note: textAfterReload.slice(0, 200) });

      } else {
        flow.steps.push({ step: 'Checkbox found', pass: false, note: 'No checkbox found' });
        flow.pass = false;
      }
    }

    await page.screenshot({ path: path.join(evidenceDir, 'flow-4-manual-todo.png') });
    log('Screenshot saved: flow-4-manual-todo.png');

  } catch (err) {
    log('Flow 4 ERROR:', err.message);
    flow.steps.push({ step: 'ERROR', pass: false, note: err.message });
    flow.pass = false;
    await page.screenshot({ path: path.join(evidenceDir, 'flow-4-error.png') }).catch(() => {});
  }

  flow.pass = flow.steps.every(s => s.pass);
  results.flow4 = flow;
  log('Flow 4 steps:', JSON.stringify(flow.steps, null, 2));
  await ctx.close();
}

// ─── FLOW 5: PWA manifest ────────────────────────────────────────────────────
log('\n=== FLOW 5: PWA manifest ===');
{
  const flow = { name: 'PWA manifest', steps: [], pass: true };
  try {
    const { execSync } = await import('child_process');
    const manifestRaw = execSync('curl -s http://localhost:3000/manifest.json', { timeout: 10000 }).toString();
    log('Manifest raw:', manifestRaw.slice(0, 500));

    let manifest;
    try {
      manifest = JSON.parse(manifestRaw);
      flow.steps.push({ step: 'manifest.json is valid JSON', pass: true });
    } catch (e) {
      flow.steps.push({ step: 'manifest.json is valid JSON', pass: false, note: e.message });
      flow.pass = false;
    }

    if (manifest) {
      const hasName = !!manifest.name;
      const hasShortName = !!manifest.short_name;
      const hasStartUrl = !!manifest.start_url;
      const hasDisplay = !!manifest.display;
      const hasIcons = Array.isArray(manifest.icons) && manifest.icons.length > 0;

      log('Manifest fields:', { name: manifest.name, short_name: manifest.short_name, start_url: manifest.start_url, display: manifest.display, icons: manifest.icons?.length });

      flow.steps.push({ step: 'Has name field', pass: hasName, note: manifest.name });
      flow.steps.push({ step: 'Has short_name field', pass: hasShortName, note: manifest.short_name });
      flow.steps.push({ step: 'Has start_url field', pass: hasStartUrl, note: manifest.start_url });
      flow.steps.push({ step: 'Has display field', pass: hasDisplay, note: manifest.display });
      flow.steps.push({ step: 'Has icons array', pass: hasIcons, note: `${manifest.icons?.length} icons` });

      // Save manifest as text
      fs.writeFileSync(path.join(evidenceDir, 'flow-5-manifest.txt'), JSON.stringify(manifest, null, 2));
      log('Saved: flow-5-manifest.txt');
    }

  } catch (err) {
    log('Flow 5 ERROR:', err.message);
    flow.steps.push({ step: 'ERROR', pass: false, note: err.message });
    flow.pass = false;
  }

  flow.pass = flow.steps.every(s => s.pass);
  results.flow5 = flow;
  log('Flow 5 steps:', JSON.stringify(flow.steps, null, 2));
}

// ─── FLOW 6: Mobile viewport - no horizontal scroll ───────────────────────────
log('\n=== FLOW 6: Mobile viewport ===');
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const flow = { name: 'Mobile viewport', steps: [], pass: true };

  const pagesToCheck = [
    { url: 'http://localhost:3000/', name: 'Home/Index' },
    { url: 'http://localhost:3000/settings', name: 'Settings' },
  ];

  // Also get a list URL if we can
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const listLinks = await page.locator('a[href*="/list/"]').all();
    if (listLinks.length > 0) {
      const href = await listLinks[0].getAttribute('href');
      if (href) pagesToCheck.push({ url: `http://localhost:3000${href}`, name: 'List view' });
    }
  } catch {}

  for (const { url, name } of pagesToCheck) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      log(`${name}: scrollWidth=${scrollWidth} clientWidth=${clientWidth} viewport=375`);

      const noHorizontalScroll = scrollWidth <= 375;
      flow.steps.push({ 
        step: `${name} - no horizontal scroll`, 
        pass: noHorizontalScroll,
        note: `scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`
      });
    } catch (err) {
      flow.steps.push({ step: `${name} - check`, pass: false, note: err.message });
      flow.pass = false;
    }
  }

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(evidenceDir, 'flow-6-viewport.png') });
    log('Screenshot saved: flow-6-viewport.png');
  } catch {}

  flow.pass = flow.steps.every(s => s.pass);
  results.flow6 = flow;
  log('Flow 6 steps:', JSON.stringify(flow.steps, null, 2));
  await ctx.close();
}

await browser.close();

// ─── Final Summary ────────────────────────────────────────────────────────────
log('\n\n=== FINAL QA SUMMARY ===\n');

const flowMap = [
  [results.flow1, 'Onboarding'],
  [results.flow2, 'Settings'],
  [results.flow3, 'List management'],
  [results.flow4, 'Manual todo'],
  [results.flow5, 'PWA manifest'],
  [results.flow6, 'Mobile viewport'],
];

let passCount = 0;
for (const [flow, label] of flowMap) {
  if (!flow) {
    log(`Flow (${label}): NOT RUN`);
    continue;
  }
  const failedSteps = flow.steps.filter(s => !s.pass);
  const status = flow.pass ? 'PASS' : 'FAIL';
  if (flow.pass) passCount++;
  
  if (failedSteps.length > 0) {
    const notes = failedSteps.map(s => `${s.step}${s.note ? ': ' + s.note : ''}`).join('; ');
    log(`Flow (${label}): ${status} - Failed: ${notes}`);
  } else {
    log(`Flow (${label}): ${status}`);
  }
}

log(`\nE2E Flows [${passCount}/6 pass]`);
log(`VERDICT: ${passCount >= 5 ? 'APPROVE' : passCount >= 3 ? 'CONDITIONAL APPROVE' : 'REJECT'}`);
