import 'fake-indexeddb/auto'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { todoTools } from '../src/lib/llm/tools'

const results: string[] = []

function log(msg: string) {
  console.log(msg)
  results.push(msg)
}

log('=== LLM Tools Zod Validation Tests ===\n')

// Test 1: addItems - valid input
log('Test 1: addItems with valid input')
try {
  const schema = todoTools.addItems.parameters
  const validInput = {
    items: [
      { text: 'Buy groceries', metadata: { priority: 'high' } },
      { text: 'Call mom' },
    ],
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 2: addItems - invalid input (empty text)
log('Test 2: addItems with invalid input (empty text)')
try {
  const schema = todoTools.addItems.parameters
  const invalidInput = {
    items: [{ text: '' }],
  }
  schema.parse(invalidInput)
  log('✗ FAIL: Should have rejected empty text\n')
} catch (e) {
  if (e instanceof z.ZodError) {
    log(`✓ PASS: Correctly rejected - ${e.errors[0].message}\n`)
  } else {
    log(`✗ FAIL: Wrong error type\n`)
  }
}

// Test 3: completeItems - valid input
log('Test 3: completeItems with valid input')
try {
  const schema = todoTools.completeItems.parameters
  const validInput = {
    itemIds: ['id-1', 'id-2'],
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 4: completeItems - invalid input (empty array)
log('Test 4: completeItems with invalid input (empty array)')
try {
  const schema = todoTools.completeItems.parameters
  const invalidInput = {
    itemIds: [],
  }
  schema.parse(invalidInput)
  log('✗ FAIL: Should have rejected empty array\n')
} catch (e) {
  if (e instanceof z.ZodError) {
    log(`✓ PASS: Correctly rejected - ${e.errors[0].message}\n`)
  } else {
    log(`✗ FAIL: Wrong error type\n`)
  }
}

// Test 5: uncompleteItems - valid input
log('Test 5: uncompleteItems with valid input')
try {
  const schema = todoTools.uncompleteItems.parameters
  const validInput = {
    itemIds: ['id-1'],
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 6: updateItem - valid input with text only
log('Test 6: updateItem with valid input (text only)')
try {
  const schema = todoTools.updateItem.parameters
  const validInput = {
    itemId: 'id-1',
    text: 'Updated task',
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 7: updateItem - valid input with metadata only
log('Test 7: updateItem with valid input (metadata only)')
try {
  const schema = todoTools.updateItem.parameters
  const validInput = {
    itemId: 'id-1',
    metadata: { priority: 'low' },
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 8: updateItem - invalid input (empty text)
log('Test 8: updateItem with invalid input (empty text)')
try {
  const schema = todoTools.updateItem.parameters
  const invalidInput = {
    itemId: 'id-1',
    text: '',
  }
  schema.parse(invalidInput)
  log('✗ FAIL: Should have rejected empty text\n')
} catch (e) {
  if (e instanceof z.ZodError) {
    log(`✓ PASS: Correctly rejected - ${e.errors[0].message}\n`)
  } else {
    log(`✗ FAIL: Wrong error type\n`)
  }
}

// Test 9: deleteItems - valid input
log('Test 9: deleteItems with valid input')
try {
  const schema = todoTools.deleteItems.parameters
  const validInput = {
    itemIds: ['id-1', 'id-2', 'id-3'],
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 10: deleteItems - invalid input (empty array)
log('Test 10: deleteItems with invalid input (empty array)')
try {
  const schema = todoTools.deleteItems.parameters
  const invalidInput = {
    itemIds: [],
  }
  schema.parse(invalidInput)
  log('✗ FAIL: Should have rejected empty array\n')
} catch (e) {
  if (e instanceof z.ZodError) {
    log(`✓ PASS: Correctly rejected - ${e.errors[0].message}\n`)
  } else {
    log(`✗ FAIL: Wrong error type\n`)
  }
}

// Test 11: addAndCompleteItems - valid input
log('Test 11: addAndCompleteItems with valid input')
try {
  const schema = todoTools.addAndCompleteItems.parameters
  const validInput = {
    items: [
      { text: 'Already walked the dog' },
      { text: 'Picked up dry cleaning', metadata: { location: 'downtown' } },
    ],
  }
  schema.parse(validInput)
  log('✓ PASS: Valid input accepted\n')
} catch (e) {
  log(`✗ FAIL: ${e}\n`)
}

// Test 12: Verify all 6 tools exist
log('Test 12: Verify all 6 tools exist')
const toolNames = Object.keys(todoTools)
const expectedTools = ['addItems', 'completeItems', 'uncompleteItems', 'updateItem', 'deleteItems', 'addAndCompleteItems']
const allPresent = expectedTools.every(name => toolNames.includes(name))
if (allPresent && toolNames.length === 6) {
  log(`✓ PASS: All 6 tools present: ${toolNames.join(', ')}\n`)
} else {
  log(`✗ FAIL: Expected 6 tools, got ${toolNames.length}: ${toolNames.join(', ')}\n`)
}

log('=== Test Summary ===')
const passCount = results.filter(r => r.includes('✓ PASS')).length
const failCount = results.filter(r => r.includes('✗ FAIL')).length
log(`Passed: ${passCount}`)
log(`Failed: ${failCount}`)

// Write to evidence file
const evidencePath = path.join(process.cwd(), '.sisyphus/evidence/task-4-tools-validation.txt')
fs.writeFileSync(evidencePath, results.join('\n'))
log(`\nResults written to ${evidencePath}`)
