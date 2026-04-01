# Issues - testing-deep-dive

## Known Issues to Fix
1. `scripts/qa-flow1.mjs:99` - LSP error: forEach callback returns a value (not a blocker for this plan, will be deleted in Task 13)

## Risks
- AI SDK stream protocol: concrete mock format provided in plan but may need adjustment if SDK version changed format slightly
- `happy-dom` may not be in devDependencies - Task 4 agent should install if needed
- Playwright browser install: `npx playwright install chromium` required after package swap

## Audit Findings - 2026-04-01
- `e2e/smoke.spec.ts:3-5` does not clear IndexedDB or use the shared clean-state pattern, so not every E2E test file starts from an explicit clean browser state.
- `e2e/chat.spec.ts:133-148` only verifies that a mocked request completes without an error banner; it does not assert assistant text rendering from streamed `parts` data or any tool-call driven todo update, so the ChatPanel `.content` to `.parts` regression is not directly covered.

## Audit Re-run - 2026-04-01
- Re-checked `src/hooks/useMediaQuery.test.ts`: now 6 behavioral tests using `createRoot` + `act`, covering initial false, `matchMedia` query call, listener registration, reactive updates, cleanup on unmount, and initial true.
- Re-checked `e2e/chat.spec.ts`: all `/api/chat` traffic is mocked with `page.route()` using a default `beforeEach` mock plus per-test overrides, so the spec does not depend on a live chat API.
- Verified supporting Playwright deliverables still comply: `package.json` uses `@playwright/test`, includes `test:e2e`, `.gitignore` includes `playwright-report/`, `test-results/`, and `e2e-results/`, `scripts/` is absent, and `e2e/` contains 6 spec files.
