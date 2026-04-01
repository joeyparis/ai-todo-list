import { test, expect } from '@playwright/test'

async function clearStorage(page: any) {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      const req = indexedDB.deleteDatabase('ai-todo-list')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('settings page shows provider tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'OpenAI' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anthropic' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google Gemini' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'OpenRouter' })).toBeVisible()
  })

  test('active provider shows API key input and model select', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('switching provider changes active tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Anthropic' }).click()
    await expect(page.getByRole('button', { name: 'Anthropic' })).toHaveClass(/border-blue-500/)
  })

  test('API key persists after reload', async ({ page }) => {
    await page.locator('input[type="password"]').fill('sk-test-value-for-persistence')
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="password"]')).toHaveValue('sk-test-value-for-persistence')
  })

  test('model selection persists after reload', async ({ page }) => {
    const select = page.locator('select')
    await select.selectOption({ index: 1 })
    const selectedValue = await select.inputValue()
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('select')).toHaveValue(selectedValue)
  })

  test('invalid prefix shows amber warning', async ({ page }) => {
    await page.locator('input[type="password"]').fill('invalid-prefix-key-that-is-long-enough')
    await expect(page.locator('.text-amber-600').first()).toBeVisible()
  })

  test('entering API key shows saved indicator', async ({ page }) => {
    await page.locator('input[type="password"]').fill('sk-test-key-12345')
    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 3000 })
  })

  test('navigating to settings from list works', async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New List' }).click()
    await page.locator('input[placeholder="List name"]').fill('Nav Test List')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.waitForURL(/\/list\/[a-z0-9-]+/)
    await page.waitForLoadState('networkidle')
    await page.locator('a[href="/settings"]').first().click()
    await expect(page).toHaveURL('/settings')
  })
})
