import { test, expect } from '@playwright/test'

async function createListAndNavigate(page: any, name: string) {
  await page.goto('/')
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      const req = indexedDB.deleteDatabase('ai-todo-list')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.goto('/')
  await page.waitForLoadState('load')
  await page.getByRole('button').filter({ hasText: '+ New List' }).click()
  await page.locator('input[placeholder="List name"]').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(/\/list\/[a-z0-9-]+/)
  await page.waitForLoadState('networkidle')
}

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  
  test('tab navigation appears on mobile viewport and switches tabs', async ({ page }) => {
    await createListAndNavigate(page, 'Mobile Test')
    await page.waitForTimeout(500)
    
    const tasksTab = page.locator('[data-testid="tab-tasks"]')
    const chatTab = page.locator('[data-testid="tab-chat"]')
    
    await expect(tasksTab).toBeVisible({ timeout: 10000 })
    await expect(chatTab).toBeVisible()
    
    await expect(page.locator('[data-testid="split-divider"]')).not.toBeVisible()
    
    await expect(page.getByPlaceholder('Brain dump your tasks...')).toBeVisible()
    await expect(page.locator('input[placeholder="Add item..."]')).not.toBeVisible()
    
    await tasksTab.click()
    await expect(page.locator('input[placeholder="Add item..."]')).toBeVisible()
    await expect(page.getByPlaceholder('Brain dump your tasks...')).not.toBeVisible()

    await chatTab.click()
    await expect(page.getByPlaceholder('Brain dump your tasks...')).toBeVisible()
    await expect(page.locator('input[placeholder="Add item..."]')).not.toBeVisible()
  })
})
