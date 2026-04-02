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

async function createList(page: any, name: string) {
  await page.getByRole('button', { name: '+ New List' }).click()
  await page.locator('input[placeholder="List name"]').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(/\/list\/[a-z0-9-]+/)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test.describe('List Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('created list appears on index', async ({ page }) => {
    await createList(page, 'My Test List')
    await expect(page.getByText('My Test List')).toBeVisible()
  })

  test('multiple lists visible on index', async ({ page }) => {
    await createList(page, 'List Alpha')
    await createList(page, 'List Beta')
    await expect(page.getByText('List Alpha')).toBeVisible()
    await expect(page.getByText('List Beta')).toBeVisible()
  })

  test('click list navigates to list detail', async ({ page }) => {
    await createList(page, 'Nav Test')
    await page.getByRole('button').filter({ hasText: 'Nav Test' }).click()
    await expect(page).toHaveURL(/\/list\/[a-z0-9-]+/)
  })

  test('back button returns to index from list view', async ({ page }) => {
    await createList(page, 'Back Test')
    await page.getByRole('button').filter({ hasText: 'Back Test' }).click()
    await page.waitForURL(/\/list\/[a-z0-9-]+/)
    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page).toHaveURL('http://localhost:3000/')
  })

  test('delete list via options menu', async ({ page }) => {
    await createList(page, 'List To Delete')
    await createList(page, 'List To Keep')

    page.on('dialog', dialog => dialog.accept())

    const listItem = page.locator('[data-testid="list-card"]').filter({ hasText: 'List To Delete' })
    await listItem.getByRole('button', { name: 'List options' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText('List To Delete')).not.toBeVisible()
    await expect(page.getByText('List To Keep')).toBeVisible()
  })
})
