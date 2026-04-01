# Learnings

## [2026-04-01] Task 1: Project Scaffold

### Next.js 15 + TypeScript Setup
- Next.js 15 requires dynamic route params to be async: `params: Promise<{ id: string }>`
- Must use `await params` before accessing properties in Server Components
- TypeScript strict mode works out of the box with Next.js 15
- Tailwind content paths must include both `./app/**` and `./src/**` for proper CSS generation

### PWA Meta Tags
- Include `viewport-fit=cover` for notch support on mobile
- `apple-mobile-web-app-capable` and `mobile-web-app-capable` enable PWA install prompts
- `apple-mobile-web-app-status-bar-style` controls iOS status bar appearance

### Dependencies
- Dexie 4.0.0 is stable and works well with React 19
- AI SDK packages (@ai-sdk/openai, @ai-sdk/anthropic) are at 1.0.0 stable
- Zod 3.23.0 for runtime validation
- fake-indexeddb 6.0.0 for testing IndexedDB in Node environment

### Project Structure
- `src/lib/db/` for Dexie database schemas and queries
- `src/lib/llm/` for AI SDK integrations and prompts
- `src/components/` for reusable React components
- `scripts/` for QA and utility scripts

### Git Workflow
- Initial scaffold commit: `init: scaffold Next.js app with TypeScript and Tailwind`
- Follow-up fix: `fix: make ListPage async to properly handle dynamic params`
- All commits use plain English style (no semantic prefixes in this repo)

## [2026-04-01] Task 4: LLM Tool Schemas

### AI SDK Tool Definition Pattern
- Use `tool()` from 'ai' package to define LLM-callable tools
- Each tool requires `description` (for LLM context) and `parameters` (Zod schema)
- Tool descriptions should explain WHEN to use the tool, not just WHAT it does
- Parameter descriptions use `.describe()` on Zod fields for LLM clarity

### Zod Validation for Tool Parameters
- Use `z.string().min(1)` to reject empty strings in text fields
- Use `z.array(...).min(1)` to reject empty arrays in ID lists
- Use `z.record(z.unknown())` for flexible metadata objects
- Use `.optional()` for fields that may be omitted
- Zod `.parse()` throws ZodError on validation failure - catch and handle appropriately

### Tool Design for Todo App
- 6 tools total: addItems, completeItems, uncompleteItems, updateItem, deleteItems, addAndCompleteItems
- addAndCompleteItems is distinct from addItems - use only when user mentions already-completed tasks
- All ID-based operations use string arrays for batch operations
- Metadata is flexible (priority, location, effort, skipability) - inferred from context by LLM

### Testing LLM Tools
- Import `fake-indexeddb/auto` before any DB-dependent imports
- Extract `.parameters` from each tool to test schemas independently
- Test both valid inputs (should parse) and invalid inputs (should throw ZodError)
- Verify all expected tools exist in the exported object

## [2026-04-01] Task 2: Dexie.js Database Layer

### Dexie Schema Syntax
- Schema string syntax: `'id, listId, order'` - only indexed fields listed (not all fields)
- Primary key always goes first: `'id, ...'` for string PKs, `'++id, ...'` for auto-increment
- Only indexes needed for queries/sorts go in the schema string - non-indexed fields are still stored
- `Table<EntityType, PKType>` generic for type-safe table access

### Dexie Mutations
- `bulkUpdate()` takes `Array<{ key: string, changes: Partial<Entity> }>` - Dexie 4.x API
- `bulkAdd()` and `bulkDelete()` work on arrays of items/keys
- Use `db.transaction('rw', [db.table1, db.table2], async () => { ... })` for multi-table atomic ops
- `db.items.where('listId').equals(id).delete()` for batch deletes by index
- `db.table.put(record)` upserts (replaces if PK exists, inserts if not)
- `db.table.update(id, changes)` only updates specified fields, leaves others unchanged

### Testing Dexie in Node
- `import 'fake-indexeddb/auto'` MUST be first import - before any Dexie/db imports
- `fake-indexeddb` 6.0.0 fully compatible with Dexie 4.0.0
- Date comparisons with `<=` can fail if timestamps land in same millisecond - add `await new Promise(r => setTimeout(r, 5))` between create and update in tests
- `db.settings.get('settings')` returns `undefined` (not null) when record doesn't exist

### hooks.ts Patterns
- `'use client'` directive only in hooks.ts (React hooks are client-only)
- `useLiveQuery(() => query, [deps])` - deps array triggers re-query when values change
- `.orderBy('field').reverse().toArray()` for descending sort
- `.where('index').equals(value).sortBy('field')` for filtered + sorted queries

## PWA Setup with Serwist (Task 3)

### Key Learnings

1. **Serwist Integration**
   - `@serwist/next` provides a Next.js wrapper that handles service worker bundling
   - The `withSerwistInit` HOC wraps the Next.js config
   - Service worker source: `src/sw.ts`, compiled to: `public/sw.js`
   - Serwist automatically injects `__SW_MANIFEST` at build time (requires TypeScript reference directive)

2. **Service Worker Type Safety**
   - Must add `/// <reference lib="webworker" />` to enable ServiceWorkerGlobalScope types
   - Declare `self.__SW_MANIFEST` with proper type to avoid TypeScript errors
   - The manifest is injected by Serwist during build, not available at dev time in editor

3. **Manifest Structure**
   - Required fields: name, short_name, description, start_url, display, icons
   - Icons need `purpose: "any maskable"` for modern PWA support
   - Both 192x192 and 512x512 sizes recommended for Android/iOS compatibility
   - Manifest served as static file from public/ directory

4. **Icon Generation**
   - Minimal valid PNG files can be created from base64 (1x1 pixel placeholder)
   - For MVP, placeholder icons are sufficient - can be replaced later with proper designs
   - Icons stored in public/icons/ and referenced in manifest.json

5. **Layout Integration**
   - Add manifest link: `<link rel="manifest" href="/manifest.json" />`
   - Add apple-mobile-web-app-title for iOS home screen
   - Add theme-color meta tag for browser UI theming
   - Preserve existing viewport and apple-mobile-web-app-capable tags

6. **Build Process**
   - Serwist bundling happens during `npm run build`
   - Service worker is pre-cached with all static assets
   - Build output shows "(serwist) Bundling the service worker script..." confirmation
   - No additional build steps needed beyond standard Next.js build

7. **Verification**
   - Manifest endpoint: `curl http://localhost:3000/manifest.json`
   - Service worker: `curl http://localhost:3000/sw.js`
   - Both should be accessible and valid
   - Browser DevTools > Application tab shows manifest and service worker registration

### Configuration Files Modified
- `next.config.ts`: Added Serwist HOC wrapper
- `app/layout.tsx`: Added manifest link and meta tags
- `src/sw.ts`: Created service worker entry point
- `public/manifest.json`: Created PWA manifest
- `public/icons/`: Created icon directory with placeholder PNGs

### Next Steps
- Replace placeholder icons with actual app icons
- Add offline page for better UX
- Consider adding background sync for todo updates
- Test PWA installation on mobile devices

## [2026-04-01] Task 7: List Index Page

### useLists() with Dexie React Hooks
- `useLists()` returns `undefined` while Dexie initializes IndexedDB - always handle loading state before rendering
- `useLiveQuery` is async; in Playwright headless mode the JS needs ~2-3 seconds after `networkidle` to finish rendering
- Checking `isVisible()` immediately after `waitForLoadState('networkidle')` can return `false` even when content is correct - always add `waitForTimeout` or `waitForSelector` for Dexie-backed pages

### Interactive Elements and Biome Accessibility Rules
- `<div onClick>` triggers two Biome errors: "Static Elements should not be interactive" and missing keyboard event - use `<button type="button">` instead
- `autoFocus` attribute is flagged by Biome a11y rules - omit it or use `useEffect` with a ref
- All `<button>` elements need explicit `type="button"` or `type="submit"` to avoid Biome warnings
- Menu buttons inside cards must call `e.stopPropagation()` to prevent triggering parent card navigation

### Dialog Handling in Playwright
- `window.confirm()` and `window.prompt()` create Playwright dialogs - register `page.once('dialog', ...)` BEFORE clicking the action that triggers the dialog, not after
- `page.on('dialog', ...)` listens for all dialogs; `page.once('dialog', ...)` handles a single one

### Client Component Architecture
- `'use client'` required at top of any file using React hooks (`useState`, `useRouter`, etc.)
- `useRouter` from `next/navigation` for programmatic navigation in client components
- Forms submit via `onSubmit` with `e.preventDefault()` - keeps navigation in JavaScript control

## [2026-04-01] Task 5: Prompt Engineering Module

### Prompt Construction Patterns
- Keep system prompts provider-agnostic by using plain text sections and JSON-like examples only.
- Separate list serialization from instruction text so prompt behavior can evolve without changing context formatting.
- Deterministic metadata ordering (alphabetical keys) makes prompt snapshots stable and easier to test.

### Token-Efficient List State
- Compact headers like `LIST:`, `GOAL:`, and `ITEMS:` reduce tokens while preserving clarity.
- Use `[id]` prefixes on each item so the model can map fuzzy matches to tool-call IDs.
- Render done items inline with `✓` to keep full context visible without extra sections.

### Behavior Quality Improvements
- Few-shot examples should cover both tool-calling and no-tool advisory replies to reduce generic outputs.
- Explicit ambiguity rules improve safety by favoring clarification over incorrect completion calls.
- Metadata inference instructions should name target keys and allowed values for better consistency.

## [2026-04-01] Task 6: Settings Page

### useSettings() Hook Pattern
- `useSettings()` returns `Settings | undefined` - undefined means still loading, not "no settings"
- Use a `loaded` flag in state to only sync from Dexie into local form state ONCE on first load, avoiding overwriting user edits on subsequent Dexie re-renders
- Pattern: `if (settings && !loaded) { setProvider(...); setLoaded(true) }`

### Provider/Model Cascade Pattern
- When provider changes, check if current model is valid for new provider - if not, reset to first available model
- `MODELS[provider] ?? []` - always guard with nullish coalescing when using a Record as a lookup

### TypeScript Strict Mode Edge Cases
- `||` and `??` cannot be mixed without parentheses: `a || b ?? c` is a compile error - use `a || (b ?? c)` instead
- `res.json()` returns `Promise<any>` - asserting with `as InterfaceName` is clean and valid without `@ts-ignore`
- Defining a local `interface TestConnectionResponse` keeps the cast explicit and readable

### AI SDK Provider Initialization
- `createOpenAI({ apiKey })(model)` and `createAnthropic({ apiKey })(model)` both create provider-specific language models
- `generateText({ model, prompt, maxTokens })` works with both providers - unified interface from `ai` package
- Auth errors from providers typically include "auth", "key", "401", or "unauthorized" in the error message - case-insensitive check covers all variants

### Mobile Form Design Patterns
- `style={{ height: '48px' }}` for all interactive elements guarantees 44px+ touch targets on iOS
- 16px+ (`text-base`) prevents iOS Safari auto-zoom on input focus
- `disabled:opacity-50 disabled:cursor-not-allowed` provides clear visual feedback for disabled buttons
- Password toggle pattern: `type={showKey ? 'text' : 'password'}` on input, dedicated button with Show/Hide label

### Next.js App Router + Chrome Headless Screenshot Timing
- Chrome headless `--screenshot` can capture 404 on first hit if Next.js hasn't compiled the route yet
- Always curl the page first to trigger compilation, then take the screenshot
- The `--virtual-time-budget=N` flag helps Chrome wait for async content before screenshotting
- HTTP 200 from curl confirms the route is registered and compiled - safe to screenshot after

## [2026-04-01] Task 8: SplitScreen Layout

### Next.js 15 Client Components with Dynamic Params
- Client components must use `use(params)` (React 19 hook) to unwrap async dynamic route params - not `await`.
- `'use client'` and `use()` are compatible; `useRouter` also works in the same component.
- When converting an async Server Component to a Client Component, drop `async` and swap `await params` for `use(params)`.

### Flex-Based Split Panel Layout
- `flex-[N]` Tailwind utility sets `flex: N` on a panel, enabling proportional sizing without fixed pixel heights.
- Setting `flex-[0] min-h-0` collapses a flex child to zero height while `transition-all duration-300` provides a smooth CSS animation.
- `h-[100dvh]` is required over `h-screen` on mobile - `dvh` units account for the browser chrome/keyboard changing viewport height.
- Panels need `overflow-hidden` on the collapsible container and `overflow-y-auto` on the scrollable inner div, not the outer.

### LSP / Linting
- Explicit `type="button"` is required on all `<button>` elements to satisfy Next.js ESLint rule (`react/button-has-type`).
- Always run `lsp_diagnostics` on new component files before running `tsc` - faster feedback loop.

### Dev Server Startup
- Starting dev server before modified files are compiled results in a runtime ENOENT error. Always restart after file changes when the server was already running with old output.
- The `.next/server/app/` path mirrors the `app/` directory - file not found at that path means the route was never compiled.

## [2026-04-01] Task 12: Todo Panel Components

### MetadataBadges Pattern
- Local sub-component in same file is fine for tight cohesion - `MetadataBadges` doesn't need its own file
- `Object.entries(metadata)` gives ordered key-value pairs from `Record<string, unknown>`
- Always `String(value)` to coerce unknown metadata values before display
- Priority badge maps: `high -> red-100/red-700`, `medium -> yellow-100/yellow-700`, `low -> green-100/green-700`
- Other known keys (location, effort, skipability) get emoji prefixes or small gray labels
- Unknown keys fall back to `key: value` in gray text
- Guard with `if (entries.length === 0) return null` to avoid empty div rendering

### Touch Target Sizing
- Checkbox buttons use `style={{ minWidth: '44px', minHeight: '44px', margin: '-9px' }}` trick: negative margin expands hit area without adding visual size
- The visible button stays w-6 h-6 (24px) while the actual tap target is 44px - negative margin compensates for layout

### Dexie useItems() Undefined Guard
- `useItems(listId)` returns `Item[] | undefined` - undefined = loading, empty array = no items
- Always check `items === undefined` separately from `items.length === 0` for correct loading vs empty state

### Component File Organization
- `src/components/todo/` directory groups all todo-specific UI
- `TodoItem` is purely display - all mutations (completeItems, uncompleteItems) imported directly, no props for handlers
- `AddItemInput` manages its own local state (`value`) and clears after successful add
- `TodoPanel` composes TodoItem and AddItemInput - owns the items query and splits active/completed

### Pre-existing TypeScript Errors
- `src/components/chat/ChatPanel.tsx` had pre-existing tsc errors (from Task 10/11) - not introduced by Task 12
- Always grep evidence file for your own filenames to confirm zero new errors before noting "clean"

## [2026-04-01] Task 11: ChatPanel Integration

### useChat v1 Request Shaping
- `@ai-sdk/react@1.x` supports `experimental_prepareRequestBody`, which is the safest place to inject dynamic request body and trim context messages.
- `body` passed into `useChat` can become stale for changing list state, so storing latest payload in a `useRef` and reading it inside `experimental_prepareRequestBody` keeps list/items/settings fresh on every send.
- Message context trimming is cleanly enforced with `messages.slice(-20)` inside `experimental_prepareRequestBody`, so UI history can stay full while LLM context stays bounded.

### Dexie and UI Message Hydration
- Dexie `Message.parts` persisted as JSON string can be restored into AI SDK UI message `parts`; fallback to `[{ type: 'text', text: content }]` if parse fails.
- `useMessages(listId)` resolves asynchronously, so one-time hydration needs `setMessages(...)` guarded by a `hasHydratedRef` flag once persisted messages are available.
- Persist user messages immediately on send and assistant messages in `onFinish` for reload-safe transcript continuity.

### Type Safety Notes
- In this SDK version, `useChat` `onFinish` signature is `onFinish(message, options)`, not a single object argument.
- `ChatMessages` expects `messageRole`, so mapped chat messages need a role-narrowing filter to `'user' | 'assistant'` before rendering.

## [2026-04-01] Task 13: LLM Executor Trust Boundary

### Validation and Mutation Safety
- Reuse `todoTools.<tool>.parameters.parse(args)` in executor so runtime validation exactly matches the LLM tool contract.
- Catch `z.ZodError` centrally and return `Invalid arguments: ...` to prevent any mutation on malformed payloads.
- Keep mutation calls behind validated branching only, so untrusted LLM output never reaches Dexie writes directly.

### Partial Success Pattern for Batch IDs
- For `completeItems`, `uncompleteItems`, and `deleteItems`, prefetch existing IDs via `db.items.where('id').anyOf(itemIds).toArray()`.
- Split IDs into `existingIds` and `missingIds`, mutate only existing IDs, and return `notFound` for missing IDs.
- This keeps batch operations resilient and avoids full-request failure when a subset of IDs is stale.

### Node QA Script Pattern
- `fake-indexeddb/auto` must remain the first import in script-based tests.
- Use fail-fast assertions with `if (!condition) process.exit(1)` style checks for deterministic CI behavior.
- Persist script output to `.sisyphus/evidence/task-13-add-items.txt` inside the test script so evidence is always produced with the run.

## [2026-04-01] Task 14: Wired List View + Chat Tool Execution

### Page Wiring Pattern for `app/list/[id]/page.tsx`
- Use `use(params)` in client route pages to read dynamic list IDs in Next.js 15.
- `useList(id)` must handle three states explicitly: `undefined` (loading), `null` (not found), and populated list.
- Redirect deleted/missing lists with `router.push('/')` and return `null` immediately to avoid rendering stale panel UI.
- Compose final page through `SplitScreen` and pass concrete panel components instead of placeholders.

### AI SDK Tool Call Bridge in `ChatPanel`
- `useChat` supports `onToolCall`, which is the handoff point from model tool invocations to local app mutations.
- Wiring `executeToolCall(toolCall.toolName, toolCall.args, listId)` directly in `onToolCall` keeps list-scoped mutations bounded by route context.
- Returning executor results from `onToolCall` feeds structured mutation outcomes back to the model for follow-up assistant responses.

### Reactive Dexie Flow
- `TodoPanel` reads items through `useItems(listId)` backed by `useLiveQuery`, so Dexie writes from chat tool execution auto-refresh UI without manual sync.
- Brain-dump prompts map to `addItems` tool calls and completion prompts map to `completeItems`; both become immediate UI updates through Dexie reactivity.

### AI SDK Deprecation Cleanup
- `useChat().isLoading` is deprecated in current typings; use `status` and derive loading as `status === 'submitted' || status === 'streaming'`.

## [2026-04-01] Task 15: Polish - Empty States, Error Handling, Mobile UX

### Dev Artifact Cleanup
- `tsx` can be removed from devDependencies once all test scripts are deleted - it was only needed to run `.ts` scripts directly with `npx tsx`
- Removing the `app/dev/` directory removes those routes from the Next.js build output automatically - no config changes needed

### Empty States Already Present
- All 3 key empty states were already implemented in previous tasks:
  - `app/page.tsx`: "No lists yet." + CTA button
  - `TodoPanel.tsx`: "No items yet. Use the chat below to brain dump your tasks!"
  - `ChatMessages.tsx`: "Start by telling me what you need to get done"
- The missing API key warning banner in `ChatPanel.tsx` redirects user to settings inline

### Mobile Overflow Prevention
- Adding `overflow-x: hidden` + `max-width: 100%` to `html, body` in `globals.css` is the safest global guard against accidental horizontal scroll
- Verified at 375px with Playwright: all pages had `scrollWidth <= 375` after this change
- `max-w-lg mx-auto` containers naturally constrain at narrow viewports but need the body guard for edge cases

### Favicon Pattern for Next.js PWA Apps
- Since icons already exist at `public/icons/icon-192.png` for the PWA manifest, just add `<link rel="icon" href="/icons/icon-192.png" />` to `app/layout.tsx` - no need to create a separate `favicon.ico`
- Next.js App Router supports `<link rel="icon">` directly in the `<head>` inside `layout.tsx`

### Mobile Viewport QA with Playwright
- `page.evaluate(() => document.body.scrollWidth)` after navigation to each route checks for overflow
- `/list/test-id` redirects to `/` for non-existent IDs (expected Dexie null handling) - use `waitUntil: 'domcontentloaded'` + try/catch to still capture scroll width before redirect fires
- Screenshot evidence saved to `.sisyphus/evidence/task-15-mobile-viewport.png`
