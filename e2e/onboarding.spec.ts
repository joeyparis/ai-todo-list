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

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('shows empty state on fresh visit', async ({ page }) => {
    await expect(page.getByText('No lists yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create your first list' })).toBeVisible()
  })

  test('New List button shows create form', async ({ page }) => {
    await page.getByRole('button', { name: '+ New List' }).click()
    await expect(page.locator('input[placeholder="List name"]')).toBeVisible()
  })

  test('creates a list and navigates to it', async ({ page }) => {
    await page.getByRole('button', { name: '+ New List' }).click()
    await page.locator('input[placeholder="List name"]').fill('Weekend Errands')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page).toHaveURL(/\/list\/[a-z0-9-]+/)
  })

  test('list page shows empty todo panel and API key warning', async ({ page }) => {
    await page.getByRole('button', { name: '+ New List' }).click()
    await page.locator('input[placeholder="List name"]').fill('Test List')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.waitForURL(/\/list\/[a-z0-9-]+/)
    await expect(page.getByText('No items yet.')).toBeVisible()
    await expect(page.getByText('Missing AI settings')).toBeVisible()
  })
})
