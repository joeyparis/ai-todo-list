# Issues - testing-deep-dive

## Known Issues to Fix
1. `scripts/qa-flow1.mjs:99` - LSP error: forEach callback returns a value (not a blocker for this plan, will be deleted in Task 13)

## Risks
- AI SDK stream protocol: concrete mock format provided in plan but may need adjustment if SDK version changed format slightly
- `happy-dom` may not be in devDependencies - Task 4 agent should install if needed
- Playwright browser install: `npx playwright install chromium` required after package swap
