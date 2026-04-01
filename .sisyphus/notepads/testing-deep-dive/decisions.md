# Decisions - testing-deep-dive

## Wave 1 - Parallel (Tasks 1-5)
All Wave 1 tasks are independent and can run simultaneously.

## Bug Fix Decisions
- Bug 4 (settings desync): Use Option A - remove the early return so keys ALWAYS save to DB. Prefix validation is advisory (amber warning). This ensures UI and DB stay in sync.
- Bug 5 (redundant save): Simply remove the `onBlur` handler from the API key input. Don't add debounce.
- Bug 6 (useMediaQuery): Extract to `src/hooks/useMediaQuery.ts`. Test with `// @vitest-environment happy-dom` per-file directive.

## Test Architecture
- Unit tests: Vitest (existing framework, no change)
- E2E tests: `@playwright/test` replacing raw `playwright` package  
- No React Testing Library / jsdom component tests (out of scope)
- Chromium only for E2E (not Firefox/WebKit)

## Task 2 and 3 commit together
Tasks 2 (indentation fix) and 3 (remove unused import) share the same commit message and should be committed together.
