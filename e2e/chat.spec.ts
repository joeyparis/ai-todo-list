import { test, expect, type Page } from '@playwright/test'

async function clearStorage(page: Page) {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      const req = indexedDB.deleteDatabase('ai-todo-list')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
}

async function setupSettings(
  page: Page,
  provider = 'openai',
  apiKey = 'sk-test-fake-key',
  model = 'gpt-4o-mini',
) {
  await page.evaluate(
    ({ provider, apiKey, model }) =>
      new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open('ai-todo-list')

        openReq.onsuccess = (event: any) => {
          const db = event.target.result as IDBDatabase
          if (!db.objectStoreNames.contains('settings')) {
            reject(new Error('settings object store missing'))
            return
          }
          const tx = db.transaction('settings', 'readwrite')
          const store = tx.objectStore('settings')
          store.put({
            id: 'settings',
            activeProvider: provider,
            providerConfigs: { [provider]: { apiKey, model } },
          })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }

        openReq.onerror = () => reject(openReq.error)
      }),
    { provider, apiKey, model },
  )
}

async function createListAndNavigate(page: Page, name: string) {
  await page.goto('/')
  await clearStorage(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button').filter({ hasText: '+ New List' }).click()
  await page.locator('input[placeholder="List name"]').fill(name)
  await page.locator('form').getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(/\/list\/[a-z0-9-]+/)
  await page.waitForLoadState('networkidle')
}

async function mockChat(
  page: Page,
  {
    body = 'd:{"finishReason":"stop"}\n',
    status = 200,
    contentType = 'text/plain; charset=utf-8',
  }: { body?: string; status?: number; contentType?: string } = {},
) {
  await page.unroute('**/api/chat')
  await page.route('**/api/chat', async route => {
    await route.fulfill({
      status,
      contentType,
      body,
    })
  })
}

test.describe('Chat Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await mockChat(page)
  })

  test('chat input is disabled without API key', async ({ page }) => {
    await createListAndNavigate(page, 'No API Key Test')

    await expect(page.getByText(/Missing AI settings/)).toBeVisible()
    await expect(page.getByPlaceholder('Brain dump your tasks...')).toBeDisabled()
  })

  test('chat input is enabled with API key set', async ({ page }) => {
    await createListAndNavigate(page, 'With API Key Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByPlaceholder('Brain dump your tasks...')).toBeEnabled()
    await expect(page.getByText(/Missing AI settings/)).toHaveCount(0)
  })

  test('empty chat shows start prompt', async ({ page }) => {
    await createListAndNavigate(page, 'Empty Chat Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Start by telling me what you need to get done')).toBeVisible()
  })

  test('sent message appears as user bubble and enter sends', async ({ page }) => {
    let requestCount = 0
    await page.unroute('**/api/chat')
    await page.route('**/api/chat', async route => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'd:{"finishReason":"stop"}\n',
      })
    })

    await createListAndNavigate(page, 'User Bubble Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Brain dump your tasks...').fill('Hello test message')
    await page.keyboard.press('Enter')

    await expect(page.locator('div.bg-blue-500.text-white').filter({ hasText: 'Hello test message' })).toBeVisible()
    await expect.poll(() => requestCount).toBe(1)
  })

  test('successful mocked response completes without showing an error', async ({ page }) => {
    await mockChat(page, {
      body: 'd:{"finishReason":"stop"}\n',
    })

    await createListAndNavigate(page, 'Assistant Response Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Brain dump your tasks...').fill('Hello')
    await page.keyboard.press('Enter')

    await expect(page.locator('div.bg-red-50')).toHaveCount(0)
    await expect(page.locator('div.bg-blue-500.text-white').filter({ hasText: 'Hello' })).toBeVisible()
  })

  test('error response shows error banner', async ({ page }) => {
    await mockChat(page, {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })

    await createListAndNavigate(page, 'Error Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Brain dump your tasks...').fill('This will fail')
    await page.keyboard.press('Enter')

    await expect(page.locator('div.bg-red-50').filter({ hasText: /Internal Server Error|Something went wrong/ })).toBeVisible({ timeout: 10000 })
  })

  test('input is disabled while chat request is loading', async ({ page }) => {
    await page.unroute('**/api/chat')
    await page.route('**/api/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 1200))
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'd:{"finishReason":"stop"}\n',
      })
    })

    await createListAndNavigate(page, 'Loading Test')
    await setupSettings(page)
    await page.reload()
    await page.waitForLoadState('networkidle')

    const textarea = page.getByPlaceholder('Brain dump your tasks...')
    await textarea.fill('loading check')
    await page.keyboard.press('Enter')

    await expect(textarea).toBeDisabled()
    await expect(textarea).toBeEnabled({ timeout: 10000 })
  })
})
