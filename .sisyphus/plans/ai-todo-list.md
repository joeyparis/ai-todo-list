# AI-Powered Todo List - MVP

## TL;DR

> **Quick Summary**: Build a mobile-first PWA where users manage todo lists through natural language chat. The AI parses brain dumps into structured items, crosses off completions, infers metadata, and answers list queries - all via a split-screen interface with chat below and list above.
> 
> **Deliverables**:
> - Split-screen PWA (todo list panel + chat panel, show/hide each)
> - List index page for managing multiple active lists
> - AI chat that creates, completes, updates, and queries todo items via tool calling
> - Manual list interactions (check off, add items) alongside chat
> - AI-inferred metadata per item (priority, location, effort, skipability)
> - BYO API key with provider selection (OpenAI / Anthropic)
> - Local-only storage via IndexedDB (no accounts, no cloud)
> - PWA installable to home screen
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + final verification
> **Critical Path**: Scaffold -> Database + Tools -> LLM API Route -> Chat Interface -> Cross-Panel Integration -> Polish

---

## Context

### Original Request
User wants a mobile app/website that acts as an LLM-powered todo list manager. The core idea: brain dump thoughts into a chat, the AI organizes them into a structured list with rich metadata. Brain dump completions and the AI crosses things off. Chat to query, reorder, and adjust the list using the AI's understanding of each item's context (location, priority, skipability, etc.).

### Interview Summary
**Key Discussions**:
- **UI model**: Split-screen with todo list on top, chat on bottom. Both can modify the list. Panels are show/hideable. Main index screen manages multiple lists.
- **Auth model**: Local-only for MVP. No accounts needed. Data lives entirely in browser IndexedDB.
- **LLM cost**: BYO API key - users provide their own OpenAI/Anthropic key.
- **Metadata**: AI infers metadata from context rather than fixed schema fields. More magical, less predictable.
- **Platform**: PWA with React/Next.js. Supabase planned for later (auth + cloud sync), not MVP.
- **Tests**: No automated tests for MVP. Agent-executed QA only.
- **Ambition**: Personal project first, but clean architecture for potential open source or sale.

**Research Findings**:
- Vercel AI SDK (`ai` + `@ai-sdk/*`) is the correct abstraction for provider-agnostic LLM integration with tool calling and streaming
- Dexie.js is the best IndexedDB wrapper for React (typed schema, `useLiveQuery` reactive hook)
- `@serwist/next` (successor to next-pwa) handles PWA setup in App Router
- LLM calls must route through Next.js API routes (browser-to-LLM direct calls blocked by CORS)

### Metis Review
**Identified Gaps** (all addressed):
- **CORS architecture**: Browser can't call LLM APIs directly. Resolved: Next.js API routes proxy the calls. App is hosted (Vercel free tier) but all user data stays local in IndexedDB.
- **Chat scope**: Each list gets its own isolated chat. No cross-list operations for MVP.
- **Context strategy**: LLM receives serialized list state + last 20 chat messages per call.
- **Metadata rendering**: Known keys (priority, location) get visual badges. Unknown metadata rendered as plain text.
- **Chat history**: Persists in IndexedDB. Survives page reloads.
- **Provider scope**: OpenAI + Anthropic tested for v1. AI SDK makes adding more trivial.
- **API key UX**: Settings page with provider picker, key input, model select, and test button.
- **Tool call validation**: All LLM tool arguments validated with Zod before touching database. LLM is not trusted.
- **Concurrent mutations**: UI check-off and chat tool calls can race. Use Dexie transactions for atomicity.
- **Mobile-first**: Design for 375-430px viewport. Desktop should not break but is not optimized.

---

## Work Objectives

### Core Objective
Build a PWA where natural language chat is the primary interface for managing structured todo lists, with AI-inferred metadata enabling intelligent queries and suggestions.

### Concrete Deliverables
- `/` - List index page (create, rename, delete lists)
- `/list/[id]` - Split-screen view (todo panel + chat panel)
- `/settings` - API key management, provider/model selection
- `/api/chat` - Streaming LLM endpoint with tool calling
- IndexedDB schema (lists, items, messages, settings)
- PWA manifest + service worker for home screen install
- System prompts for todo management AI behavior

### Definition of Done
- [ ] Can create a list, brain dump tasks via chat, see them appear in todo panel
- [ ] Can say "I did X" and see items checked off in todo panel
- [ ] Can manually check/uncheck items in todo panel
- [ ] Can ask "what's left?" and get an intelligent summary
- [ ] AI infers metadata (priority, location, etc.) visible on items
- [ ] Data persists across page reloads (IndexedDB)
- [ ] Works on mobile viewport (375px+) with installable PWA
- [ ] Supports both OpenAI and Anthropic via BYO key

### Must Have
- Split-screen layout with independently show/hideable panels
- Chat-driven list management (add, complete, update, delete, query)
- Manual list interactions (tap to toggle complete, add item button)
- AI-inferred metadata displayed on items
- Multiple concurrent active lists with index
- BYO API key stored locally
- Provider-agnostic LLM layer (OpenAI + Anthropic)
- Streaming chat responses
- Persistent chat history per list
- PWA manifest for home screen install

### Must NOT Have (Guardrails)
- **No authentication/accounts** - entirely local, no login screens
- **No cloud sync/Supabase** - all data in IndexedDB only
- **No offline mode** - online-only is fine (LLM needs internet)
- **No sub-tasks, recurring tasks, due dates, reminders, or scheduling**
- **No drag-and-drop reordering** - reorder via chat or AI inference
- **No markdown rendering in chat** - plain text for MVP
- **No export/import** functionality
- **No settings beyond API key/provider/model** - no themes, no font sizes
- **No push notifications or background sync**
- **No list sharing, templates, or categories**
- **No message editing, deletion, or regeneration** - append-only chat
- **No over-engineered provider abstraction** - AI SDK already handles this
- **No inline LLM prompts in components** - prompts live in dedicated files

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: NO (skip for MVP)
- **Framework**: None
- **Agent-Executed QA**: ALWAYS - every task verified via Playwright, curl, or terminal

### AI SDK Protocol (CRITICAL - read before Tasks 9-14)

The Vercel AI SDK (`ai` + `@ai-sdk/react`) uses a specific message protocol. All tasks MUST follow this:

**Message format**: `useChat` (from `@ai-sdk/react`) returns `UIMessage[]`. Each `UIMessage` has:
- `id`: unique string
- `role`: 'user' | 'assistant'
- `content`: text content (may be empty if message is tool-calls only)
- `parts`: array of typed parts (`TextPart`, `ToolCallPart`, `ToolResultPart`, etc.)

**Server route**: The API route (Task 9) MUST use `toUIMessageStreamResponse()` (not the older `toDataStreamResponse()`). Check the current AI SDK docs at `https://sdk.vercel.ai/docs/getting-started/nextjs-app-router` for the exact import.

**Persistence adapter** (Task 11):
- **Save**: When `useChat.onFinish` fires, serialize the `UIMessage` to Dexie: store `id`, `role`, `content`, and `JSON.stringify(message.parts)` as the `parts` field.
- **Load**: On page mount, read messages from Dexie, parse the `parts` JSON, reconstruct `UIMessage[]`, and pass as `initialMessages` to `useChat`.
- **Tool results**: Use `useChat`'s `addToolResult()` callback (not a custom mechanism) to feed tool execution results back to the model. The AI SDK handles the round-trip automatically.

**Tool calling flow** (Tasks 13, 14):
1. LLM responds with tool-call parts in the stream
2. `useChat`'s `onToolCall` callback fires client-side
3. Client calls `executeToolCall()` from Task 13's executor
4. Client calls `addToolResult()` to feed the result back
5. If `maxSteps` > 1, the model automatically continues with a text response

**IMPORTANT**: The AI SDK evolves frequently. Before implementing Tasks 9-14, the executor MUST check the current docs at `https://sdk.vercel.ai/docs` and verify the exact API signatures, import paths, and message types. The plan describes the intended flow; the executor must map it to the current SDK version.

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot at 390px viewport
- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Data Layer**: Use Playwright - Verify persistence by reloading and checking state
- **Node scripts**: Use `npx tsx` with `import 'fake-indexeddb/auto'` for Dexie operations outside the browser

### QA Prerequisites: API Key Provisioning

Tasks 6, 9, 11, 14, and F3 require a real LLM API key to verify integration. The executing agent MUST obtain a key automatically - no human intervention.

**Automated key retrieval** (agent executes before first QA that needs a key):
1. Use the `infisical` skill to read the API key: `infisical run -- printenv OPENAI_API_KEY` (or equivalent command from the skill)
2. If Infisical is unavailable, use the `aws-secrets` skill to read from Secrets Manager
3. Configure the key in the running app by navigating to `/settings` via Playwright and entering the key

**Fallback for tasks that only need response shape validation** (Tasks 9 malformed request scenario, Task 6 invalid key scenario):
- These can use a dummy key (e.g., `sk-test-invalid`) since they test error handling, not successful LLM calls

**Which tasks need a real key**:
- Task 6 QA "Invalid API key shows error": NO - uses intentionally invalid key
- Task 9 QA "API route streams a response": YES - needs real key
- Task 9 QA "Invalid API key returns 401": NO - uses invalid key
- Task 11 QA "Send a message and receive a streaming response": YES - needs real key
- Task 14 QA (all scenarios): YES - needs real key for tool calling
- F3 final QA: YES - needs real key for end-to-end

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Bootstrap - must complete first, everything depends on scaffold):
└── Task 1: Next.js project scaffold + Tailwind + config [quick]

Wave 2 (Foundation - after Task 1, all parallel):
├── Task 2: Dexie.js database schema + data access hooks (depends: 1) [unspecified-high]
├── Task 3: PWA manifest + service worker setup (depends: 1) [quick]
├── Task 4: LLM tool schemas - Zod definitions (depends: 1) [quick]
├── Task 5: System prompt engineering (depends: 1) [artistry]

Wave 3 (Pages & core modules - after Wave 2):
├── Task 6: Settings page + test-connection endpoint (depends: 1, 2) [visual-engineering]
├── Task 7: List index page - CRUD, navigation (depends: 1, 2) [visual-engineering]
├── Task 8: Split-screen layout component (depends: 1) [visual-engineering]
├── Task 9: LLM API route + streaming (depends: 1, 4, 5) [unspecified-high]
├── Task 10: Chat UI components - messages, input, streaming (depends: 1) [visual-engineering]

Wave 4 (Feature integration - after Wave 3):
├── Task 11: Chat interface - wire useChat + message persistence (depends: 2, 8, 9, 10) [deep]
├── Task 12: Todo list panel - items, toggle, metadata badges (depends: 2, 8) [visual-engineering]
├── Task 13: Tool execution engine - validate + mutate Dexie (depends: 2, 4, 9) [deep]

Wave 5 (Final integration + polish - after Wave 4):
├── Task 14: Cross-panel integration + reactive state (depends: 11, 12, 13) [deep]
├── Task 15: Polish - empty states, errors, onboarding, mobile UX (depends: 14) [visual-engineering]

Wave FINAL (After ALL tasks - 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 -> Task 5 -> Task 9 -> Task 11 -> Task 14 -> Task 15 -> F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2,3,4,5,6,7,8,9,10 | 1 |
| 2 | 1 | 6,7,11,12,13 | 2 |
| 3 | 1 | - | 2 |
| 4 | 1 | 9,13 | 2 |
| 5 | 1 | 9 | 2 |
| 6 | 1,2 | - | 3 |
| 7 | 1,2 | - | 3 |
| 8 | 1 | 11,12 | 3 |
| 9 | 1,4,5 | 11,13 | 3 |
| 10 | 1 | 11 | 3 |
| 11 | 2,8,9,10 | 14 | 4 |
| 12 | 2,8 | 14 | 4 |
| 13 | 2,4,9 | 14 | 4 |
| 14 | 11,12,13 | 15 | 5 |
| 15 | 14 | F1-F4 | 5 |

### Agent Dispatch Summary

- **Wave 1**: **1 task** - T1 `quick` (bootstrap)
- **Wave 2**: **4 tasks** - T2 `unspecified-high`, T3 `quick`, T4 `quick`, T5 `artistry`
- **Wave 3**: **5 tasks** - T6 `visual-engineering`, T7 `visual-engineering`, T8 `visual-engineering`, T9 `unspecified-high`, T10 `visual-engineering`
- **Wave 4**: **3 tasks** - T11 `deep`, T12 `visual-engineering`, T13 `deep`
- **Wave 5**: **2 tasks** - T14 `deep`, T15 `visual-engineering`
- **FINAL**: **4 tasks** - F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

> Implementation tasks below. Each includes agent profile, parallelization info, references, and QA scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Project Scaffold - Next.js + TypeScript + Tailwind

  **What to do**:
  - Initialize Next.js 14+ project with App Router and TypeScript (strict mode)
  - Install and configure Tailwind CSS with a mobile-first config
  - Set up ESLint with Next.js recommended config
  - Create the app shell layout (`app/layout.tsx`) with basic metadata, viewport settings for mobile, and a sans-serif font stack
  - Create route stubs: `app/page.tsx` (list index), `app/list/[id]/page.tsx` (list view), `app/settings/page.tsx` (settings)
  - Create the directory structure: `src/lib/`, `src/components/`, `src/lib/db/`, `src/lib/llm/`
  - Add `.env.example` with no secrets (just comments explaining BYO key is stored client-side)
  - Install core dependencies: `dexie`, `dexie-react-hooks`, `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `zod`
  - Install dev dependencies: `fake-indexeddb` (Node IndexedDB shim for QA scripts), `tsx` (TypeScript execution for QA scripts)
  - Initialize git repo with a `.gitignore` for Next.js

  **Must NOT do**:
  - Do NOT set up authentication or any login flow
  - Do NOT add theme switching or dark mode (use system default)
  - Do NOT over-customize Tailwind - use defaults with minor mobile-focused tweaks
  - Do NOT install UI component libraries (shadcn, MUI, etc.) - use Tailwind utilities directly

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard project scaffolding with well-known tools. No complex logic.
  - **Skills**: []
    - No specialized skills needed for project init
  - **Skills Evaluated but Omitted**:
    - `git-worktrees`: Not applicable - this is the initial repo creation

  **Parallelization**:
  - **Can Run In Parallel**: NO (bootstrap - must complete first)
  - **Parallel Group**: Wave 1 (solo - everything depends on this)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10 (all subsequent tasks need scaffold, packages, and route stubs)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Next.js App Router docs: `https://nextjs.org/docs/app` - App Router file conventions, layout.tsx pattern
  - Tailwind CSS with Next.js: `https://tailwindcss.com/docs/guides/nextjs` - PostCSS setup for App Router
  - Vercel AI SDK: `https://sdk.vercel.ai/docs/getting-started` - Package names and peer deps to install

  **WHY Each Reference Matters**:
  - Next.js docs: Ensures App Router conventions (not Pages Router) are followed for layout, routing, and API routes
  - Tailwind docs: Correct PostCSS config for Next.js 14+ (setup has changed recently)
  - AI SDK docs: Need to install the right combination of packages (`ai` core + provider packages)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run `npm run dev` in background, wait 10 seconds
      2. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
      3. Assert status code is 200
      4. Run `curl -s http://localhost:3000` and check HTML contains the app shell
    Expected Result: 200 status, HTML response with root layout
    Failure Indicators: Non-200 status, build errors in terminal, blank page
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: TypeScript strict mode compiles cleanly
    Tool: Bash
    Preconditions: Project scaffolded
    Steps:
      1. Run `npx tsc --noEmit`
      2. Assert exit code 0
      3. Check tsconfig.json has `"strict": true`
    Expected Result: Zero type errors, strict mode enabled
    Failure Indicators: Type errors, strict not enabled
    Evidence: .sisyphus/evidence/task-1-typescript-check.txt

  Scenario: Route stubs are accessible
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` -> 200
      2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/settings` -> 200
      3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/list/test-id` -> 200
    Expected Result: All three routes return 200
    Failure Indicators: 404 on any route
    Evidence: .sisyphus/evidence/task-1-routes.txt
  ```

  **Commit**: YES
  - Message: `init: scaffold Next.js app with TypeScript and Tailwind`
  - Files: `package.json, tsconfig.json, tailwind.config.ts, app/layout.tsx, app/page.tsx, app/list/[id]/page.tsx, app/settings/page.tsx, src/lib/, src/components/`
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. Database Layer - Dexie.js Schema + Data Access Hooks

  **What to do**:
  - Create Dexie database class in `src/lib/db/index.ts` with typed schema
  - Define tables:
    - `lists`: `{ id: string, name: string, goal?: string, createdAt: Date, updatedAt: Date }`
    - `items`: `{ id: string, listId: string, text: string, completed: boolean, completedAt?: Date, metadata: Record<string, unknown>, createdAt: Date, updatedAt: Date, order: number }`
    - `messages`: `{ id: string, listId: string, role: 'user' | 'assistant', content: string, parts?: string, createdAt: Date }` - the `parts` field stores JSON-serialized AI SDK `UIMessage.parts` array (text parts, tool-call parts, tool-result parts). This preserves the full message structure for hydration back into `useChat`.
    - `settings`: `{ id: string, provider: string, apiKey: string, model: string }`
  - Define Dexie indexes: `items` indexed by `listId`, `messages` indexed by `listId`, `settings` by `id`
  - Create TypeScript interfaces in `src/lib/db/types.ts` matching the schema
  - Create data access hooks in `src/lib/db/hooks.ts`:
    - `useLists()` - all lists, sorted by updatedAt desc
    - `useList(id)` - single list by ID
    - `useItems(listId)` - all items for a list, sorted by order
    - `useMessages(listId, limit?)` - messages for a list, newest last, optional limit
    - `useSettings()` - singleton settings record
  - Create mutation functions in `src/lib/db/mutations.ts`:
    - `createList(name, goal?)`, `updateList(id, fields)`, `deleteList(id)` (cascades items + messages)
    - `addItems(listId, items[])`, `completeItems(ids[])`, `uncompleteItems(ids[])`, `updateItem(id, fields)`, `deleteItems(ids[])`
    - `addMessage(listId, role, content, toolInvocations?)`,
    - `saveSettings(settings)`
  - Use `crypto.randomUUID()` for ID generation
  - All mutations should update `updatedAt` on the parent list

  **Must NOT do**:
  - Do NOT add cloud sync, remote database connections, or Supabase
  - Do NOT add migration scripts beyond Dexie's built-in versioning
  - Do NOT add caching layers - Dexie + useLiveQuery handles reactivity
  - Do NOT put business logic in the data layer - pure CRUD only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core data layer with multiple tables, typed hooks, and cascade logic. Moderate complexity.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 11, 12, 13
  - **Blocked By**: Task 1 (needs package.json, tsconfig, directory structure)

  **References**:

  **External References**:
  - Dexie.js getting started: `https://dexie.org/docs/Tutorial/Getting-started` - Schema definition syntax
  - Dexie React hooks: `https://dexie.org/docs/dexie-react-hooks/useLiveQuery()` - Reactive query pattern
  - Dexie TypeScript: `https://dexie.org/docs/Typescript` - Typed table definitions

  **WHY Each Reference Matters**:
  - Getting started: Dexie's schema string syntax (e.g., `"++id, listId"`) is unique and easy to get wrong
  - React hooks: `useLiveQuery` is the key to reactive UI - auto-updates when DB changes
  - TypeScript: Dexie's generic table typing pattern (`Table<Item, string>`) needs specific setup

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Database tables are created and writable
    Tool: Bash
    Preconditions: Project scaffolded (Task 1 complete), packages installed including fake-indexeddb
    Steps:
      1. Create a test script at `scripts/test-db.ts` that:
         - Imports `fake-indexeddb/auto` at the top (provides IndexedDB in Node)
         - Imports db from src/lib/db/index
         - Imports mutations from src/lib/db/mutations
         - Calls createList('Test List')
         - Queries db.lists.toArray() and asserts length === 1
         - Asserts the returned list has name 'Test List'
         - Cleans up by deleting the list
      2. Run `npx tsx scripts/test-db.ts`
      3. Assert exit code 0
    Expected Result: Script runs, creates and reads from lists table, exits cleanly
    Failure Indicators: Dexie error, assertion failure, import error
    Evidence: .sisyphus/evidence/task-2-db-tables.txt

  Scenario: Cascade delete removes items and messages
    Tool: Bash
    Preconditions: Project scaffolded, db module created, fake-indexeddb available
    Steps:
      1. Create/extend test script (with `import 'fake-indexeddb/auto'` at top) that:
         - Creates a list with id 'cascade-test'
         - Adds 2 items with listId 'cascade-test' via addItems()
         - Adds 1 message with listId 'cascade-test' via addMessage()
         - Calls deleteList('cascade-test')
         - Queries items where listId === 'cascade-test' -> asserts empty array
         - Queries messages where listId === 'cascade-test' -> asserts empty array
      2. Run `npx tsx scripts/test-db.ts`
      3. Assert exit code 0
    Expected Result: Deleting a list removes its items and messages
    Failure Indicators: Orphaned items or messages remain, assertion failure
    Evidence: .sisyphus/evidence/task-2-cascade-delete.txt

  Scenario: TypeScript types compile cleanly
    Tool: Bash
    Preconditions: Project compiled
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify types.ts exports List, Item, Message, Settings interfaces
      3. Verify mutations.ts parameter types match schema
    Expected Result: Clean type check, all interfaces exported
    Failure Indicators: Type errors or missing exports
    Evidence: .sisyphus/evidence/task-2-types.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add Dexie.js database schema and data access hooks`
  - Files: `src/lib/db/index.ts, src/lib/db/types.ts, src/lib/db/hooks.ts, src/lib/db/mutations.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 3. PWA Manifest + Service Worker Setup

  **What to do**:
  - Install `@serwist/next` and configure in `next.config.ts`
  - Create `manifest.json` in `public/` with:
    - `name`: "AI Todo List"
    - `short_name`: "AI Todos"
    - `start_url`: "/"
    - `display`: "standalone"
    - `theme_color` and `background_color`: pick a clean neutral (e.g., white/#ffffff)
    - `icons`: Generate placeholder icons at 192x192 and 512x512 (simple colored square with "T" is fine for MVP)
  - Configure service worker via Serwist for basic app shell caching (precache the built assets)
  - Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` to layout
  - Add `<meta name="apple-mobile-web-app-capable" content="yes">` and related iOS meta tags
  - Add `<link rel="manifest" href="/manifest.json">` to layout head

  **Must NOT do**:
  - Do NOT add push notification support
  - Do NOT add background sync
  - Do NOT add complex caching strategies (runtime caching for API calls, etc.)
  - Do NOT add splash screens or elaborate launch assets

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Boilerplate PWA config. Follow the @serwist/next docs step by step.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
  - **Blocks**: None (PWA is standalone, other tasks don't depend on it)
  - **Blocked By**: Task 1 (needs next.config.ts, app/layout.tsx, public/ directory)

  **References**:

  **External References**:
  - Serwist Next.js integration: `https://serwist.pages.dev/docs/next/getting-started` - Setup guide for App Router
  - Web app manifest spec: `https://developer.mozilla.org/en-US/docs/Web/Manifest` - Field reference
  - Apple PWA meta tags: `https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html` - iOS-specific tags

  **WHY Each Reference Matters**:
  - Serwist docs: The API has changed from next-pwa. Must follow current Serwist patterns, not legacy next-pwa.
  - MDN manifest: Ensure required fields are present for installability
  - Apple meta tags: iOS Safari needs extra meta tags beyond the manifest for "Add to Home Screen"

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Manifest is served and valid
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. `curl -s http://localhost:3000/manifest.json | python3 -m json.tool`
      2. Assert JSON contains "name", "short_name", "start_url", "display", "icons"
      3. Assert "display" is "standalone"
      4. Assert "icons" array has at least 2 entries (192 and 512)
    Expected Result: Valid JSON manifest with required PWA fields
    Failure Indicators: 404, invalid JSON, missing fields
    Evidence: .sisyphus/evidence/task-3-manifest.txt

  Scenario: Service worker registers on page load
    Tool: Playwright
    Preconditions: Production build (`npm run build && npm start`)
    Steps:
      1. Navigate to http://localhost:3000
      2. Execute in console: `const reg = await navigator.serviceWorker.getRegistration(); console.log(reg ? 'registered' : 'none');`
      3. Assert output is 'registered'
    Expected Result: Service worker is registered after page load
    Failure Indicators: 'none' output, console errors about SW
    Evidence: .sisyphus/evidence/task-3-service-worker.png
  ```

  **Commit**: YES
  - Message: `feat(pwa): add manifest and service worker setup`
  - Files: `public/manifest.json, public/icons/*, next.config.ts (updated), app/layout.tsx (meta tags)`
  - Pre-commit: `npm run build`

- [x] 4. LLM Tool Schemas - Zod Definitions for All 6 Tools

  **What to do**:
  - Create `src/lib/llm/tools.ts` defining Zod schemas and tool declarations for:
    1. `addItems` - Parameters: `{ items: Array<{ text: string, metadata?: Record<string, unknown> }> }` - Adds one or more items to the current list
    2. `completeItems` - Parameters: `{ itemIds: string[] }` - Marks items as completed by ID
    3. `uncompleteItems` - Parameters: `{ itemIds: string[] }` - Reverts items to incomplete
    4. `updateItem` - Parameters: `{ itemId: string, text?: string, metadata?: Record<string, unknown> }` - Updates item text or metadata
    5. `deleteItems` - Parameters: `{ itemIds: string[] }` - Removes items from the list
    6. `addAndCompleteItems` - Parameters: `{ items: Array<{ text: string, metadata?: Record<string, unknown> }> }` - Adds items already marked as done (the "I already did X" pattern)
  - Each tool should have a clear `description` field that tells the LLM when to use it
  - Use Vercel AI SDK's `tool()` function with Zod schemas for type-safe definitions
  - Export all tools as a `todoTools` object for use in the API route
  - Do NOT include execution logic here - just schema definitions and descriptions

  **Must NOT do**:
  - Do NOT add tool execution logic (that's Task 13)
  - Do NOT add tools beyond these 6 (no scheduling, no reminders, no sharing)
  - Do NOT hard-code list IDs in tool schemas - the list context comes from the API route

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward Zod schema definitions following AI SDK patterns.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
  - **Blocks**: Tasks 9, 13
  - **Blocked By**: Task 1 (needs ai, @ai-sdk/*, zod packages installed)

  **References**:

  **External References**:
  - Vercel AI SDK tool calling: `https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling` - `tool()` function API
  - Vercel AI SDK with Zod: `https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#schemas` - Zod schema integration
  - Zod docs: `https://zod.dev/?id=basic-usage` - Schema definition syntax

  **WHY Each Reference Matters**:
  - AI SDK tool calling: The `tool()` function signature and how `description` fields guide LLM behavior
  - Zod integration: How Zod schemas map to JSON Schema for the LLM's function-calling interface
  - Zod docs: Syntax for arrays, optional fields, records, and string constraints

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All 6 tools are defined and export cleanly
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify `src/lib/llm/tools.ts` exports a `todoTools` object
      3. Verify todoTools has exactly 6 keys: addItems, completeItems, uncompleteItems, updateItem, deleteItems, addAndCompleteItems
    Expected Result: Clean compile, 6 tool definitions exported
    Failure Indicators: Type errors, missing tools, wrong export name
    Evidence: .sisyphus/evidence/task-4-tools-compile.txt

  Scenario: Tool schemas validate correct input
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Write a small script that imports tools and runs Zod .parse() on valid inputs:
         - addItems: `{ items: [{ text: "Buy milk" }] }` -> should pass
         - completeItems: `{ itemIds: ["abc"] }` -> should pass
         - addAndCompleteItems: `{ items: [{ text: "Already did this", metadata: { effort: "low" } }] }` -> should pass
      2. Run Zod .parse() on invalid inputs:
         - addItems with empty object `{}` -> should throw ZodError
         - completeItems with `{ itemIds: "not-array" }` -> should throw ZodError
    Expected Result: Valid inputs pass, invalid inputs throw ZodError
    Failure Indicators: Valid inputs rejected, invalid inputs accepted
    Evidence: .sisyphus/evidence/task-4-tools-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(llm): add tool schemas with Zod validation`
  - Files: `src/lib/llm/tools.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 5. System Prompt Engineering - Todo Management AI Behavior

  **What to do**:
  - Create `src/lib/llm/prompts.ts` with functions that generate system prompts
  - Main function: `buildSystemPrompt(list: { name: string; goal?: string }, items: { id: string; text: string; completed: boolean; metadata: Record<string, unknown> }[])` - returns the full system prompt string. Use inline parameter types (not imported from db/types.ts) so this task has no dependency on Task 2. The integration task (14) will connect these with Dexie types.
  - The system prompt must instruct the AI to:
    1. **Role**: You are a todo list assistant. Your job is to help manage this todo list through conversation.
    2. **List context**: Serialize the list name, goal, and all items (with IDs, text, completion status, metadata) into the prompt so the AI knows the current state
    3. **Brain dump parsing**: When user describes tasks, extract individual items and call `addItems` with inferred metadata. Infer priority (high/medium/low), location (if mentioned), effort (quick/medium/long), skipability (must-do/nice-to-have/optional), and any other relevant context.
    4. **Completion matching**: When user says they did something, fuzzy-match against existing items and call `completeItems`. If the mentioned task isn't on the list, call `addAndCompleteItems`.
    5. **Querying**: When user asks "what's left" or "what should I do next", analyze items by metadata to give intelligent ordering (e.g., group by location for errands, prioritize by importance).
    6. **Follow-ups**: When input is ambiguous, ASK the user for clarification before acting. Don't guess.
    7. **Tone**: Conversational, helpful, concise. Not overly formal.
  - Include explicit instructions about when to use each tool
  - Include examples of good behavior in the prompt (few-shot)
  - Create a helper `serializeListState(list, items)` that formats list state for prompt injection
  - The prompt should handle edge cases: empty list, all items completed, single item, very large list

  **Must NOT do**:
  - Do NOT hard-code provider-specific prompt patterns (must work with both OpenAI and Anthropic)
  - Do NOT include chat history management in the prompt - that's handled by the API route
  - Do NOT add scheduling/reminder/date awareness to the prompt
  - Do NOT make the prompt excessively long - aim for under 1500 tokens of system prompt

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: This is the core product differentiator. The prompt quality directly determines how "magical" the app feels. Needs creative, nuanced language design - not just code.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None relevant - this is pure prompt engineering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
  - **Blocks**: Task 9 (API route needs the prompt)
  - **Blocked By**: Task 1 (needs TypeScript config and project structure)

  **References**:

  **External References**:
  - Anthropic prompt engineering: `https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering` - Best practices for structured prompts
  - OpenAI function calling guide: `https://platform.openai.com/docs/guides/function-calling` - How system prompts interact with tool definitions
  - Vercel AI SDK tool calling: `https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling` - How tools and prompts work together

  **WHY Each Reference Matters**:
  - Anthropic guide: Techniques for clear role assignment, structured output, and few-shot examples in system prompts
  - OpenAI guide: How the system prompt's tool descriptions affect when the model chooses to call tools vs respond with text
  - AI SDK docs: How the prompt integrates with the `streamText()` call and tool definitions

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: System prompt generates with list context
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Write a script that imports buildSystemPrompt and calls it with:
         - List: { id: '1', name: 'Weekend Errands', goal: 'Get everything done by Sunday' }
         - Items: [{ id: 'a', text: 'Buy groceries', completed: false, metadata: { location: 'Publix', priority: 'high' } }, { id: 'b', text: 'Return package', completed: true, metadata: {} }]
      2. Assert the output string contains "Weekend Errands"
      3. Assert the output string contains "Buy groceries" with its metadata
      4. Assert the output string contains "Return package" marked as completed
      5. Assert the prompt is under 2000 tokens (rough check: under 8000 characters)
    Expected Result: System prompt includes list name, all items with metadata, completion states
    Failure Indicators: Missing list context, missing items, excessively long prompt
    Evidence: .sisyphus/evidence/task-5-prompt-generation.txt

  Scenario: Empty list prompt handles gracefully
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Call buildSystemPrompt with empty list (no items)
      2. Assert prompt still includes the list name and goal
      3. Assert prompt includes language guiding the AI to help the user add items
    Expected Result: Prompt handles empty state with helpful framing
    Failure Indicators: Error, missing list info, no empty-state guidance
    Evidence: .sisyphus/evidence/task-5-empty-prompt.txt
  ```

  **Commit**: YES
  - Message: `feat(llm): add system prompts for todo management`
  - Files: `src/lib/llm/prompts.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 6. Settings Page - API Key / Provider / Model Management

  **What to do**:
  - Build `app/settings/page.tsx` as a clean mobile-friendly form
  - Provider selector: dropdown with "OpenAI" and "Anthropic" options
  - API key input: password-type field with show/hide toggle. Stored in Dexie settings table.
  - Model selector: dropdown that changes options based on provider:
    - OpenAI: gpt-4o, gpt-4o-mini
    - Anthropic: claude-sonnet-4-20250514, claude-haiku-4-20250414 (verify current model IDs from https://docs.anthropic.com/en/docs/about-claude/models before implementation)
  - "Test Connection" button: makes a minimal LLM call (e.g., "Say hello") to validate key works. Shows success/error feedback. This requires creating a dedicated `app/api/test-connection/route.ts` API route as part of this task. The route accepts `{ provider, apiKey, model }`, makes a simple one-shot `generateText()` call with the AI SDK, and returns success/failure. This is separate from Task 9's chat endpoint.
  - Save button persists to Dexie. Auto-save on change is also acceptable.
  - Show clear status: "Settings saved" / "Invalid API key" / "Connection successful"
  - Back button/link to return to list index
  - Settings should load existing values from Dexie on mount

  **Must NOT do**:
  - Do NOT add theme/appearance settings
  - Do NOT add notification settings
  - Do NOT encrypt the API key in IndexedDB (acceptable for MVP, known limitation)
  - Do NOT add multiple API key management (one key per provider max)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UI with provider-dependent dropdowns and connection testing. Needs polished mobile form UX.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed during implementation, only QA

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 9, 10)
  - **Blocks**: None (other tasks can use hardcoded settings for testing)
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/lib/db/hooks.ts:useSettings()` - Hook to read current settings
  - `src/lib/db/mutations.ts:saveSettings()` - Mutation to persist settings

  **External References**:
  - Vercel AI SDK providers: `https://sdk.vercel.ai/providers` - Available provider packages and model IDs

  **WHY Each Reference Matters**:
  - DB hooks/mutations: Settings page reads and writes to the same Dexie schema defined in Task 2
  - AI SDK providers: Correct model ID strings for each provider's dropdown options

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Settings form renders and saves
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport
    Steps:
      1. Navigate to http://localhost:3000/settings
      2. Select "OpenAI" from provider dropdown
      3. Type "sk-test-key-12345" into API key input
      4. Select "gpt-4o-mini" from model dropdown
      5. Click save / wait for auto-save
      6. Reload the page
      7. Assert provider dropdown shows "OpenAI"
      8. Assert model dropdown shows "gpt-4o-mini"
      9. Assert API key field is populated (masked)
    Expected Result: Settings persist across page reloads
    Failure Indicators: Fields empty after reload, wrong values
    Evidence: .sisyphus/evidence/task-6-settings-persist.png

  Scenario: Invalid API key shows error
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport
    Steps:
      1. Navigate to settings, select OpenAI, enter "invalid-key"
      2. Click "Test Connection"
      3. Assert error message appears (e.g., "Invalid API key" or "Authentication failed")
      4. Assert the error is visually distinct (red text or error styling)
    Expected Result: Clear error feedback for invalid key
    Failure Indicators: Silent failure, no feedback, unhandled error
    Evidence: .sisyphus/evidence/task-6-invalid-key.png

  Scenario: Provider switch updates model options
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Select "OpenAI" -> assert model options include "gpt-4o" and "gpt-4o-mini"
      2. Switch to "Anthropic" -> assert model options include "claude-sonnet-4-20250514"
      3. Assert previous OpenAI models are NOT in the Anthropic dropdown
    Expected Result: Model dropdown reflects selected provider
    Failure Indicators: Wrong models shown, models from other provider
    Evidence: .sisyphus/evidence/task-6-provider-switch.png
  ```

  **Commit**: YES
  - Message: `feat(settings): add API key and provider management page`
  - Files: `app/settings/page.tsx, app/api/test-connection/route.ts, src/components/settings/*`
  - Pre-commit: `npx tsc --noEmit`

- [x] 7. List Index Page - CRUD + Navigation

  **What to do**:
  - Build `app/page.tsx` as the home/index page showing all lists
  - Display lists as cards/rows with: list name, item count (total / completed), last updated time
  - "New List" button: opens a simple inline form or modal to enter list name and optional goal
  - Each list card: tap navigates to `/list/[id]`
  - Each list card: has a kebab/options menu with "Rename" and "Delete" actions
  - Delete should show a confirmation dialog before removing
  - Rename should allow inline editing or a modal
  - Empty state when no lists exist: friendly message + prominent "Create your first list" CTA
  - Sort lists by most recently updated (updatedAt desc)
  - Header with app name ("AI Todo List" or similar) and a gear icon linking to `/settings`
  - Use `useLists()` hook from Task 2 for reactive data

  **Must NOT do**:
  - Do NOT add list categories, tags, or search
  - Do NOT add list templates or duplication
  - Do NOT add drag-and-drop reordering of lists
  - Do NOT add list sharing or collaboration features

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Index page with card layout, empty states, and mobile-optimized touch targets. UI-heavy task.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/lib/db/hooks.ts:useLists()` - Reactive hook for all lists
  - `src/lib/db/mutations.ts:createList(), updateList(), deleteList()` - CRUD mutations

  **WHY Each Reference Matters**:
  - DB hooks: The index page is purely a view over the lists table - useLists() drives the display
  - Mutations: Create/rename/delete map directly to these functions

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create a new list and see it appear
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, no existing lists
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert empty state message is visible
      3. Click "New List" or "Create your first list" button
      4. Enter "Weekend Errands" as list name
      5. Submit the form
      6. Assert a card/row with "Weekend Errands" appears on the index
      7. Assert item count shows "0 items" or similar
    Expected Result: New list created and visible on index
    Failure Indicators: List not appearing, form not submitting, error
    Evidence: .sisyphus/evidence/task-7-create-list.png

  Scenario: Delete a list with confirmation
    Tool: Playwright
    Preconditions: At least one list exists
    Steps:
      1. Navigate to index
      2. Click options menu on the list card
      3. Click "Delete"
      4. Assert confirmation dialog appears
      5. Confirm deletion
      6. Assert the list is removed from the index
      7. Reload page and assert it's still gone (persisted)
    Expected Result: List deleted after confirmation, removal persists
    Failure Indicators: No confirmation, list still visible, reappears on reload
    Evidence: .sisyphus/evidence/task-7-delete-list.png

  Scenario: Navigate to list view
    Tool: Playwright
    Preconditions: At least one list exists
    Steps:
      1. Click on a list card
      2. Assert URL changes to /list/[id]
      3. Assert the list view page loads (even if empty/placeholder)
    Expected Result: Tapping a list navigates to its detail view
    Failure Indicators: 404, no navigation, wrong URL
    Evidence: .sisyphus/evidence/task-7-navigate.png
  ```

  **Commit**: YES
  - Message: `feat(lists): add list index page with CRUD`
  - Files: `app/page.tsx, src/components/lists/*`
  - Pre-commit: `npx tsc --noEmit`

- [x] 8. Split-Screen Layout Component - Collapsible Dual Panels

  **What to do**:
  - Create `src/components/SplitScreen.tsx` - a layout component used by `app/list/[id]/page.tsx`
  - Two vertically stacked panels: **top = todo list**, **bottom = chat**
  - Default split: roughly 50/50, or a sensible ratio for mobile (e.g., 40% list / 60% chat)
  - Each panel has a collapse/expand toggle (small button or drag handle at the divider):
    - Collapse list panel: chat goes full-height
    - Collapse chat panel: list goes full-height
    - Both visible: split view
  - The layout must handle the mobile keyboard properly: when the chat input is focused and the keyboard opens, the chat input should remain visible (not pushed off-screen by the keyboard). Use `visualViewport` API or CSS `dvh` units.
  - Header bar at top with: back arrow (to index), list name (centered), settings gear icon
  - The panels accept children (React `children` or render props) - no actual list/chat content in this task
  - Smooth transitions when panels collapse/expand (CSS transitions)
  - Use CSS Grid or Flexbox for the layout, NOT fixed pixel heights

  **Must NOT do**:
  - Do NOT implement the todo list content (that's Task 12)
  - Do NOT implement the chat content (that's Task 11)
  - Do NOT add drag-to-resize between panels (collapse/expand only)
  - Do NOT add horizontal split or side-by-side layout (vertical stack for mobile only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Core layout challenge - mobile viewport management, keyboard handling, smooth animations. Pure CSS/UI engineering.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7, 9, 10)
  - **Blocks**: Tasks 11, 12
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - CSS `dvh` units: `https://developer.mozilla.org/en-US/docs/Web/CSS/length#dynamic_viewport_units` - Dynamic viewport height for mobile keyboards
  - Visual Viewport API: `https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API` - Detecting keyboard open/close

  **WHY Each Reference Matters**:
  - `dvh` units: Standard `vh` doesn't account for mobile browser chrome and keyboard. `dvh` does. Critical for the chat input staying visible.
  - Visual Viewport: Fallback/complementary approach to detect when the virtual keyboard is covering content

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Split-screen renders with both panels on mobile
    Tool: Playwright
    Preconditions: Dev server running, 390px x 844px viewport (iPhone 14 size). The route stub at /list/test-id exists from Task 1. This task updates that page to use the SplitScreen component with placeholder content (e.g., "Todo panel" and "Chat panel" text) so the layout can be tested.
    Steps:
      1. Navigate to /list/test-id (using the updated route stub with SplitScreen layout)
      2. Assert two panel regions are visible (top and bottom)
      3. Assert header bar shows at the top with back arrow and list name
      4. Assert both panels have non-zero height
      5. Take screenshot
    Expected Result: Two-panel split layout visible on mobile viewport
    Failure Indicators: Panels overlapping, one panel invisible, scrolled off-screen
    Evidence: .sisyphus/evidence/task-8-split-screen.png

  Scenario: Collapse list panel - chat goes full height
    Tool: Playwright
    Preconditions: Split-screen visible
    Steps:
      1. Click the list panel's collapse toggle
      2. Wait for transition (500ms)
      3. Assert list panel height is 0 or hidden
      4. Assert chat panel fills remaining viewport height
      5. Take screenshot
    Expected Result: Chat panel expands to fill space when list collapses
    Failure Indicators: Both panels collapse, layout breaks, no transition
    Evidence: .sisyphus/evidence/task-8-collapse-list.png

  Scenario: Collapse chat panel - list goes full height
    Tool: Playwright
    Preconditions: Split-screen visible
    Steps:
      1. Click the chat panel's collapse toggle
      2. Wait for transition (500ms)
      3. Assert chat panel is hidden
      4. Assert list panel fills remaining viewport height
    Expected Result: List panel expands when chat collapses
    Failure Indicators: Layout breaks, panels overlap
    Evidence: .sisyphus/evidence/task-8-collapse-chat.png
  ```

  **Commit**: YES
  - Message: `feat(layout): add split-screen collapsible panel layout`
  - Files: `src/components/SplitScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 9. LLM API Route + Streaming - Chat Endpoint with Tool Calling

  **What to do**:
  - Create `app/api/chat/route.ts` as a Next.js API route (App Router POST handler)
  - Accept request body: `{ messages: Message[], listState: { list: List, items: Item[] }, settings: { provider: string, apiKey: string, model: string } }`
  - Use Vercel AI SDK's `streamText()` to call the LLM:
    - Build system prompt using `buildSystemPrompt(list, items)` from Task 5
    - Register tools from `todoTools` from Task 4
    - Select provider based on `settings.provider`:
      - `"openai"` -> `createOpenAI({ apiKey: settings.apiKey })`
      - `"anthropic"` -> `createAnthropic({ apiKey: settings.apiKey })`
    - Use `settings.model` as the model ID
    - Stream the response back using AI SDK's `toUIMessageStreamResponse()` (see AI SDK Protocol section for details - verify exact method name against current docs)
  - The API key is sent per-request from the client (not stored server-side)
  - Handle errors gracefully:
    - Invalid/missing API key: return 401 with clear message
    - Provider error (rate limit, model not available): return appropriate status with message
    - Malformed request: return 400
  - Set `maxTokens` to a reasonable limit (e.g., 2048 for responses)
  - Enable `maxSteps` for multi-tool-call responses (the AI might need to call multiple tools in one turn)

  **Must NOT do**:
  - Do NOT execute tool calls server-side - return tool call results to the client (Task 13 handles execution)
  - Do NOT store messages server-side - the client sends full message history each request
  - Do NOT add rate limiting or usage tracking
  - Do NOT add request caching
  - Do NOT log API keys (not even to server console)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core LLM integration with provider switching, streaming, error handling. Needs AI SDK expertise.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7, 8, 10)
  - **Blocks**: Tasks 11, 13
  - **Blocked By**: Tasks 1, 4, 5

  **References**:

  **Pattern References**:
  - `src/lib/llm/tools.ts:todoTools` - Tool definitions to register with streamText
  - `src/lib/llm/prompts.ts:buildSystemPrompt()` - System prompt builder
  - `src/lib/db/types.ts` - TypeScript types for List, Item, Message, Settings

  **External References**:
  - Vercel AI SDK streamText: `https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#streamtext` - Streaming response pattern
  - AI SDK Next.js route handler: `https://sdk.vercel.ai/docs/getting-started/nextjs-app-router` - App Router API route integration
  - AI SDK provider setup: `https://sdk.vercel.ai/providers/ai-sdk-providers/openai` and `https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic` - Provider initialization

  **WHY Each Reference Matters**:
  - streamText docs: Core API for streaming LLM responses with tools. The `tools` parameter and `maxSteps` config are critical.
  - Route handler docs: Exact pattern for returning streamed responses from App Router API routes
  - Provider docs: `createOpenAI()` and `createAnthropic()` constructors with per-request API key injection

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: API route streams a response with valid key
    Tool: Bash
    Preconditions: Dev server running, valid OpenAI or Anthropic API key available
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"messages":[{"role":"user","content":"Say hello"}],"listState":{"list":{"id":"1","name":"Test"},"items":[]},"settings":{"provider":"openai","apiKey":"<REAL_KEY>","model":"gpt-4o-mini"}}'
      2. Assert response status is 200
      3. Assert response body contains streamed text data
      4. Assert response includes "hello" or similar greeting (case insensitive)
    Expected Result: Streaming 200 response with LLM-generated text
    Failure Indicators: Non-200 status, empty response, timeout
    Evidence: .sisyphus/evidence/task-9-stream-response.txt

  Scenario: Invalid API key returns 401
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"messages":[{"role":"user","content":"Hello"}],"listState":{"list":{"id":"1","name":"Test"},"items":[]},"settings":{"provider":"openai","apiKey":"sk-invalid-key","model":"gpt-4o-mini"}}' \
           -w "\n%{http_code}"
      2. Assert response includes error message about authentication
    Expected Result: Error response indicating invalid key
    Failure Indicators: 200 with empty stream, 500 with stack trace, unhandled error
    Evidence: .sisyphus/evidence/task-9-invalid-key.txt

  Scenario: Malformed request returns 400
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. curl -X POST http://localhost:3000/api/chat \
           -H "Content-Type: application/json" \
           -d '{"bad":"data"}' \
           -w "\n%{http_code}"
      2. Assert status code is 400
    Expected Result: 400 with error message
    Failure Indicators: 500, unhandled crash
    Evidence: .sisyphus/evidence/task-9-malformed.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add streaming LLM chat endpoint with tool calling`
  - Files: `app/api/chat/route.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 10. Chat UI Components - Messages, Input, Streaming Display

  **What to do**:
  - Create `src/components/chat/ChatMessages.tsx` - scrollable message list:
    - User messages: right-aligned, colored bubble (e.g., blue)
    - Assistant messages: left-aligned, neutral bubble
    - Auto-scroll to bottom on new messages
    - Show timestamp on tap or as subtle text
    - Handle streaming text: assistant's current response appears and updates as tokens stream in
  - Create `src/components/chat/ChatInput.tsx` - message input bar:
    - Text input (auto-growing textarea, not single-line input)
    - Send button (icon, right side)
    - Submit on Enter (Shift+Enter for newline on desktop, but on mobile Enter should send)
    - Disabled state while AI is responding (show loading indicator)
    - Placeholder text: "Brain dump your tasks..." or similar context-aware text
  - Create `src/components/chat/ChatBubble.tsx` - individual message bubble component
  - All components must be mobile-first: large touch targets (44px min), readable font sizes (16px min to prevent iOS zoom)
  - Components should accept props for data and callbacks - no direct API/DB integration here

  **Must NOT do**:
  - Do NOT wire to the actual LLM API (that's Task 11)
  - Do NOT add message editing, deletion, or retry buttons
  - Do NOT add markdown rendering - plain text only
  - Do NOT add typing indicators or read receipts
  - Do NOT add file/image attachments

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Chat UI requires careful mobile UX - auto-scroll, keyboard handling, touch targets, streaming text display.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7, 8, 9)
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Vercel AI SDK useChat: `https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot` - `useChat` hook returns messages with streaming state
  - CSS scroll-to-bottom pattern: Use `scrollIntoView({ behavior: 'smooth' })` on a sentinel element

  **WHY Each Reference Matters**:
  - useChat docs: The message format from `useChat` (role, content, toolInvocations) determines how ChatMessages renders each message. Components should match this shape.
  - Scroll pattern: Auto-scroll is critical for chat UX - new messages must be visible without manual scrolling

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chat components render messages correctly on mobile
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport. As part of this task, create a temporary dev route at `app/dev/chat-preview/page.tsx` that renders the chat components with hardcoded mock messages. This route is for QA only and will be removed during Task 15 (polish).
    Steps:
      1. Navigate to /dev/chat-preview which renders ChatMessages with mock messages: [{ role: 'user', content: 'Buy groceries and pick up dry cleaning' }, { role: 'assistant', content: 'I added 2 items to your list...' }]
      2. Assert user message bubble is right-aligned
      3. Assert assistant message bubble is left-aligned
      4. Assert both messages are fully visible without horizontal scrolling
      5. Assert font size is >= 16px (check computed style)
      6. Take screenshot
    Expected Result: Messages render as chat bubbles, properly aligned, readable on mobile
    Failure Indicators: Messages overlap, text cut off, wrong alignment, tiny text
    Evidence: .sisyphus/evidence/task-10-chat-messages.png

  Scenario: Chat input is usable on mobile
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport
    Steps:
      1. Assert ChatInput is visible at bottom of chat area
      2. Click/focus the input field
      3. Type "I need to buy milk and eggs"
      4. Assert send button is visible and clickable
      5. Assert input grows if text wraps to multiple lines
    Expected Result: Input is accessible, grows with content, send button visible
    Failure Indicators: Input hidden by keyboard, send button off-screen, no auto-grow
    Evidence: .sisyphus/evidence/task-10-chat-input.png
  ```

  **Commit**: YES
  - Message: `feat(chat): add chat UI components`
  - Files: `src/components/chat/ChatMessages.tsx, src/components/chat/ChatInput.tsx, src/components/chat/ChatBubble.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 11. Chat Interface - Wire useChat + Message Persistence

  **What to do**:
  - Build the chat integration in `app/list/[id]/page.tsx` (or a dedicated `ChatPanel` wrapper component)
  - Use `useChat` from `@ai-sdk/react` configured to:
    - Point to `/api/chat` endpoint
    - Include `listState` (current list + items from Dexie) and `settings` (from Dexie) in the request body via the `body` option
    - The `body` sends serialized list state with every request so the API route can build the system prompt
  - Persist messages to Dexie following the AI SDK Protocol (see Verification Strategy section):
    - On `onFinish` callback: serialize `UIMessage` to Dexie (id, role, content, JSON.stringify(parts))
    - On page load: read messages from Dexie, parse parts JSON, pass as `initialMessages` to `useChat`
    - Use `addToolResult()` from `useChat` for tool result round-tripping (see AI SDK Protocol section)
  - Feed `useChat` messages into the ChatMessages + ChatInput components from Task 10
  - Handle loading state: disable input while AI is responding, show a subtle loading indicator
  - Handle errors: if the API call fails, show an error message in the chat (as a system-style message or toast), do NOT save error responses to DB
  - Limit chat history sent to LLM: send last 20 messages to the API (configurable), but display full history in the UI from Dexie
  - Place the chat interface inside the bottom panel of the SplitScreen from Task 8

  **Must NOT do**:
  - Do NOT execute tool calls here (that's Task 13 - this task just displays them)
  - Do NOT add message retry/regeneration
  - Do NOT add message search or filtering
  - Do NOT truncate displayed messages (only truncate what's sent to the LLM)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex state management - syncing useChat hook with Dexie persistence, hydrating initial messages, managing list state injection per request. Multiple moving parts.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 13)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 8, 9, 10

  **References**:

  **Pattern References**:
  - `src/components/chat/ChatMessages.tsx` - Message display component (Task 10)
  - `src/components/chat/ChatInput.tsx` - Input component (Task 10)
  - `src/components/SplitScreen.tsx` - Layout container for bottom panel (Task 8)
  - `src/lib/db/hooks.ts:useMessages()` - Reactive message query for hydration
  - `src/lib/db/hooks.ts:useItems()` - Current items to serialize as list state
  - `src/lib/db/hooks.ts:useSettings()` - API key/provider/model for request body
  - `src/lib/db/mutations.ts:addMessage()` - Persist messages to Dexie
  - `app/api/chat/route.ts` - The endpoint useChat connects to (Task 9)

  **External References**:
  - Vercel AI SDK useChat: `https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot` - Hook API, body option, initialMessages, onFinish callback
  - useChat options: `https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat` - Full options reference including body, onFinish, onError

  **WHY Each Reference Matters**:
  - Chat components (Task 10): These are the UI layer this task wires data into
  - SplitScreen (Task 8): Chat interface lives inside the bottom panel
  - DB hooks: useMessages provides initial hydration; useItems/useSettings provide per-request context
  - useChat docs: The `body` option for injecting list state, `initialMessages` for hydration, and `onFinish` for persistence are all critical patterns

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Send a message and receive a streaming response
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, valid API key configured in settings, a list exists
    Steps:
      1. Navigate to /list/[existing-list-id]
      2. Type "Hello, can you help me plan my weekend?" in chat input
      3. Click send
      4. Wait up to 15 seconds for response to appear
      5. Assert a user message bubble with the sent text appears
      6. Assert an assistant message bubble appears with non-empty content
      7. Assert the chat input is re-enabled after response completes
    Expected Result: Message sent, streaming response received and displayed
    Failure Indicators: No response, input stays disabled, error message, empty assistant bubble
    Evidence: .sisyphus/evidence/task-11-send-message.png

  Scenario: Chat history persists across page reloads
    Tool: Playwright
    Preconditions: At least one message exchange completed in a list
    Steps:
      1. Note the messages currently visible in the chat
      2. Reload the page (navigate away and back to /list/[id])
      3. Assert the same messages are visible after reload
      4. Assert message order is preserved (user then assistant)
    Expected Result: Messages survive page reload via Dexie persistence
    Failure Indicators: Empty chat after reload, messages missing or reordered
    Evidence: .sisyphus/evidence/task-11-persistence.png

  Scenario: Error state when no API key configured
    Tool: Playwright
    Preconditions: Dev server running, NO API key in settings, list exists
    Steps:
      1. Navigate to /list/[id]
      2. Type "Hello" and send
      3. Assert an error indication appears (toast, inline message, or redirect to settings)
      4. Assert no assistant message is saved to the chat
    Expected Result: Clear error feedback when API key is missing
    Failure Indicators: Silent failure, unhandled exception, blank response saved
    Evidence: .sisyphus/evidence/task-11-no-key-error.png
  ```

  **Commit**: YES
  - Message: `feat(chat): wire chat interface with streaming and persistence`
  - Files: `app/list/[id]/page.tsx, src/components/chat/*`
  - Pre-commit: `npx tsc --noEmit`

- [x] 12. Todo List Panel - Items, Manual Toggle, Metadata Badges

  **What to do**:
  - Create `src/components/todo/TodoPanel.tsx` - the top panel content for the split-screen
  - Create `src/components/todo/TodoItem.tsx` - individual item component:
    - Checkbox/circle to toggle completion (tap target >= 44px)
    - Item text (strikethrough when completed, normal when active)
    - Metadata badges displayed below or beside the item text:
      - `priority`: colored badge (red=high, yellow=medium, green=low)
      - `location`: pin icon + text
      - `effort`: clock icon + text (quick/medium/long)
      - `skipability`: small label (must-do/nice-to-have/optional)
      - Other metadata keys: render as subtle `key: value` text
    - Completed items should be visually distinct (faded, strikethrough, moved to bottom or in a collapsible "Done" section)
  - Create `src/components/todo/AddItemInput.tsx` - manual item add:
    - Simple inline input at top or bottom of list
    - Type text, press Enter or tap add button to create item
    - No metadata when manually adding (the AI infers it, manual adds are plain text)
  - TodoPanel uses `useItems(listId)` for reactive data from Dexie
  - Toggle completion calls `completeItems([id])` or `uncompleteItems([id])` from mutations
  - Manual add calls `addItems(listId, [{ text, metadata: {} }])`
  - Show list goal at the top of the panel if set (subtle, not dominating)
  - Empty state: friendly message like "No items yet. Use the chat below to brain dump your tasks!"
  - Place the todo panel inside the top panel of SplitScreen from Task 8

  **Must NOT do**:
  - Do NOT add drag-and-drop reordering
  - Do NOT add inline item editing (edit via chat for MVP)
  - Do NOT add swipe-to-delete gestures
  - Do NOT add filtering or sorting UI controls (AI handles this via chat)
  - Do NOT add sub-tasks or nesting

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Item list with metadata badges, completion states, empty states, and manual interactions. Mobile touch UX is critical.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 13)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 8

  **References**:

  **Pattern References**:
  - `src/components/SplitScreen.tsx` - Layout container for top panel (Task 8)
  - `src/lib/db/hooks.ts:useItems(listId)` - Reactive hook for items (Task 2)
  - `src/lib/db/mutations.ts:addItems(), completeItems(), uncompleteItems()` - Item mutations (Task 2)
  - `src/lib/db/types.ts:Item` - Item type including metadata field (Task 2)

  **WHY Each Reference Matters**:
  - SplitScreen: TodoPanel renders inside the top panel slot
  - useItems: Drives the reactive list display - auto-updates when items change (including from chat tool calls)
  - Mutations: Manual check/uncheck and add map to these functions
  - Item type: The metadata field is `Record<string, unknown>` - rendering logic needs to handle arbitrary keys

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Todo items display with metadata badges
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, list exists with items that have metadata
    Steps:
      1. Navigate to /list/[id] with items:
         - "Buy groceries" (priority: high, location: "Publix")
         - "Call dentist" (priority: medium, effort: "quick")
         - "Clean garage" (completed: true)
      2. Assert "Buy groceries" shows a red priority badge and a location badge with "Publix"
      3. Assert "Call dentist" shows a yellow priority badge and an effort badge
      4. Assert "Clean garage" appears with strikethrough or faded styling
      5. Take screenshot
    Expected Result: Items display with appropriate metadata badges and completion styling
    Failure Indicators: Missing badges, no visual distinction for completed items, metadata not rendered
    Evidence: .sisyphus/evidence/task-12-items-display.png

  Scenario: Manual toggle completion
    Tool: Playwright
    Preconditions: List with at least one incomplete item
    Steps:
      1. Click the checkbox/circle on an incomplete item
      2. Assert the item now shows completed styling (strikethrough/faded)
      3. Click the same checkbox again
      4. Assert the item returns to active styling
      5. Reload the page
      6. Assert the item's completion state persisted
    Expected Result: Tap toggles completion, state persists across reload
    Failure Indicators: Toggle doesn't work, state resets on reload
    Evidence: .sisyphus/evidence/task-12-toggle.png

  Scenario: Empty state shows helpful message
    Tool: Playwright
    Preconditions: List with zero items
    Steps:
      1. Navigate to /list/[id] for an empty list
      2. Assert empty state message is visible (e.g., "No items yet")
      3. Assert the message suggests using chat to add items
    Expected Result: Friendly empty state guiding user to chat
    Failure Indicators: Blank panel, no guidance, error
    Evidence: .sisyphus/evidence/task-12-empty-state.png

  Scenario: Manual add item via input
    Tool: Playwright
    Preconditions: List view open
    Steps:
      1. Find the manual add input field
      2. Type "Pick up prescription"
      3. Press Enter or tap add button
      4. Assert "Pick up prescription" appears in the todo list
      5. Assert it has no metadata badges (manual adds are plain)
    Expected Result: Item added and visible in list
    Failure Indicators: Input doesn't submit, item not appearing
    Evidence: .sisyphus/evidence/task-12-manual-add.png
  ```

  **Commit**: YES
  - Message: `feat(todo): add todo list panel with manual interactions`
  - Files: `src/components/todo/TodoPanel.tsx, src/components/todo/TodoItem.tsx, src/components/todo/AddItemInput.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 13. Tool Execution Engine - Validate + Mutate Dexie

  **What to do**:
  - Create `src/lib/llm/executor.ts` - the bridge between LLM tool calls and database mutations
  - Export `executeToolCall(toolName: string, args: unknown, listId: string): Promise<ToolResult>` function
  - For each tool, implement the execution:
    1. `addItems`: Validate args with Zod schema -> call `addItems(listId, items)` mutation -> return `{ success: true, itemsAdded: N }`
    2. `completeItems`: Validate -> verify each itemId exists in DB -> call `completeItems(ids)` -> return `{ success: true, itemsCompleted: N, notFound: [...] }`
    3. `uncompleteItems`: Validate -> verify existence -> call `uncompleteItems(ids)` -> return result
    4. `updateItem`: Validate -> verify existence -> call `updateItem(id, fields)` -> return result
    5. `deleteItems`: Validate -> verify existence -> call `deleteItems(ids)` -> return result
    6. `addAndCompleteItems`: Validate -> call `addItems` with `completed: true` -> return `{ success: true, itemsAdded: N }`
  - **Validation layer** (CRITICAL):
    - ALL tool call arguments are validated with Zod BEFORE any DB mutation
    - Item ID references are checked against actual DB state (no hallucinated IDs)
    - If an item ID doesn't exist, return a partial success with `notFound` array (don't fail the whole call)
    - If Zod validation fails, return `{ success: false, error: "Invalid arguments: ..." }`
  - Return a `ToolResult` type that can be serialized back to the LLM as the tool call result
  - Create a `processToolInvocations(toolInvocations, listId)` wrapper that handles multiple tool calls from a single LLM response, executing them sequentially within a Dexie transaction

  **Must NOT do**:
  - Do NOT add optimistic updates here (that's a UI concern)
  - Do NOT add undo/redo functionality
  - Do NOT silently swallow errors - always return structured results
  - Do NOT trust LLM output - validate everything

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: This is the trust boundary between LLM and database. Validation, error handling, partial success, and transaction management require careful logic.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 12)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 4, 9

  **References**:

  **Pattern References**:
  - `src/lib/llm/tools.ts:todoTools` - Zod schemas for validation (Task 4)
  - `src/lib/db/mutations.ts` - All mutation functions to call after validation (Task 2)
  - `src/lib/db/types.ts` - Type definitions for return values (Task 2)
  - `app/api/chat/route.ts` - Where tool invocations originate from (Task 9)

  **External References**:
  - Vercel AI SDK tool results: `https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#tool-execution` - How tool results are returned to the model
  - Dexie transactions: `https://dexie.org/docs/Dexie/Dexie.transaction()` - Atomic multi-operation transactions

  **WHY Each Reference Matters**:
  - Tool schemas (Task 4): Same Zod schemas used for definition are reused here for runtime validation
  - Mutations (Task 2): Executor doesn't touch IndexedDB directly - it calls the data access layer
  - AI SDK tool results: The format of the return value matters - the LLM sees it as context for its next response
  - Dexie transactions: Multiple tool calls in one LLM turn must be atomic - if one fails, others should roll back

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Valid addItems tool call creates items
    Tool: Bash
    Preconditions: Project scaffolded, db module and tools module exist, fake-indexeddb installed
    Steps:
      1. Create a test script `scripts/test-executor.ts` that:
         - Imports `fake-indexeddb/auto` at the top (Node IndexedDB shim)
         - Imports executeToolCall from src/lib/llm/executor
         - Imports db from src/lib/db
         - Creates a test list in Dexie
         - Calls executeToolCall('addItems', { items: [{ text: 'Buy milk', metadata: { priority: 'high' } }, { text: 'Buy eggs' }] }, '<list-id>')
         - Asserts return value has success: true and itemsAdded: 2
         - Queries db.items where listId matches and asserts 2 items with correct text/metadata
         - Cleans up test data
      2. Run `npx tsx scripts/test-executor.ts`
      3. Assert exit code 0
    Expected Result: Items created in DB, structured success result returned
    Failure Indicators: Error thrown, items not in DB, wrong metadata, assertion failure
    Evidence: .sisyphus/evidence/task-13-add-items.txt

  Scenario: completeItems with nonexistent ID returns partial success
    Tool: Bash
    Preconditions: Test script from above scenario
    Steps:
      1. Extend test script to:
         - Create a list and one item with known ID
         - Call executeToolCall('completeItems', { itemIds: ['<real-id>', 'fake-id-does-not-exist'] }, '<list-id>')
         - Assert return contains success: true and itemsCompleted: 1
         - Assert return contains notFound array with 'fake-id-does-not-exist'
         - Query DB and assert the real item is now completed
      2. Run `npx tsx scripts/test-executor.ts`
      3. Assert exit code 0
    Expected Result: Real item completed, fake ID reported as not found, no crash
    Failure Indicators: Entire call fails, fake ID silently ignored, crash
    Evidence: .sisyphus/evidence/task-13-partial-success.txt

  Scenario: Invalid arguments rejected by Zod
    Tool: Bash
    Preconditions: Test script exists
    Steps:
      1. Extend test script to:
         - Call executeToolCall('addItems', { bad: 'data' }, '<list-id>')
         - Assert return has success: false and error string containing "Invalid"
         - Query DB items table and assert NO new items were created
      2. Run `npx tsx scripts/test-executor.ts`
      3. Assert exit code 0
    Expected Result: Validation failure with clear error, no DB mutation
    Failure Indicators: Items created despite bad args, unhandled throw
    Evidence: .sisyphus/evidence/task-13-validation-fail.txt
  ```

  **Commit**: YES
  - Message: `feat(llm): add tool execution engine with validation`
  - Files: `src/lib/llm/executor.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 14. Cross-Panel Integration - Chat Mutations Update List Reactively

  **What to do**:
  - Wire the tool execution engine (Task 13) into the chat flow (Task 11):
    - When `useChat` receives tool invocations from the LLM, call `processToolInvocations()` from the executor
    - Tool results should be fed back to the LLM (via AI SDK's `experimental_onToolCall` or `onToolCall` callback) so the AI can respond with confirmation text
    - Use the AI SDK's `maxSteps` configuration (set in Task 9) so the LLM can make tool calls AND respond with text in a single turn
  - Verify reactive updates work end-to-end:
    - User sends "Add buy milk and eggs" in chat
    - LLM returns `addItems` tool call
    - Executor creates items in Dexie
    - `useItems()` / `useLiveQuery` in TodoPanel automatically re-renders with new items
    - LLM follows up with "Added 2 items to your list!"
  - Handle concurrent mutations:
    - User checks off an item in the UI while an LLM tool call is in flight
    - Both operations should succeed without conflicting (Dexie handles this naturally since they operate on different records, but test the edge case of operating on the same record)
  - Ensure list state sent to LLM is fresh:
    - The `body` option in `useChat` should read the LATEST items from Dexie at the time of sending (not stale state from component mount)
  - Wire the list view page (`app/list/[id]/page.tsx`) to compose all pieces:
    - SplitScreen layout with TodoPanel in top slot and ChatPanel in bottom slot
    - Both connected to the same Dexie data via shared `listId`
    - Header shows list name with back navigation to index

  **Must NOT do**:
  - Do NOT add optimistic UI updates (wait for Dexie write to confirm, then useLiveQuery re-renders)
  - Do NOT add undo/redo for tool call mutations
  - Do NOT add loading skeletons for the list (items appear via reactive query)
  - Do NOT add cross-list operations (scoped to current list only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: This is the critical integration task. Connects LLM tool calls -> executor -> Dexie -> reactive UI. Race conditions, stale state, and multi-step LLM flows all converge here.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential - depends on all Wave 4 tasks)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 11, 12, 13

  **References**:

  **Pattern References**:
  - `app/list/[id]/page.tsx` - The list view page being assembled (Task 11 started this)
  - `src/lib/llm/executor.ts:processToolInvocations()` - Tool execution function (Task 13)
  - `src/components/SplitScreen.tsx` - Layout container (Task 8)
  - `src/components/todo/TodoPanel.tsx` - List display component (Task 12)
  - `src/components/chat/*` - Chat components (Tasks 10, 11)
  - `src/lib/db/hooks.ts:useItems(), useList()` - Reactive data hooks (Task 2)

  **External References**:
  - Vercel AI SDK maxSteps: `https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls` - Multi-step tool calling pattern
  - Vercel AI SDK onToolCall: `https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#tool-calling` - Client-side tool call handling in useChat
  - Dexie useLiveQuery reactivity: `https://dexie.org/docs/dexie-react-hooks/useLiveQuery()` - How reactive updates propagate

  **WHY Each Reference Matters**:
  - processToolInvocations: The function that actually executes tool calls against Dexie - must be called from the chat flow
  - maxSteps: Allows the LLM to call tools AND generate a text response in one turn (call tool -> get result -> respond with "Added 2 items!")
  - onToolCall: Where client-side tool execution happens in the useChat lifecycle
  - useLiveQuery: The mechanism that makes the TodoPanel auto-update when the executor mutates Dexie

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Brain dump creates items visible in todo panel
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, valid API key, empty list
    Steps:
      1. Navigate to /list/[id]
      2. In chat, type "I need to buy milk, pick up dry cleaning, and call the dentist"
      3. Send and wait up to 20 seconds for response
      4. Assert assistant responds with confirmation text mentioning the items
      5. Assert todo panel now shows 3 items (check for "milk", "dry cleaning", "dentist" text)
      6. Assert at least one item has metadata (e.g., priority badge or location)
      7. Take screenshot showing both panels
    Expected Result: Chat brain dump creates items that immediately appear in todo panel with AI-inferred metadata
    Failure Indicators: Items not appearing in panel, no metadata, no confirmation text, tool call errors
    Evidence: .sisyphus/evidence/task-14-brain-dump.png

  Scenario: Completion via chat updates todo panel
    Tool: Playwright
    Preconditions: List has items including "buy milk" and "call dentist"
    Steps:
      1. In chat, type "I got the milk"
      2. Send and wait for response
      3. Assert assistant confirms milk was checked off
      4. Assert the milk item in todo panel now shows completed styling (strikethrough/faded)
      5. Assert other items remain unchecked
    Expected Result: Chat completion matches and checks off the correct item in the todo panel
    Failure Indicators: Wrong item checked, no item checked, all items checked, panel not updating
    Evidence: .sisyphus/evidence/task-14-chat-complete.png

  Scenario: Manual toggle doesn't break chat context
    Tool: Playwright
    Preconditions: List has items, chat has history
    Steps:
      1. Manually check off an item by tapping its checkbox in the todo panel
      2. In chat, type "What's left on my list?"
      3. Send and wait for response
      4. Assert the AI's response does NOT include the manually completed item as pending
      5. Assert the AI correctly lists only the remaining incomplete items
    Expected Result: Chat is aware of manual UI changes because list state is sent fresh each request
    Failure Indicators: AI lists the completed item as still pending (stale state)
    Evidence: .sisyphus/evidence/task-14-manual-then-chat.png

  Scenario: "I already did X" adds and completes in one step
    Tool: Playwright
    Preconditions: List exists, item "walk the dog" is NOT on the list
    Steps:
      1. In chat, type "Oh I also already walked the dog"
      2. Send and wait for response
      3. Assert "walk the dog" (or similar) appears in todo panel as a COMPLETED item
      4. Assert assistant confirms it was added and checked off
    Expected Result: Item added and immediately marked done
    Failure Indicators: Item added but not completed, item not added at all
    Evidence: .sisyphus/evidence/task-14-add-and-complete.png
  ```

  **Commit**: YES
  - Message: `feat: integrate chat and todo panels with reactive state`
  - Files: `app/list/[id]/page.tsx, src/lib/llm/* (integration wiring)`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 15. Polish - Empty States, Error Handling, Onboarding, Mobile UX

  **What to do**:
  - **Empty states** (all pages):
    - List index with no lists: welcoming message + "Create your first list" button
    - List view with no items: "Brain dump your tasks in the chat below!" with arrow pointing to chat
    - Chat with no messages: placeholder in message area like "Start by telling me what you need to get done"
  - **Error handling**:
    - API key not configured: when user tries to chat, show a clear prompt to visit Settings first (inline message or redirect with toast)
    - LLM API error (rate limit, network): show error toast with the message, don't save error to chat history
    - IndexedDB not available (private browsing in some browsers): show a warning banner explaining data won't persist
  - **Onboarding hints**:
    - First-time experience: after creating first list, show a brief tooltip or message explaining the split-screen ("Your list appears here, chat with the AI below to manage it")
    - No need for a full tutorial - just contextual hints
  - **Mobile UX fixes**:
    - Ensure chat input stays visible when mobile keyboard opens (CSS `dvh` or viewport workaround)
    - Ensure touch targets are >= 44px on all interactive elements
    - Ensure no horizontal scroll on any page at 375px width
    - Test that send button is reachable with thumb (bottom-right area)
    - Add `user-select: none` on interactive elements to prevent accidental text selection on tap
  - **Loading states**:
    - While LLM is responding: show a pulsing dot or "thinking..." in the chat
    - While navigating between pages: minimal loading (Next.js handles this, but ensure no flash of empty content)
  - **Settings link**:
    - Ensure settings is accessible from both the index page header and the list view header
  - **Favicon and PWA icon**:
    - Add a simple favicon (can reuse PWA icon scaled down)
    - Ensure the app title shows correctly when installed to home screen
  - **Cleanup dev artifacts**:
    - Remove `app/dev/chat-preview/page.tsx` (QA preview route from Task 10)
    - Remove `scripts/test-db.ts` and `scripts/test-executor.ts` (QA scripts from Tasks 2, 13)
    - Remove `tsx` from devDependencies if no longer needed

  **Must NOT do**:
  - Do NOT add a full onboarding flow or tutorial wizard
  - Do NOT add theme/dark mode
  - Do NOT add animations beyond simple transitions (collapse/expand already handled in Task 8)
  - Do NOT add haptic feedback or native mobile features
  - Do NOT add analytics or tracking
  - Do NOT add a feedback form or support link

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UX polish across multiple pages. Empty states, error UX, mobile viewport issues, and loading states. Visual attention to detail.
  - **Skills**: [`playwright`]
    - `playwright`: Needed to verify mobile viewport behavior, keyboard interaction, and touch target sizes during implementation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential after Task 14)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Task 14

  **References**:

  **Pattern References**:
  - `app/page.tsx` - List index page to add empty state (Task 7)
  - `app/list/[id]/page.tsx` - List view to add empty/error states (Tasks 11, 14)
  - `app/settings/page.tsx` - Settings page to verify link targets (Task 6)
  - `src/components/SplitScreen.tsx` - Layout to verify mobile viewport (Task 8)
  - `src/components/chat/ChatInput.tsx` - Chat input for keyboard handling (Task 10)
  - `src/components/todo/TodoPanel.tsx` - Todo panel for empty state (Task 12)

  **WHY Each Reference Matters**:
  - Each page needs empty state and error handling wired into its existing structure
  - SplitScreen and ChatInput are the key components for mobile keyboard issues
  - This task touches many files but only adds polish - no structural changes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Empty state flow - brand new user
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, clean IndexedDB (no data)
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert empty state message is visible ("Create your first list" or similar)
      3. Create a new list
      4. Assert navigated to list view
      5. Assert todo panel shows empty state guiding user to chat
      6. Assert chat area shows placeholder text
      7. Take screenshot of each state
    Expected Result: Clear, helpful empty states guiding the user through first use
    Failure Indicators: Blank pages, confusing UI, no guidance
    Evidence: .sisyphus/evidence/task-15-empty-states.png

  Scenario: Error state - no API key
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, no API key configured, list exists
    Steps:
      1. Navigate to /list/[id]
      2. Type "Hello" in chat and send
      3. Assert a clear message appears telling user to configure API key
      4. Assert the message includes a link/button to Settings
      5. Assert no error is saved as a chat message
    Expected Result: User-friendly prompt to configure settings, not a cryptic error
    Failure Indicators: Unhandled error, stack trace visible, silent failure
    Evidence: .sisyphus/evidence/task-15-no-key-error.png

  Scenario: Mobile viewport - no horizontal scroll at 375px
    Tool: Playwright
    Preconditions: Dev server running, 375px x 667px viewport (iPhone SE)
    Steps:
      1. Navigate to index page - assert document.body.scrollWidth <= 375
      2. Navigate to settings page - assert document.body.scrollWidth <= 375
      3. Navigate to list view - assert document.body.scrollWidth <= 375
      4. Open chat input keyboard (focus input) - assert chat input remains visible
    Expected Result: No horizontal overflow on any page at minimum mobile width
    Failure Indicators: Horizontal scrollbar, content wider than viewport
    Evidence: .sisyphus/evidence/task-15-mobile-viewport.png

  Scenario: Touch targets are accessible
    Tool: Playwright
    Preconditions: Dev server running, 390px viewport, list with items
    Steps:
      1. Navigate to list view with items
      2. Measure checkbox/toggle elements - assert height >= 44px and width >= 44px
      3. Measure send button - assert height >= 44px
      4. Measure back button in header - assert >= 44px tap area
    Expected Result: All interactive elements meet 44px minimum touch target
    Failure Indicators: Any interactive element smaller than 44px
    Evidence: .sisyphus/evidence/task-15-touch-targets.png
  ```

  **Commit**: YES
  - Message: `feat(ux): add empty states, error handling, and onboarding`
  - Files: `app/page.tsx, app/list/[id]/page.tsx, app/settings/page.tsx, src/components/* (various)`
  - Pre-commit: `npx tsc --noEmit && npm run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** - `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns - reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** - `unspecified-high`
  Run `npx tsc --noEmit` + linter + review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify TypeScript strict mode.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Final-State End-to-End QA** - `unspecified-high` (+ `playwright` skill)
  Start from clean state (clear IndexedDB). Do NOT replay interim task QA scenarios (some depend on dev artifacts removed in Task 15). Instead, run end-to-end workflows against the finished product:
  1. **Onboarding flow**: Open app -> see empty state -> go to Settings -> configure API key -> return to index -> create a list -> see empty list with chat
  2. **Brain dump flow**: In chat, type "I need to buy milk, eggs, bread, pick up dry cleaning, and call the dentist" -> verify 5 items appear in todo panel with metadata badges
  3. **Completion flow**: Type "I got the milk and eggs" -> verify those items checked off, others remain
  4. **Add-and-complete flow**: Type "I also already walked the dog" -> verify item added and checked off
  5. **Query flow**: Type "What's left?" -> verify AI responds with only remaining items
  6. **Manual interaction**: Check off an item in the todo panel -> type "What's left?" -> verify AI's response reflects the manual change
  7. **Persistence**: Reload the page -> verify all items, completion states, and chat history survive
  8. **Multi-list**: Go to index -> create a second list -> verify both lists exist independently
  9. **Error handling**: Remove API key from settings -> try to chat -> verify clear error message
  10. **PWA**: Verify manifest loads, service worker registers
  All at 390px viewport. Save to `.sisyphus/evidence/final-qa/`.
  Output: `E2E Flows [N/N pass] | Persistence [PASS/FAIL] | Error Handling [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** - `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 - everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task(s) | Commit Message | Key Files |
|---|---|---|
| 1 | `init: scaffold Next.js app with TypeScript and Tailwind` | package.json, tsconfig.json, tailwind.config.ts, app/layout.tsx |
| 2 | `feat(db): add Dexie.js database schema and data access hooks` | src/lib/db/*, src/lib/hooks/* |
| 3 | `feat(pwa): add manifest and service worker setup` | manifest.json, serwist config |
| 4 | `feat(llm): add tool schemas with Zod validation` | src/lib/llm/tools.ts |
| 5 | `feat(llm): add system prompts for todo management` | src/lib/llm/prompts.ts |
| 6 | `feat(settings): add API key and provider management page` | app/settings/page.tsx |
| 7 | `feat(lists): add list index page with CRUD` | app/page.tsx, components |
| 8 | `feat(layout): add split-screen collapsible panel layout` | src/components/SplitScreen.tsx |
| 9 | `feat(api): add streaming LLM chat endpoint with tool calling` | app/api/chat/route.ts |
| 10 | `feat(chat): add chat UI components` | src/components/chat/* |
| 11 | `feat(chat): wire chat interface with streaming and persistence` | app/list/[id]/page.tsx |
| 12 | `feat(todo): add todo list panel with manual interactions` | src/components/todo/* |
| 13 | `feat(llm): add tool execution engine with validation` | src/lib/llm/executor.ts |
| 14 | `feat: integrate chat and todo panels with reactive state` | wiring code |
| 15 | `feat(ux): add empty states, error handling, and onboarding` | various |

---

## Success Criteria

### Verification Commands
```bash
npm run build        # Expected: successful build, no TypeScript errors
npm run dev          # Expected: app starts on localhost:3000
curl localhost:3000  # Expected: 200 OK, HTML with app shell
```

### Final Checklist
- [ ] All "Must Have" present (split-screen, chat, manual toggle, metadata, multi-list, BYO key, streaming, PWA)
- [ ] All "Must NOT Have" absent (no auth, no cloud, no offline, no sub-tasks, no drag-drop, no markdown, no export)
- [ ] Brain dump -> structured list works end-to-end
- [ ] "I did X" -> items crossed off works end-to-end
- [ ] Manual check/uncheck works and persists
- [ ] Data survives page reload (IndexedDB)
- [ ] PWA installable on mobile
- [ ] Works on 375px viewport
