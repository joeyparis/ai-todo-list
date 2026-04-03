import { test, expect } from '@playwright/test'
import { writeFileSync } from 'fs'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

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

async function createListViaUI(page: any, name: string) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: '+ New List' }).click()
  await page.locator('input[placeholder="List name"]').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(/\/list\/[a-z0-9-]+/)
  await page.waitForLoadState('networkidle')
}

function createExportFile(
  lists: Array<{ id: string; name: string }>,
  items: Array<{ id: string; listId: string; text: string }> = []
): string {
  const dir = tmpdir()
  const filePath = join(dir, `test-export-${Date.now()}.json`)
  const now = new Date().toISOString()
  const data = {
    version: 1,
    exportedAt: now,
    data: {
      lists: lists.map(l => ({
        id: l.id,
        name: l.name,
        createdAt: now,
        updatedAt: now,
      })),
      items: items.map(i => ({
        id: i.id,
        listId: i.listId,
        text: i.text,
        completed: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
        order: 0,
      })),
    },
  }
  writeFileSync(filePath, JSON.stringify(data))
  return filePath
}

test.describe('Import / Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('Export section shows "Export Data" heading', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Export Data' })).toBeVisible()
  })

  test('Export button is disabled when nothing is selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeDisabled()
  })

  test('Select All enables the Export button', async ({ page }) => {
    await createListViaUI(page, 'List for Export')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Select All')).toBeVisible({ timeout: 5000 })
    await page.getByText('Select All').click()
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeEnabled()
  })

  test('Deselect All disables the Export button again', async ({ page }) => {
    await createListViaUI(page, 'List to Deselect')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Select All')).toBeVisible({ timeout: 5000 })
    await page.getByText('Select All').click()
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeEnabled()
    await page.getByText('Deselect All').click()
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeDisabled()
  })

  test('Export button downloads a JSON file with correct structure', async ({ page }) => {
    await createListViaUI(page, 'Exported List')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Select All')).toBeVisible({ timeout: 5000 })
    await page.getByText('Select All').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export', exact: true }).click(),
    ])
    const filePath = await download.path()
    expect(filePath).toBeTruthy()
    const content = readFileSync(filePath!, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBeDefined()
    expect(Array.isArray(parsed.data.lists)).toBe(true)
    expect(parsed.data.lists.length).toBeGreaterThan(0)
    expect(parsed.data.lists[0].name).toBe('Exported List')
    expect(Array.isArray(parsed.data.items)).toBe(true)
  })

  test('Import section is visible with file input and mode toggle', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Import Data' })).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeAttached()
    await expect(
      page.getByRole('button', { name: 'Merge (add alongside existing)' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Replace (overwrite everything)' })
    ).toBeVisible()
  })

  test('Import button is disabled until a file is selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled()
    const filePath = createExportFile([{ id: 'list-enable-1', name: 'Enable Test' }])
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled()
  })

  test('Merge import shows success banner', async ({ page }) => {
    const filePath = createExportFile([{ id: 'list-merge-1', name: 'Merged List' }])
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(page.getByText(/Imported 1 list/)).toBeVisible({ timeout: 5000 })
  })

  test('Replace import shows confirmation dialog before executing', async ({ page }) => {
    const filePath = createExportFile([{ id: 'list-replace-1', name: 'Replace List' }])
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await page.getByRole('button', { name: 'Replace (overwrite everything)' }).click()
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(
      page.getByText('This will delete all existing data. Are you sure?')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Yes, Replace' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  test('Cancel on replace confirmation does nothing', async ({ page }) => {
    const filePath = createExportFile([{ id: 'list-cancel-1', name: 'Cancel List' }])
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await page.getByRole('button', { name: 'Replace (overwrite everything)' }).click()
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(
      page.getByText('This will delete all existing data. Are you sure?')
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(
      page.getByText('This will delete all existing data. Are you sure?')
    ).not.toBeVisible()
    await expect(page.getByText(/Imported \d+ list/)).not.toBeVisible()
  })

  test('Confirm replace actually imports data', async ({ page }) => {
    const filePath = createExportFile([{ id: 'list-confirm-1', name: 'Confirmed List' }])
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await page.getByRole('button', { name: 'Replace (overwrite everything)' }).click()
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(
      page.getByText('This will delete all existing data. Are you sure?')
    ).toBeVisible()
    await page.getByRole('button', { name: 'Yes, Replace' }).click()
    await expect(page.getByText(/Imported 1 list/)).toBeVisible({ timeout: 5000 })
  })

  test('Invalid file shows error banner', async ({ page }) => {
    const dir = tmpdir()
    const filePath = join(dir, `test-invalid-${Date.now()}.json`)
    writeFileSync(filePath, 'not valid json { at all!!!')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(page.getByText(/Invalid JSON file/)).toBeVisible({ timeout: 5000 })
  })
})
