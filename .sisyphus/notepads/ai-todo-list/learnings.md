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
