# Testing Deep Dive: Bug Fixes, Test Coverage & Playwright E2E

## TL;DR

> **Quick Summary**: Fix 8+ bugs discovered via code review (AI SDK v6 compatibility, settings state desync, unused imports, hook anti-patterns), set up proper Playwright test infrastructure, and write comprehensive E2E + unit tests to prevent regression.
> 
> **Deliverables**:
> - 8 bugs fixed across 4 source files
> - Playwright test infrastructure (`@playwright/test`, config, npm scripts)
> - E2E test suite covering 5 user flows (onboarding, settings, list management, todo CRUD, chat)
> - Unit tests for uncovered mutations and edge cases
> - Ad-hoc QA scripts replaced by proper test suite
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (Playwright setup) -> Task 7 (ChatPanel fixes) -> Task 10 (E2E chat tests) -> Final verification

---

## Context

### Original Request
"This project has suddenly gotten very buggy despite having started off great at the start. Can you help me do a deep dive into its issues with testing, test coverage, and using testing tools like playwright? Then also fix and review those issues again."

### Interview Summary
**Key Findings** (from code review of entire codebase):
- Build, TypeScript, and ESLint all pass cleanly - bugs are runtime/logic issues, not compile-time
- 48 unit tests pass across 7 files, but zero component tests and zero E2E tests
- `playwright` library installed but `@playwright/test` (test runner) is not - no config, no test infrastructure
- 3 ad-hoc QA scripts exist in `scripts/` using raw Playwright API, not structured as tests
- AI SDK v6 migration left `.content` property accesses that should use `.parts` (multiple locations in ChatPanel)
- Settings page has 3 distinct bugs: unused import, state desync on validation, redundant save trigger

**Research Findings**:
- AI SDK v6 `UIMessage` uses `.parts` array; `.content` is not guaranteed at runtime
- `@playwright/test` provides test runner, fixtures, reporters, `webServer` config - must replace raw `playwright`
- Existing QA scripts have useful selectors and flow descriptions to reference

### Metis Review
**Identified Gaps** (addressed):
- 3 additional bugs missed in initial review (ChatPanel .content used in onFinish, viewMessages, and messages prop)
- Package swap from `playwright` to `@playwright/test` was not initially identified as needed
- E2E tests require mock strategy for `/api/chat` - cannot depend on real API keys
- Missing acceptance criteria for per-bug verification
- Edge case: existing IndexedDB messages may have undefined content from Bug #2

---

## Work Objectives

### Core Objective
Fix all discovered bugs, set up proper Playwright E2E test infrastructure, and write comprehensive tests to lock in correct behavior and prevent future regressions.

### Concrete Deliverables
- Fixed source files: `ChatPanel.tsx`, `settings/page.tsx`, `prompts.ts`, `SplitScreen.tsx`
- New file: `playwright.config.ts`
- New file: `src/hooks/useMediaQuery.ts`
- New directory: `e2e/` with test files
- Updated: `package.json` (scripts, devDependencies)
- New unit tests for uncovered mutations and edge cases
- Deleted: `scripts/qa-*.mjs` (replaced by proper test suite)

### Definition of Done
- [ ] `npm test` - all tests pass (existing 48 + new unit tests)
- [ ] `npx playwright test` - all E2E tests pass
- [ ] `npx tsc --noEmit` - no type errors
- [ ] `npm run lint` - no warnings or errors
- [ ] `npm run build` - production build succeeds
- [ ] All 8+ bugs verified fixed with corresponding tests

### Must Have
- Every bug fix has at least one test that would have FAILED before the fix
- E2E tests run without real API keys (mock `/api/chat`)
- Playwright tests use `@playwright/test` framework (not raw playwright API)
- Each E2E test starts with clean browser context (no cross-test state leakage)

### Must NOT Have (Guardrails)
- No React Testing Library / jsdom component rendering tests (separate effort)
- No ChatPanel message pipeline refactoring beyond specific `.content` -> `.parts` fixes
- No settings page save pattern changes (debounce, form-submit, etc.)
- No CI/CD pipeline setup
- No coverage reporting or threshold enforcement
- No error boundary additions
- No TypeScript `as any` cast cleanup beyond the specific bug fix locations
- No new features or UI changes
- No data migrations for existing IndexedDB messages

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest configured, Playwright being added)
- **Automated tests**: Tests-after (fix bugs first, then lock with tests)
- **Framework**: Vitest (unit) + @playwright/test (E2E)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Library/Module**: Use Bash (node REPL or vitest) - Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - infrastructure + trivial fixes):
+-- Task 1: Set up Playwright test infrastructure [quick]
+-- Task 2: Fix indentation anomaly in prompts.ts [quick]
+-- Task 3: Fix GoogleSignInButton unused import in settings [quick]
+-- Task 4: Extract useMediaQuery hook from SplitScreen [quick]
+-- Task 5: Add unit tests for addMessage mutation + edge cases [quick]

Wave 2 (After Wave 1 - settings + ChatPanel bug fixes):
+-- Task 6: Fix settings page validation desync + redundant save [deep]
+-- Task 7: Fix AI SDK v6 .content usage in ChatPanel [deep]
+-- Task 8: Stabilize initialMessages memo in ChatPanel [quick]

Wave 3 (After Wave 2 - E2E tests, MAX PARALLEL):
+-- Task 9: E2E tests for onboarding + list management [unspecified-high]
+-- Task 10: E2E tests for settings configuration [unspecified-high]
+-- Task 11: E2E tests for todo CRUD operations [unspecified-high]
+-- Task 12: E2E tests for chat interaction with mocked API [deep]

Wave 4 (After Wave 3 - cleanup):
+-- Task 13: Remove ad-hoc QA scripts + verify full test suite [quick]

Wave FINAL (After ALL tasks - 4 parallel reviews, then user okay):
+-- Task F1: Plan compliance audit (oracle)
+-- Task F2: Code quality review (unspecified-high)
+-- Task F3: Real manual QA (unspecified-high)
+-- Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 -> Task 7 -> Task 12 -> Task 13 -> F1-F4 -> user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | None | 9, 10, 11, 12 |
| 2 | None | 13 |
| 3 | None | 10, 13 |
| 4 | None | 13 |
| 5 | None | 13 |
| 6 | None | 10, 13 |
| 7 | None | 12, 13 |
| 8 | None | 12, 13 |
| 9 | 1 | 13 |
| 10 | 1, 3, 6 | 13 |
| 11 | 1 | 13 |
| 12 | 1, 7, 8 | 13 |
| 13 | 2-12 | F1-F4 |
| F1-F4 | 13 | Done |

### Agent Dispatch Summary

- **Wave 1**: **5** - T1 `quick`, T2 `quick`, T3 `quick`, T4 `quick`, T5 `quick`
- **Wave 2**: **3** - T6 `deep`, T7 `deep`, T8 `quick`
- **Wave 3**: **4** - T9 `unspecified-high`, T10 `unspecified-high`, T11 `unspecified-high`, T12 `deep`
- **Wave 4**: **1** - T13 `quick`
- **FINAL**: **4** - F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Set up Playwright test infrastructure

  **What to do**:
  - Replace `playwright` with `@playwright/test` in `package.json` devDependencies (same version ^1.59.0)
  - Run `npm install` to update lockfile
  - Run `npx playwright install chromium` to install browser binary
  - Create `playwright.config.ts` with: `testDir: 'e2e'`, `baseURL: 'http://localhost:3000'`, `webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }`, projects for chromium only
  - Add `"test:e2e": "playwright test"` script to `package.json`
  - Create `e2e/` directory with a smoke test that navigates to `/` and asserts the page title contains "AI Todo"
  - Add `e2e-results/`, `playwright-report/`, `test-results/` to `.gitignore`

  **Must NOT do**:
  - Do not keep both `playwright` and `@playwright/test` installed
  - Do not configure multiple browsers (chromium only)
  - Do not set up CI-specific configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit after infrastructure setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 9, 10, 11, 12
  - **Blocked By**: None

  **References**:
  - `package.json` - Current devDependencies show `"playwright": "^1.59.0"` which must be swapped to `"@playwright/test": "^1.59.0"`
  - `scripts/qa-all-flows.mjs:1` - Shows current import pattern `import { chromium } from 'playwright'` (reference only, don't modify)
  - `vitest.config.ts` - Reference for how the project configures test infrastructure (node env, setupFiles pattern)
  - `next.config.ts` - Dev server runs via `npm run dev` on default port 3000

  **Acceptance Criteria**:
  - [ ] `package.json` devDependencies has `@playwright/test` and NOT `playwright`
  - [ ] `npx playwright test --list` shows the smoke test
  - [ ] `npx playwright test` exits 0 (smoke test passes with dev server running)
  - [ ] `playwright.config.ts` exists with webServer, baseURL, testDir configured
  - [ ] `.gitignore` includes playwright report/results directories

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Playwright smoke test runs successfully
    Tool: Bash
    Preconditions: Dev server running on port 3000
    Steps:
      1. Run `npx playwright test --list` and capture output
      2. Assert output contains at least 1 test
      3. Run `npx playwright test` and capture exit code
      4. Assert exit code is 0
    Expected Result: Smoke test listed and passes
    Failure Indicators: Exit code non-zero, "no tests found", browser launch error
    Evidence: .sisyphus/evidence/task-1-playwright-smoke.txt

  Scenario: Package swap verified
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run `node -e "require('@playwright/test')"` - should not throw
      2. Run `cat package.json | grep playwright` - should show @playwright/test only
    Expected Result: @playwright/test importable, no raw playwright in dependencies
    Failure Indicators: Module not found error, both packages present
    Evidence: .sisyphus/evidence/task-1-package-check.txt
  ```

  **Commit**: YES
  - Message: `chore: set up Playwright test infrastructure with @playwright/test`
  - Files: `playwright.config.ts`, `package.json`, `package-lock.json`, `e2e/`, `.gitignore`
  - Pre-commit: `npm test`

- [x] 2. Fix indentation anomaly in prompts.ts

  **What to do**:
  - Fix line 31 in `src/lib/llm/prompts.ts` - add proper indentation (4 spaces) to match surrounding code:
    ```
    // Before: (no indentation)
    const statusPrefix = item.completed ? '[done] ' : ''
    // After: (4 spaces, matching lines 32-38)
        const statusPrefix = item.completed ? '[done] ' : ''
    ```

  **Must NOT do**:
  - Do not change any logic in prompts.ts
  - Do not reformat the entire file

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `src/lib/llm/prompts.ts:30-38` - The `serializeListState` function where line 31 has inconsistent indentation while lines 32-38 are properly indented with 4 spaces

  **Acceptance Criteria**:
  - [ ] Line 31 of `prompts.ts` has 4 spaces of indentation matching surrounding lines
  - [ ] `npm test` passes (existing prompts.test.ts still green)
  - [ ] `npm run lint` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Indentation is consistent
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run `grep -n 'statusPrefix' src/lib/llm/prompts.ts`
      2. Assert the line starts with 4 spaces (not 0)
      3. Run `npm test` and assert exit 0
    Expected Result: Line properly indented, tests pass
    Failure Indicators: Line starts at column 0, tests fail
    Evidence: .sisyphus/evidence/task-2-indentation-fix.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `fix: correct indentation anomaly in prompts.ts and remove unused import`
  - Files: `src/lib/llm/prompts.ts`, `app/settings/page.tsx`
  - Pre-commit: `npm test && npx tsc --noEmit`

- [x] 3. Remove unused GoogleSignInButton dynamic import from settings page

  **What to do**:
  - Remove lines 60-63 in `app/settings/page.tsx` - the `GoogleSignInButton` dynamic import that is declared but never used in JSX:
    ```tsx
    // Remove these lines entirely:
    const GoogleSignInButton = dynamic(
      () => import('@/components/GoogleSignInButton').then(mod => ({ default: mod.GoogleSignInButton })),
      { ssr: false }
    )
    ```
  - Also remove the `dynamic` import from `next/dynamic` on line 7 if it's no longer used

  **Must NOT do**:
  - Do not add GoogleSignInButton to the JSX (that's a feature, not a fix)
  - Do not modify GoogleSignInButton.tsx component itself
  - Do not remove the GoogleSignInButton component file

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 10, 13
  - **Blocked By**: None

  **References**:
  - `app/settings/page.tsx:7` - `import dynamic from 'next/dynamic'` (may become unused after removing the GoogleSignInButton import)
  - `app/settings/page.tsx:60-63` - The unused dynamic import declaration
  - `src/components/GoogleSignInButton.tsx` - The component file (DO NOT modify or delete)

  **Acceptance Criteria**:
  - [ ] `GoogleSignInButton` dynamic import removed from settings/page.tsx
  - [ ] `dynamic` import removed if no longer used
  - [ ] `npx tsc --noEmit` passes (no unused import errors)
  - [ ] `npm run build` succeeds

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Unused import removed cleanly
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run `grep -n 'GoogleSignInButton' app/settings/page.tsx`
      2. Assert no matches found
      3. Run `npx tsc --noEmit` and assert exit 0
      4. Run `npm run build` and assert exit 0
    Expected Result: No reference to GoogleSignInButton in settings page, clean build
    Failure Indicators: grep finds matches, tsc errors, build failure
    Evidence: .sisyphus/evidence/task-3-unused-import.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `fix: correct indentation anomaly in prompts.ts and remove unused import`
  - Files: `src/lib/llm/prompts.ts`, `app/settings/page.tsx`
  - Pre-commit: `npm test && npx tsc --noEmit`

- [x] 4. Extract useMediaQuery hook from SplitScreen component

  **What to do**:
  - Create `src/hooks/useMediaQuery.ts` with the `useMediaQuery` function extracted from `SplitScreen.tsx:22-32`
  - The hook should accept a `query: string` parameter and return `boolean`
  - Update `SplitScreen.tsx` to import `useMediaQuery` from the new file, removing the inline definition
  - Write a unit test `src/hooks/useMediaQuery.test.ts` using a `// @vitest-environment happy-dom` per-file directive (Vitest supports per-file environment overrides via magic comments). This avoids changing the global vitest config. Install `happy-dom` as a devDependency if not present.
  - The test should verify: initial value matches mock, responds to change events, cleans up listener on unmount
  - Use `renderHook` from a minimal helper that calls the hook inside a React component (or use `@testing-library/react`'s `renderHook` if already available, otherwise write a 5-line inline helper using `react-dom/client`)

  **Must NOT do**:
  - Do not change SplitScreen behavior or layout
  - Do not add any other hooks to the new file
  - Do not modify the hook's logic (just move it)
  - Do not change the global Vitest environment from `node` (use per-file `// @vitest-environment happy-dom` only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `src/components/SplitScreen.tsx:22-32` - The inline `useMediaQuery` function to extract. It uses `window.matchMedia`, `useState`, and `useEffect` with an event listener
  - `src/components/SplitScreen.tsx:34` - Call site: `const isDesktop = useMediaQuery('(min-width: 768px)')` - must remain unchanged after refactor
  - `vitest.config.ts:5` - Global test environment is `node`. The hook test MUST use `// @vitest-environment happy-dom` per-file directive (Vitest supports this natively) since the hook uses `window.matchMedia`, `useState`, and `useEffect` which require a DOM environment. Do NOT change the global environment.

  **Acceptance Criteria**:
  - [ ] `src/hooks/useMediaQuery.ts` exists with exported `useMediaQuery` function
  - [ ] `SplitScreen.tsx` imports from `@/hooks/useMediaQuery` and no longer defines it inline
  - [ ] Unit test `src/hooks/useMediaQuery.test.ts` passes
  - [ ] `npm test` passes (all existing + new test)
  - [ ] `npm run build` succeeds (SplitScreen renders correctly)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hook correctly extracted and importable
    Tool: Bash
    Preconditions: Files created/modified
    Steps:
      1. Run `grep -n 'useMediaQuery' src/components/SplitScreen.tsx` - should show import, not function definition
      2. Run `grep -n 'export function useMediaQuery' src/hooks/useMediaQuery.ts` - should find the export
      3. Run `npm test` and assert exit 0
    Expected Result: Hook is in its own file, imported by SplitScreen, tests pass
    Failure Indicators: SplitScreen still has inline definition, import errors, test failures
    Evidence: .sisyphus/evidence/task-4-hook-extraction.txt

  Scenario: useMediaQuery unit test covers event listener
    Tool: Bash
    Preconditions: Test file created
    Steps:
      1. Run `npx vitest run src/hooks/useMediaQuery.test.ts` and capture output
      2. Assert at least 2 tests pass (initial value + change event)
    Expected Result: Hook test verifies both initial state and media query change
    Failure Indicators: Tests fail, mock issues
    Evidence: .sisyphus/evidence/task-4-hook-test.txt
  ```

  **Commit**: YES
  - Message: `refactor: extract useMediaQuery hook from SplitScreen component`
  - Files: `src/hooks/useMediaQuery.ts`, `src/hooks/useMediaQuery.test.ts`, `src/components/SplitScreen.tsx`
  - Pre-commit: `npm test`

- [x] 5. Add unit tests for addMessage mutation and edge cases

  **What to do**:
  - Add tests to `src/lib/db/mutations.test.ts` for the `addMessage` function (currently untested):
    - Test: creates message with correct fields (id, listId, role, content, createdAt)
    - Test: stores parts string when provided
    - Test: handles undefined parts gracefully
    - Test: user and assistant roles both work
  - Add edge case tests for existing mutations:
    - `createList` with empty goal (undefined vs empty string)
    - `addItems` with empty items array
    - `completeItems` with empty IDs array
    - `deleteItems` with non-existent IDs (should not throw)
    - `saveProviderConfig` creates settings if none exist
    - `setActiveProvider` when no settings exist (should not throw)

  **Must NOT do**:
  - Do not modify any mutation source code
  - Do not add tests for hooks (those are React-dependent)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `src/lib/db/mutations.ts:68-84` - `addMessage` function to test: creates Message with id, listId, role, content, parts, createdAt
  - `src/lib/db/mutations.ts:86-107` - `saveSettings`, `saveProviderConfig`, `setActiveProvider` edge cases
  - `src/lib/db/mutations.test.ts` - Existing test patterns: `beforeEach` clears all tables, uses `db.items.where()` for assertions
  - `src/lib/db/types.ts:21-28` - `Message` interface: id, listId, role, content, parts?, createdAt

  **Acceptance Criteria**:
  - [ ] `addMessage` has 4+ test cases covering all parameters
  - [ ] Edge case tests added for at least 4 existing mutations
  - [ ] `npm test` passes with increased test count (48 + new tests)
  - [ ] No mutation source code modified

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: New addMessage tests pass
    Tool: Bash
    Preconditions: Tests added to mutations.test.ts
    Steps:
      1. Run `npx vitest run src/lib/db/mutations.test.ts` and capture output
      2. Assert test count is higher than 10 (was ~10, should be 15+)
      3. Assert 0 failures
    Expected Result: All new and existing mutation tests pass
    Failure Indicators: Any test failure, assertion error
    Evidence: .sisyphus/evidence/task-5-mutation-tests.txt

  Scenario: Edge cases handle gracefully
    Tool: Bash
    Preconditions: Edge case tests added
    Steps:
      1. Run `npm test` and capture full output
      2. Assert total test count > 48 (was 48)
      3. Assert 0 failures
    Expected Result: All tests pass including new edge cases
    Failure Indicators: Test failures, unhandled exceptions
    Evidence: .sisyphus/evidence/task-5-edge-cases.txt
  ```

  **Commit**: YES
  - Message: `test: add unit tests for addMessage mutation and edge cases`
  - Files: `src/lib/db/mutations.test.ts`
  - Pre-commit: `npm test`

- [x] 6. Fix settings page validation desync and redundant save

  **What to do**:
  - **Bug 4 Fix (validation desync)**: In `app/settings/page.tsx`, the `handleChange` function at line 86-87 updates `localConfigs` state BEFORE the validation check at lines 89-94. When validation fails and the function returns early, the UI shows the key but it's not saved to IndexedDB. Fix by moving the validation check BEFORE `setLocalConfigs`:
    ```tsx
    async function handleChange(provider: string, field: 'apiKey' | 'model', value: string) {
      // Validate FIRST, before updating state
      if (field === 'apiKey' && value.length > 4) {
        const prefix = KEY_PREFIXES[provider]
        const isGoogleOAuth = provider === 'google' && value.startsWith('ya29.')
        if (prefix && !value.startsWith(prefix.prefix) && !isGoogleOAuth) {
          // Still update UI state (user is typing), but don't save
          const existing = localConfigs[provider] || { apiKey: '', model: MODELS[provider][0] }
          setLocalConfigs(prev => ({ ...prev, [provider]: { ...existing, [field]: value } }))
          return  // Don't persist invalid key
        }
      }
      // ... rest of function (update state AND save)
    }
    ```
    Actually, re-reading the code: the current behavior shows the key in the UI but doesn't save it. The desync is: user types invalid prefix -> UI shows key -> key is NOT in DB. On reload, the key disappears. The fix should ensure the UI and DB stay in sync. Two approaches:
    - Option A: Always save to DB regardless of prefix validation (prefix is a warning, not a blocker). The warning text already shows.
    - Option B: Don't update UI state when validation fails (confusing UX - user's typing disappears).
    Best approach: **Option A** - remove the early return so the key always saves. The amber warning already tells users about wrong prefix format. The validation was blocking save but not blocking UI, causing the desync.

  - **Bug 5 Fix (redundant save)**: Remove the `onBlur` handler from the API key input at line 186. The `onChange` handler already saves on every keystroke, making `onBlur` redundant. Simply remove the `onBlur` attribute:
    ```tsx
    // Before:
    onChange={(e) => handleChange(p, 'apiKey', e.target.value)}
    onBlur={(e) => handleChange(p, 'apiKey', e.target.value)}
    // After:
    onChange={(e) => handleChange(p, 'apiKey', e.target.value)}
    ```

  **Must NOT do**:
  - Do not change the autosave-on-keystroke pattern to a form-submit pattern
  - Do not add debouncing
  - Do not restructure the settings page component
  - Do not add GoogleSignInButton to the JSX (separate feature)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Two interrelated bugs in one file, needs careful state management understanding
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8)
  - **Blocks**: Tasks 10, 13
  - **Blocked By**: None (but logically after Wave 1 completes)

  **References**:
  - `app/settings/page.tsx:76-102` - `handleChange` function: lines 86-87 update localConfigs state, lines 89-94 validate and return early, line 97 saves to DB
  - `app/settings/page.tsx:185-186` - Input element with both `onChange` and `onBlur` calling same handler
  - `src/lib/db/mutations.ts:90-100` - `saveProviderConfig` function that gets called by handleChange
  - `app/settings/page.tsx:30-35` - `KEY_PREFIXES` config used for validation

  **Acceptance Criteria**:
  - [ ] API keys with non-matching prefix are SAVED to IndexedDB (not blocked)
  - [ ] Amber warning still appears for non-matching prefixes
  - [ ] `onBlur` handler removed from API key input
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Invalid-prefix key persists after reload
    Tool: Playwright (via E2E or dev-browser skill)
    Preconditions: Dev server running, clean IndexedDB
    Steps:
      1. Navigate to /settings
      2. Enter "invalid-prefix-key" in the API key input for OpenAI
      3. Wait 1 second for autosave
      4. Reload the page
      5. Check the API key input value
    Expected Result: The key "invalid-prefix-key" is still present after reload
    Failure Indicators: Key field is empty after reload
    Evidence: .sisyphus/evidence/task-6-settings-persist.png

  Scenario: No duplicate save calls
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run `grep -n 'onBlur' app/settings/page.tsx`
      2. Assert the API key input does NOT have an onBlur handler calling handleChange
    Expected Result: No onBlur handler on API key input
    Failure Indicators: grep finds onBlur with handleChange
    Evidence: .sisyphus/evidence/task-6-no-onblur.txt
  ```

  **Commit**: YES
  - Message: `fix(settings): resolve validation desync and redundant save`
  - Files: `app/settings/page.tsx`
  - Pre-commit: `npm test && npm run build`

- [x] 7. Fix AI SDK v6 .content usage in ChatPanel message handling

  **What to do**:
  This is the most critical bug cluster. AI SDK v6's `UIMessage` uses `.parts` array, not a `.content` property. Three locations in `ChatPanel.tsx` incorrectly access `.content`:

  **Fix 7a - `onFinish` handler (line 94)**:
  The `onFinish` callback saves assistant messages to IndexedDB. Currently uses `(message as any).content` which may be undefined in v6. Fix:
  ```tsx
  onFinish: async (message: any) => {
    try {
      if (message.role !== 'assistant') return

      // Extract text content from parts (v6 compatible)
      const textContent = message.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') ?? ''

      await addMessage(
        listId,
        'assistant',
        textContent,
        message.parts ? JSON.stringify(message.parts) : undefined,
      )
    } catch (err) {
      console.error('[ChatPanel] onFinish error:', err)
    }
  }
  ```

  **Fix 7b - `summarizeToolCalls` function (line 159)**:
  The early return checks `(message as any).content`. In v6, text content is in `.parts`. Fix:
  ```tsx
  function summarizeToolCalls(message: UIMessage): string {
    // Extract text from parts first (v6 compatible)
    const textParts = message.parts?.filter(p => p.type === 'text') ?? []
    const textContent = textParts.map((p: any) => p.text).join('')
    if (textContent) return textContent

    // Fall back to tool call summaries
    const toolParts = message.parts?.filter(p => p.type === 'tool-invocation') ?? []
    // ... rest unchanged
  }
  ```

  **Fix 7c - User message content (line 179)**:
  User messages also use `(message as any).content`. Fix:
  ```tsx
  const content = message.role === 'assistant'
    ? summarizeToolCalls(message)
    : message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || ''
  ```

  **Must NOT do**:
  - Do not restructure the message pipeline or viewMessages useMemo
  - Do not change the useChat integration pattern
  - Do not modify the Message DB type or add migrations
  - Do not clean up `as any` casts beyond these specific fixes
  - Do not change how user messages are sent (handleSend)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Three related fixes in the same file, highest regression risk, needs understanding of AI SDK v6 message format
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8)
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: None (but logically after Wave 1 completes)

  **References**:
  - `src/components/chat/ChatPanel.tsx:85-99` - `onFinish` handler that persists assistant messages. Line 94 uses `(message as any).content` to save to DB
  - `src/components/chat/ChatPanel.tsx:150-188` - `viewMessages` useMemo with `summarizeToolCalls` inner function. Line 159 checks `(message as any).content`, line 179 accesses user message content
  - `src/components/chat/ChatPanel.tsx:22-35` - `parseParts` function shows the correct pattern for extracting content from parts (reference for how to handle the fallback)
  - `src/lib/db/mutations.ts:68-84` - `addMessage` function signature: `(listId, role, content, parts?)` - content must be a string, not undefined
  - `src/lib/db/types.ts:21-28` - `Message` type: `content: string` is required, `parts?: string` is optional
  - AI SDK v6 UIMessage: `.parts` is `Array<{ type: 'text', text: string } | { type: 'tool-invocation', ... }>`, no `.content` property guaranteed

  **Acceptance Criteria**:
  - [ ] `(message as any).content` no longer used in ChatPanel.tsx for message content extraction
  - [ ] All message content extracted from `.parts` array
  - [ ] `addMessage` always receives a string for `content` parameter (not undefined)
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No .content property access in ChatPanel
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run `grep -n '\.content' src/components/chat/ChatPanel.tsx`
      2. Assert no matches reference message.content for text extraction (imports and type references are OK)
      3. Run `grep -n '\.parts' src/components/chat/ChatPanel.tsx`
      4. Assert parts-based extraction exists in onFinish, summarizeToolCalls, and viewMessages
    Expected Result: All message content extracted from .parts, not .content
    Failure Indicators: .content still used for text extraction
    Evidence: .sisyphus/evidence/task-7-content-fix.txt

  Scenario: Build and tests pass after ChatPanel changes
    Tool: Bash
    Preconditions: All fixes applied
    Steps:
      1. Run `npm test` and assert exit 0
      2. Run `npx tsc --noEmit` and assert exit 0
      3. Run `npm run build` and assert exit 0
    Expected Result: All clean
    Failure Indicators: Type errors, test failures, build errors
    Evidence: .sisyphus/evidence/task-7-regression.txt
  ```

  **Commit**: YES
  - Message: `fix(chat): replace deprecated .content with .parts for AI SDK v6`
  - Files: `src/components/chat/ChatPanel.tsx`
  - Pre-commit: `npm test && npm run build`

- [x] 8. Stabilize initialMessages memo dependency in ChatPanel

  **What to do**:
  - In `src/components/chat/ChatPanel.tsx:52-55`, the `initialMessages` useMemo depends on `persistedMessages` from `useLiveQuery`. Since `useLiveQuery` returns a new array reference on every DB change, the memo recomputes unnecessarily.
  - The `hasHydratedRef` guard at line 112-120 prevents actual re-hydration, so this is a performance issue (not correctness), but it should still be fixed for code quality.
  - Fix by stabilizing the dependency using a serialized comparison or by adding a `useRef` to track the previous value:
    ```tsx
    const persistedMessagesRef = useRef<typeof persistedMessages>(undefined)
    const initialMessages = useMemo(() => {
      if (!persistedMessages) return []
      // Only recompute if message IDs actually changed
      const prevIds = persistedMessagesRef.current?.map(m => m.id).join(',')
      const currIds = persistedMessages.map(m => m.id).join(',')
      if (prevIds === currIds && persistedMessagesRef.current) {
        return persistedMessagesRef.current.map(toUIMessage)
      }
      persistedMessagesRef.current = persistedMessages
      return persistedMessages.map(toUIMessage)
    }, [persistedMessages])
    ```
    Alternatively, a simpler approach: use a JSON-serialized key of message IDs as the memo dependency instead of the array reference.

  **Must NOT do**:
  - Do not change the hydration logic (hasHydratedRef pattern)
  - Do not modify how useChat receives messages
  - Do not change the DB hook or useLiveQuery

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single targeted fix, clear scope
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: None

  **References**:
  - `src/components/chat/ChatPanel.tsx:52-55` - Current `initialMessages` useMemo with `persistedMessages` dependency
  - `src/components/chat/ChatPanel.tsx:112-120` - `hasHydratedRef` guard that prevents re-hydration after first load
  - `src/lib/db/hooks.ts:20-24` - `useMessages` hook using `useLiveQuery` which returns new array references on DB changes
  - `src/components/chat/ChatPanel.tsx:80-108` - `useChat` configuration that receives `messages: initialMessages`

  **Acceptance Criteria**:
  - [ ] `initialMessages` memo does not recompute when message content is unchanged (only IDs matter)
  - [ ] `npm test` passes
  - [ ] `npm run build` succeeds

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Memo stabilization doesn't break hydration
    Tool: Bash
    Preconditions: Fix applied
    Steps:
      1. Run `npm test` and assert exit 0
      2. Run `npm run build` and assert exit 0
      3. Verify ChatPanel.tsx has memo stabilization logic (grep for ref or serialized comparison)
    Expected Result: Tests pass, build succeeds, memo uses stable comparison
    Failure Indicators: Test failures, build errors
    Evidence: .sisyphus/evidence/task-8-memo-stable.txt
  ```

  **Commit**: YES
  - Message: `fix(chat): stabilize initialMessages memo dependency`
  - Files: `src/components/chat/ChatPanel.tsx`
  - Pre-commit: `npm test`

- [x] 9. E2E tests for onboarding and list management

  **What to do**:
  - Create `e2e/onboarding.spec.ts` with these test cases:
    1. **Fresh visit shows empty state**: Navigate to `/`, assert "No lists yet" text and "Create your first list" button visible
    2. **Create a list**: Click "+ New List", fill name "Weekend Errands", optionally fill goal, click "Create", assert URL matches `/list/[uuid]`
    3. **List page shows empty todo + chat panels**: On the list page, assert "No items yet" text visible, assert chat input visible
    4. **Missing API key warning shown**: Assert "Missing AI settings" warning visible in chat panel
  - Create `e2e/list-management.spec.ts` with these test cases:
    1. **Created list appears on index**: Create a list, go back to `/`, assert list name visible
    2. **Multiple lists visible**: Create 2 lists, assert both names visible on index
    3. **Click list navigates to detail**: Click a list item, assert URL matches `/list/[uuid]`
    4. **Delete list via options menu**: Click "..." menu on a list, click "Delete" (handle `window.confirm` dialog), assert list removed
    5. **Deleted list's sibling remains**: After deleting one of two lists, assert the other still exists
  - Each test must start with a clean browser context (no cross-test state)
  - Use `page.evaluate(() => indexedDB.deleteDatabase('ai-todo-list'))` for clean state

  **Must NOT do**:
  - Do not test chat functionality here (separate task)
  - Do not test settings here (separate task)
  - Do not use real API keys

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: E2E tests require Playwright expertise, selector knowledge, and understanding of async browser interactions
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1 (Playwright infrastructure must exist)

  **References**:
  - `app/page.tsx:47-53` - Loading state shows "Loading..." text
  - `app/page.tsx:111-122` - Empty state shows "No lists yet." and "Create your first list" button
  - `app/page.tsx:64-109` - Create form: input `placeholder="List name"`, button `type="submit"` with "Create" text
  - `app/page.tsx:124-177` - List items: `div.border.rounded-xl` containing list name, goal, and "..." options button with `aria-label="Options"`
  - `app/page.tsx:150-174` - Options dropdown: "Rename" and "Delete" buttons, Delete uses `window.confirm`
  - `app/list/[id]/page.tsx:14-20` - Loading state and null check for list
  - `scripts/qa-fixed-flows.mjs:17-89` - Onboarding flow reference with working selectors
  - `scripts/qa-fixed-flows.mjs:93-201` - List management flow reference with dialog handler pattern

  **Acceptance Criteria**:
  - [ ] `e2e/onboarding.spec.ts` exists with 4+ test cases
  - [ ] `e2e/list-management.spec.ts` exists with 5+ test cases
  - [ ] `npx playwright test e2e/onboarding.spec.ts` exits 0
  - [ ] `npx playwright test e2e/list-management.spec.ts` exits 0
  - [ ] No real API keys required

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All onboarding E2E tests pass
    Tool: Bash
    Preconditions: Dev server running, Playwright configured
    Steps:
      1. Run `npx playwright test e2e/onboarding.spec.ts` and capture output
      2. Assert all tests pass (0 failures)
      3. Assert at least 4 tests ran
    Expected Result: 4+ onboarding tests pass
    Failure Indicators: Any test failure, timeout, selector not found
    Evidence: .sisyphus/evidence/task-9-onboarding-e2e.txt

  Scenario: List management delete handles confirm dialog
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. Run `npx playwright test e2e/list-management.spec.ts` and capture output
      2. Assert delete test passes (dialog accepted, list removed)
    Expected Result: All list management tests pass including delete with confirm
    Failure Indicators: Dialog not handled, list not removed after delete
    Evidence: .sisyphus/evidence/task-9-list-mgmt-e2e.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add onboarding and list management E2E tests`
  - Files: `e2e/onboarding.spec.ts`, `e2e/list-management.spec.ts`
  - Pre-commit: `npx playwright test e2e/onboarding.spec.ts e2e/list-management.spec.ts`

- [x] 10. E2E tests for settings configuration

  **What to do**:
  - Create `e2e/settings.spec.ts` with these test cases:
    1. **Settings page loads with provider tabs**: Navigate to `/settings`, assert provider buttons visible (OpenAI, Anthropic, Google Gemini, OpenRouter)
    2. **Switch active provider**: Click Anthropic tab, assert it becomes active (blue border), assert model dropdown shows Claude models
    3. **Enter API key and verify saved indicator**: Enter a test key, wait for "Saved" indicator to appear
    4. **API key persists after reload**: Enter key, reload page, assert key is still present in input
    5. **Model selection changes**: Select a different model, verify selection persisted after reload
    6. **Invalid prefix shows warning**: Enter key without correct prefix, assert amber warning appears
    7. **Navigate to settings from list page**: From a list view, click settings gear icon, assert on `/settings`

  **Must NOT do**:
  - Do not test real API connections (no test-connection calls)
  - Do not test Google OAuth flow
  - Do not modify settings page source code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 3, 6 (Playwright setup + settings bugs must be fixed first)

  **References**:
  - `app/settings/page.tsx:9-14` - `MODELS` config with provider-to-model mapping
  - `app/settings/page.tsx:16-21` - `PROVIDER_LABELS` for tab button text
  - `app/settings/page.tsx:143-163` - Provider tab buttons: `button` elements with provider label text, active state has `bg-blue-50 border-blue-500`
  - `app/settings/page.tsx:182-189` - API key input: `type="password"`, placeholder from KEY_PREFIXES
  - `app/settings/page.tsx:197-203` - Model select dropdown with provider-specific options
  - `app/settings/page.tsx:176-178` - Saved indicator: `span` with "Saved" text and `text-green-600`
  - `app/settings/page.tsx:191-195` - Amber warning for wrong prefix: `text-amber-600`
  - `app/settings/page.tsx:233-241` - Test Connection button (DO NOT test actual connections)

  **Acceptance Criteria**:
  - [ ] `e2e/settings.spec.ts` exists with 7+ test cases
  - [ ] `npx playwright test e2e/settings.spec.ts` exits 0
  - [ ] Tests verify persistence via IndexedDB (reload and check)
  - [ ] No real API keys or network calls

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Settings E2E tests all pass
    Tool: Bash
    Preconditions: Dev server running, settings bugs fixed (Tasks 3, 6)
    Steps:
      1. Run `npx playwright test e2e/settings.spec.ts` and capture output
      2. Assert all tests pass (0 failures)
      3. Assert at least 7 tests ran
    Expected Result: 7+ settings tests pass
    Failure Indicators: Test failures, persistence check fails, selector not found
    Evidence: .sisyphus/evidence/task-10-settings-e2e.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add settings configuration E2E tests`
  - Files: `e2e/settings.spec.ts`
  - Pre-commit: `npx playwright test e2e/settings.spec.ts`

- [x] 11. E2E tests for todo CRUD operations

  **What to do**:
  - Create `e2e/todo-crud.spec.ts` with these test cases:
    1. **Add item via AddItemInput**: Navigate to a list, type "Buy milk" in `input[placeholder*="Add"]`, press Enter, assert "Buy milk" text appears
    2. **Complete item**: Click the complete button (`button[aria-label="Mark complete"]`), assert item shows completed styling (opacity-50, line-through on text)
    3. **Uncomplete item**: Click the uncomplete button (`button[aria-label="Mark incomplete"]`), assert active styling restored
    4. **Item persists after reload**: Add item, reload page, assert item still present
    5. **Completed state persists after reload**: Complete item, reload, assert item still shows as completed (in "Completed" section)
    6. **Multiple items maintain order**: Add 3 items, assert they appear in order added
    7. **Completed items move to "Completed" section**: Complete an item, assert "Completed (1)" section header appears, item is under it
    8. **Empty state shows when no items**: On a new list, assert "No items yet" message visible
  - Each test creates a fresh list first (navigate to `/`, create list, navigate to list)

  **Must NOT do**:
  - Do not test chat-based item creation (that's Task 12)
  - Do not test item deletion via API/chat
  - Do not modify source code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1 (Playwright infrastructure)

  **References**:
  - `src/components/todo/AddItemInput.tsx:20-38` - Add input: `input` with `placeholder="Add item..."`, Add button
  - `src/components/todo/TodoItem.tsx:70-97` - Todo item: div with `opacity-50` when completed, text `p` with `line-through text-gray-400` when completed, button with `aria-label="Mark complete"` or `"Mark incomplete"`
  - `src/components/todo/TodoPanel.tsx:18-19` - Items split into `activeItems` and `completedItems` arrays
  - `src/components/todo/TodoPanel.tsx:38-46` - Completed section: div with "Completed ({count})" text
  - `src/components/todo/TodoPanel.tsx:29-32` - Empty state: "No items yet" message
  - `scripts/qa-fixed-flows.mjs:204-344` - Manual todo flow reference with working selectors and assertions

  **Acceptance Criteria**:
  - [ ] `e2e/todo-crud.spec.ts` exists with 8+ test cases
  - [ ] `npx playwright test e2e/todo-crud.spec.ts` exits 0
  - [ ] Tests verify complete/uncomplete toggle and persistence
  - [ ] No real API keys required

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Todo CRUD E2E tests all pass
    Tool: Bash
    Preconditions: Dev server running, Playwright configured
    Steps:
      1. Run `npx playwright test e2e/todo-crud.spec.ts` and capture output
      2. Assert all tests pass (0 failures)
      3. Assert at least 8 tests ran
    Expected Result: 8+ todo CRUD tests pass
    Failure Indicators: Selector not found, assertion failure, timeout
    Evidence: .sisyphus/evidence/task-11-todo-crud-e2e.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add todo CRUD E2E tests`
  - Files: `e2e/todo-crud.spec.ts`
  - Pre-commit: `npx playwright test e2e/todo-crud.spec.ts`

- [x] 12. E2E tests for chat interaction with mocked API

  **What to do**:
  - Create `e2e/chat.spec.ts` with these test cases using `page.route()` to mock `/api/chat`:
    1. **Chat input disabled without API key**: Navigate to a list (no settings), assert chat textarea is disabled, assert "Missing AI settings" warning visible
    2. **Chat input enabled with API key**: Set up settings in IndexedDB (via `page.evaluate`), reload, assert textarea is enabled
    3. **Send message appears in chat**: Type message, press Enter (or click send), assert user bubble appears with message text
    4. **Assistant response appears**: Mock `/api/chat` to return a streamed response, send a message, assert assistant bubble appears
    5. **Tool calls update todo list**: Mock `/api/chat` to return a tool call response (addItems), send message, assert new items appear in todo panel
    6. **Error state displays**: Mock `/api/chat` to return 500, send message, assert error banner appears

  **Mock strategy**: Use `page.route('/api/chat', ...)` to intercept the fetch and return mock streaming responses. The response format must match AI SDK v6's UIMessage stream protocol. The protocol uses single-character prefixes followed by `:` and JSON data. Concrete mock examples:

  **Text-only assistant response:**
  ```
  0:"Hello! I've noted your tasks."
  e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":8}}
  d:{"finishReason":"stop"}
  ```

  **Tool call + text response (for addItems):**
  ```
  b:[{"type":"tool-call","toolCallId":"call_1","toolName":"addItems","args":{"items":[{"text":"Buy milk","metadata":{"priority":"high"}}]}}]
  c:[{"type":"tool-result","toolCallId":"call_1","result":{"success":true,"itemsAdded":1}}]
  0:"Added Buy milk to your list!"
  e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":12}}
  d:{"finishReason":"stop"}
  ```

  **Implementation pattern for route mock:**
  ```ts
  await page.route('/api/chat', async (route) => {
    const body = [
      '0:"Hello! I\'ve noted your tasks."\n',
      'e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":8}}\n',
      'd:{"finishReason":"stop"}\n',
    ].join('')
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body,
    })
  })
  ```

  **IMPORTANT**: The exact stream protocol format may differ slightly between AI SDK minor versions. If the mock examples above don't work, the implementing developer should: (1) start the dev server, (2) send a real chat message with DevTools Network tab open, (3) inspect the actual response body from `/api/chat` to capture the exact format, (4) replicate that format in the mock. The key insight is that `useChat` parses this protocol client-side, so the mock must match what `toUIMessageStreamResponse()` produces.

  **For mocking settings into IndexedDB**:
  ```ts
  await page.evaluate(() => {
    // Open IndexedDB and insert settings directly
    const request = indexedDB.open('ai-todo-list', 2)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({
        id: 'settings',
        activeProvider: 'openai',
        providerConfigs: { openai: { apiKey: 'sk-test-fake', model: 'gpt-4o-mini' } }
      })
    }
  })
  ```

  **Must NOT do**:
  - Do not use real API keys
  - Do not make real network requests to AI providers
  - Do not test the actual AI response quality
  - Do not modify ChatPanel source code

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding of AI SDK v6 streaming format, complex mock setup, and async message flow
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 7, 8 (Playwright setup + ChatPanel bugs must be fixed first)

  **References**:
  - `src/components/chat/ChatPanel.tsx:191-194` - `isMissingApiKey` and `inputDisabled` logic
  - `src/components/chat/ChatPanel.tsx:197-205` - Missing API key warning banner
  - `src/components/chat/ChatPanel.tsx:207-211` - Error state banner
  - `src/components/chat/ChatPanel.tsx:122-148` - `handleSend` function that calls `chat.sendMessage` with body containing messages and settings
  - `app/api/chat/route.ts:54-61` - The API route uses `streamText` and returns `result.toUIMessageStreamResponse()`
  - `app/api/chat/route.integration.test.ts:6-16` - Integration test proving `toUIMessageStreamResponse` method exists on `streamText` result (does NOT show the actual stream format - see mock examples in "What to do" above for the protocol format)
  - `app/api/chat/route.test.ts:7-9` - Shows the mock returning `new Response('streamed text')` which is NOT the real format. The real format uses the AI SDK UI stream protocol with single-char prefixes (see concrete examples above)
  - `src/components/chat/ChatInput.tsx:24-29` - Enter key sends message, textarea has placeholder "Brain dump your tasks..."
  - `src/components/chat/ChatBubble.tsx:12-23` - User bubbles: `bg-blue-500 text-white`, Assistant bubbles: `bg-gray-100 text-gray-900`

  **Acceptance Criteria**:
  - [ ] `e2e/chat.spec.ts` exists with 6+ test cases
  - [ ] `npx playwright test e2e/chat.spec.ts` exits 0
  - [ ] All tests use `page.route()` for API mocking (no real API calls)
  - [ ] Tests verify both happy path (message send/receive) and error states
  - [ ] Tool call test verifies todo list updates in real-time

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chat E2E tests all pass with mocked API
    Tool: Bash
    Preconditions: Dev server running, ChatPanel bugs fixed (Tasks 7, 8)
    Steps:
      1. Run `npx playwright test e2e/chat.spec.ts` and capture output
      2. Assert all tests pass (0 failures)
      3. Assert at least 6 tests ran
      4. Verify no real network calls to AI providers in test output
    Expected Result: 6+ chat tests pass using mocked API
    Failure Indicators: Network timeout (real API call), mock not intercepted, assertion failure
    Evidence: .sisyphus/evidence/task-12-chat-e2e.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add chat interaction E2E tests with mocked API`
  - Files: `e2e/chat.spec.ts`
  - Pre-commit: `npx playwright test e2e/chat.spec.ts`

- [x] 13. Remove ad-hoc QA scripts and verify full test suite

  **What to do**:
  - Delete the 3 ad-hoc QA scripts that are now replaced by the proper Playwright test suite:
    - `scripts/qa-all-flows.mjs`
    - `scripts/qa-fixed-flows.mjs`
    - `scripts/qa-flow1.mjs`
  - Delete the `scripts/` directory if empty after removal
  - Run the complete test suite to verify everything works together:
    ```bash
    npm test && npx playwright test && npx tsc --noEmit && npm run lint && npm run build
    ```
  - Capture final test counts: unit tests (48 + new), E2E tests (total), build status

  **Must NOT do**:
  - Do not delete any other scripts or files
  - Do not modify test files
  - Do not add new tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential - after all other tasks)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

  **References**:
  - `scripts/qa-all-flows.mjs` - 810-line ad-hoc QA script with 6 flows (now covered by e2e/ tests)
  - `scripts/qa-fixed-flows.mjs` - 362-line fixed version of flows 1, 3, 4
  - `scripts/qa-flow1.mjs` - 99-line standalone onboarding flow test

  **Acceptance Criteria**:
  - [ ] `scripts/qa-all-flows.mjs` deleted
  - [ ] `scripts/qa-fixed-flows.mjs` deleted
  - [ ] `scripts/qa-flow1.mjs` deleted
  - [ ] `npm test` passes (all unit tests)
  - [ ] `npx playwright test` passes (all E2E tests)
  - [ ] `npx tsc --noEmit` passes
  - [ ] `npm run lint` passes
  - [ ] `npm run build` succeeds

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full test suite passes after cleanup
    Tool: Bash
    Preconditions: All previous tasks completed
    Steps:
      1. Verify `scripts/` directory is empty or doesn't exist
      2. Run `npm test` - capture test count and result
      3. Run `npx playwright test` - capture test count and result
      4. Run `npx tsc --noEmit` - assert exit 0
      5. Run `npm run lint` - assert exit 0
      6. Run `npm run build` - assert exit 0
    Expected Result: All 5 verification commands pass, scripts removed
    Failure Indicators: Any command fails, scripts still exist
    Evidence: .sisyphus/evidence/task-13-final-suite.txt

  Scenario: No references to deleted QA scripts in source/config files
    Tool: Bash
    Preconditions: Scripts deleted
    Steps:
      1. Run `grep -r 'qa-all-flows\|qa-fixed-flows\|qa-flow1' src/ app/ e2e/ package.json` (searches only source, app, e2e, and package.json - avoids .sisyphus/ which references them historically in plan docs)
      2. Assert exit code is 1 (no matches found) or output is empty
    Expected Result: Zero matches in production source code, test files, or package config
    Failure Indicators: Any match found in src/, app/, e2e/, or package.json
    Evidence: .sisyphus/evidence/task-13-no-refs.txt
  ```

  **Commit**: YES
  - Message: `chore: remove ad-hoc QA scripts replaced by Playwright test suite`
  - Files: `scripts/qa-all-flows.mjs`, `scripts/qa-fixed-flows.mjs`, `scripts/qa-flow1.mjs`
  - Pre-commit: `npm test && npx playwright test`

---

## Final Verification Wave (MANDATORY - after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** - `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns - reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** - `unspecified-high`
  Run `tsc --noEmit` + linter + `npm test` + `npx playwright test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Unit Tests [N pass/N fail] | E2E Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** - `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task - follow exact steps, capture evidence. Test cross-task integration (bug fixes working together). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** - `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 - everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Phase | Commit Message | Files | Pre-commit |
|-------|---------------|-------|------------|
| Wave 1 | `chore: set up Playwright test infrastructure with @playwright/test` | playwright.config.ts, package.json, e2e/ | npm test |
| Wave 1 | `fix: correct indentation anomaly in prompts.ts` | prompts.ts | npm test |
| Wave 1 | `fix(settings): remove unused GoogleSignInButton import` | settings/page.tsx | npm test && tsc --noEmit |
| Wave 1 | `refactor: extract useMediaQuery hook from SplitScreen` | src/hooks/useMediaQuery.ts, SplitScreen.tsx, useMediaQuery.test.ts | npm test |
| Wave 1 | `test: add unit tests for addMessage mutation and edge cases` | mutations.test.ts | npm test |
| Wave 2 | `fix(settings): resolve validation desync and redundant save` | settings/page.tsx | npm test && npm run build |
| Wave 2 | `fix(chat): replace deprecated .content with .parts for AI SDK v6` | ChatPanel.tsx | npm test && npm run build |
| Wave 2 | `fix(chat): stabilize initialMessages memo dependency` | ChatPanel.tsx | npm test |
| Wave 3 | `test(e2e): add onboarding and list management E2E tests` | e2e/ | npx playwright test |
| Wave 3 | `test(e2e): add settings configuration E2E tests` | e2e/ | npx playwright test |
| Wave 3 | `test(e2e): add todo CRUD E2E tests` | e2e/ | npx playwright test |
| Wave 3 | `test(e2e): add chat interaction E2E tests with mocked API` | e2e/ | npx playwright test |
| Wave 4 | `chore: remove ad-hoc QA scripts replaced by Playwright suite` | scripts/ | npm test && npx playwright test |

---

## Success Criteria

### Verification Commands
```bash
npm test                      # Expected: all tests pass (48 existing + new)
npx playwright test           # Expected: all E2E tests pass, 0 failures
npx tsc --noEmit              # Expected: no errors
npm run lint                  # Expected: no warnings or errors  
npm run build                 # Expected: clean production build
```

### Final Checklist
- [ ] All 8+ bugs fixed with corresponding regression tests
- [ ] Playwright test infrastructure fully configured
- [ ] E2E tests cover 5 user flows without real API keys
- [ ] No ad-hoc QA scripts remain (replaced by proper test suite)
- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" items absent
- [ ] All existing 48 tests still pass
