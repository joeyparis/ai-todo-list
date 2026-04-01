# Learnings - testing-deep-dive

## Project Architecture
- Next.js 15 app router, React 19, TypeScript strict mode
- Vitest (node env) for unit tests, fake-indexeddb for DB tests
- `playwright` (raw library) is installed - must be REPLACED with `@playwright/test`
- AI SDK v6: UIMessage uses `.parts` array - NO `.content` property at runtime
- IndexedDB via Dexie.js - database name is `ai-todo-list`, schema version 2

## Key File Locations
- Chat panel: `src/components/chat/ChatPanel.tsx` (primary bug area)
- Settings page: `app/settings/page.tsx` (multiple bugs)
- Prompts: `src/lib/llm/prompts.ts` (indentation bug line 31)
- SplitScreen: `src/components/SplitScreen.tsx` (useMediaQuery inside component)
- Mutations: `src/lib/db/mutations.ts` and `mutations.test.ts`
- Vitest config: `vitest.config.ts` - uses `environment: 'node'` globally

## Patterns
- DB tests use `beforeEach` that clears all tables with `db.lists.clear()` etc.
- Test file path alias: `@/` maps to `src/`
- QA scripts in `scripts/` use `import { chromium } from 'playwright'` (raw API, NOT @playwright/test)
- Settings autosave on every keystroke via onChange handler
- `useMessages` from useLiveQuery returns NEW array reference on every DB change

## Known Gotchas
- Per-file Vitest environment: use `// @vitest-environment happy-dom` at top of file to override global `node` env for React hook tests
- `happy-dom` needs to be added as devDependency if not present
- `window.matchMedia` is NOT available in node environment
- E2E tests need `page.evaluate(() => indexedDB.deleteDatabase('ai-todo-list'))` for clean state between tests
- IndexedDB open must specify version 2 for settings (the correct schema)
- AI SDK stream protocol: single-char prefix + `:` + JSON, newline separated (e.g., `0:"text"\n`)

## Task 5 - addMessage tests

- addMessage mutation: creates message with id, listId, role, content, parts?, createdAt
- setActiveProvider with no settings silently returns (no throw)
- addItems with empty array is valid (returns [])
- Edge cases for mutations: empty arrays, nonexistent IDs, missing settings all handled gracefully
- Test count increased from 48 to 61 (+13 tests)

## Task 7 - ChatPanel AI SDK v6 content extraction fix

- `useChat` `onFinish` assistant persistence must read text from `message.parts` and join text parts, with `?? ''` fallback so `addMessage` always receives a string.
- `summarizeToolCalls` should prefer text parts first, then summarize `tool-invocation` parts only when no text exists.
- User message display in `viewMessages` should also extract from text parts, not `(message as any).content`.
- Verified regression suite after fix: `npm test` (61 tests), `npx tsc --noEmit`, and `npm run build` all pass.

## Task 9 - Playwright E2E onboarding and list management tests

- TodoPanel empty state text is "No items yet. Use the chat below to brain dump your tasks!" (not just "No items yet.")
- getByRole('button', { name: 'Create' }) is a substring match - also hits "Create your first list" CTA; must use `exact: true`
- getByRole('button', { name: 'Delete' }) is a substring match - also hits "List To Delete" list button; must use `exact: true`
- Playwright getByRole name matching is substring by default (exact: false); use exact: true whenever the text appears in longer button names
- Scoping Options button: use `page.locator('.border.rounded-xl').filter({ hasText: listName }).getByRole('button', { name: 'Options' })`
- window.confirm dialog: must call `page.on('dialog', d => d.accept())` BEFORE the action that triggers the confirm
- createList() helper: goto('/') -> clearStorage() -> reload() -> networkidle is the reliable clean-state pattern
- Back button in SplitScreen renders "← Back" (literal Unicode ←); use getByRole('button', { name: /Back/ }) to avoid encoding issues
