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
