import { test, expect, type Page } from '@playwright/test'

async function createListAndNavigate(page: Page, name: string) {
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
  await page.waitForSelector('input[placeholder="Add item..."]')
}

test.describe('Todo CRUD Operations', () => {
  test('empty state shown for new list', async ({ page }) => {
    await createListAndNavigate(page, 'Empty Test')
    await expect(page.getByText(/No items yet/i)).toBeVisible()
  })

  test('add item via AddItemInput Enter key', async ({ page }) => {
    await createListAndNavigate(page, 'Add Test')
    await page.locator('input[placeholder="Add item..."]').fill('Buy milk')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.getByText('Buy milk')).toBeVisible()
  })

  test('Add button click also adds item', async ({ page }) => {
    await createListAndNavigate(page, 'Add Button Test')
    await page.locator('input[placeholder="Add item..."]').fill('Added via button')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Added via button')).toBeVisible()
  })

  test('complete item changes styling and aria-label', async ({ page }) => {
    await createListAndNavigate(page, 'Complete Test')
    await page.locator('input[placeholder="Add item..."]').fill('Task to complete')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('button[aria-label="Mark incomplete"]')).toBeVisible()
    await expect(page.locator('p', { hasText: 'Task to complete' })).toHaveClass(/line-through/)
  })

  test('uncomplete item restores active styling', async ({ page }) => {
    await createListAndNavigate(page, 'Uncomplete Test')
    await page.locator('input[placeholder="Add item..."]').fill('Task to toggle')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(300)
    await page.locator('button[aria-label="Mark incomplete"]').first().click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[aria-label="Mark complete"]')).toBeVisible()
    await expect(page.locator('p', { hasText: 'Task to toggle' })).not.toHaveClass(/line-through/)
  })

  test('item persists after page reload', async ({ page }) => {
    await createListAndNavigate(page, 'Persist Test')
    await page.locator('input[placeholder="Add item..."]').fill('Persistent item')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Persistent item')).toBeVisible()
  })

  test('completed state persists after reload', async ({ page }) => {
    await createListAndNavigate(page, 'Complete Persist Test')
    await page.locator('input[placeholder="Add item..."]').fill('Complete me')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[aria-label="Mark incomplete"]')).toBeVisible()
    await expect(page.locator('p', { hasText: 'Complete me' })).toHaveClass(/line-through/)
  })

  test('multiple items added in order are all visible', async ({ page }) => {
    await createListAndNavigate(page, 'Order Test')
    const items = ['First item', 'Second item', 'Third item']
    for (const item of items) {
      await page.locator('input[placeholder="Add item..."]').fill(item)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    }
    await expect(page.getByText('First item')).toBeVisible()
    await expect(page.getByText('Second item')).toBeVisible()
    await expect(page.getByText('Third item')).toBeVisible()
  })

  test('completed items appear in Completed section', async ({ page }) => {
    await createListAndNavigate(page, 'Completed Section Test')
    await page.locator('input[placeholder="Add item..."]').fill('Will complete this')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/Completed \(1\)/)).toBeVisible()
  })

  test('completing all items shows Completed section with correct count', async ({ page }) => {
    await createListAndNavigate(page, 'Multi Complete Test')
    await page.locator('input[placeholder="Add item..."]').fill('Item alpha')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="Add item..."]').fill('Item beta')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(300)
    await page.locator('button[aria-label="Mark complete"]').first().click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/Completed \(2\)/)).toBeVisible()
  })
})
