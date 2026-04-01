# Issues

(none yet)

## 2026-04-01 Plan compliance audit
- Build verification was order-sensitive: 'npx tsc --noEmit' failed before a build because tsconfig includes '.next/types/**/*.ts' (tsconfig.json:35), which does not exist on a clean state.
- After clearing .next and running 'npm run build', the production build succeeded.
