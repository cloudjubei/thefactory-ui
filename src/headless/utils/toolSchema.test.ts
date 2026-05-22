import { describe, expect, it } from 'vitest'
import { coerceValue, getProperties, getRequired, groupByCategory } from './toolSchema'

describe('getProperties', () => {
  it('returns the properties map', () => {
    expect(getProperties({ properties: { a: { type: 'string' } } })).toEqual({
      a: { type: 'string' },
    })
  })
  it('returns {} for missing / malformed input', () => {
    expect(getProperties(undefined)).toEqual({})
    expect(getProperties(null)).toEqual({})
    expect(getProperties({})).toEqual({})
    expect(getProperties({ properties: 'nope' })).toEqual({})
  })
})

describe('getRequired', () => {
  it('returns the required field set', () => {
    expect([...getRequired({ required: ['a', 'b'] })]).toEqual(['a', 'b'])
  })
  it('returns an empty set for missing / malformed input', () => {
    expect(getRequired(undefined).size).toBe(0)
    expect(getRequired({ required: 'a' }).size).toBe(0)
  })
  it('filters non-string entries', () => {
    expect([...getRequired({ required: ['a', 3, null] })]).toEqual(['a'])
  })
})

describe('coerceValue', () => {
  it('coerces booleans', () => {
    expect(coerceValue({ type: 'boolean' }, true)).toBe(true)
    expect(coerceValue({ type: 'boolean' }, '')).toBe(false)
  })
  it('coerces numbers, returning undefined for blanks / non-numerics', () => {
    expect(coerceValue({ type: 'number' }, '42')).toBe(42)
    expect(coerceValue({ type: 'integer' }, '')).toBeUndefined()
    expect(coerceValue({ type: 'number' }, 'abc')).toBeUndefined()
  })
  it('splits arrays on commas', () => {
    expect(coerceValue({ type: 'array' }, 'a, b ,c')).toEqual(['a', 'b', 'c'])
  })
  it('types array items per items.type', () => {
    expect(coerceValue({ type: 'array', items: { type: 'number' } }, '1, 2, x')).toEqual([1, 2])
    expect(coerceValue({ type: 'array', items: { type: 'boolean' } }, 'true, false')).toEqual([
      true,
      false,
    ])
  })
  it('parses object JSON, keeping the raw string on parse failure', () => {
    expect(coerceValue({ type: 'object' }, '{"a":1}')).toEqual({ a: 1 })
    expect(coerceValue({ type: 'object' }, '')).toEqual({})
    expect(coerceValue({ type: 'object' }, '{bad')).toBe('{bad')
  })
  it('passes strings through unchanged', () => {
    expect(coerceValue({ type: 'string' }, 'hello')).toBe('hello')
    expect(coerceValue(undefined, 'hello')).toBe('hello')
  })
})

describe('groupByCategory', () => {
  const tools = [
    { name: 'writeFile', description: 'Write a file', category: 'files' },
    { name: 'readFile', description: 'Read a file', category: 'files' },
    { name: 'runTests', description: 'Run the test suite', category: 'tests' },
    { name: 'misc', description: 'Uncategorised helper' },
  ]

  it('buckets tools by category, defaulting to general', () => {
    const groups = groupByCategory(tools, '')
    expect(groups.map((g) => g.category)).toEqual(['files', 'general', 'tests'])
    expect(groups[0].items.map((t) => t.name)).toEqual(['readFile', 'writeFile'])
  })

  it('filters by name / description / category', () => {
    expect(groupByCategory(tools, 'tests').map((g) => g.category)).toEqual(['tests'])
    expect(groupByCategory(tools, 'write').flatMap((g) => g.items.map((t) => t.name))).toEqual([
      'writeFile',
    ])
    expect(groupByCategory(tools, 'helper').flatMap((g) => g.items.map((t) => t.name))).toEqual([
      'misc',
    ])
  })

  it('returns an empty list when nothing matches', () => {
    expect(groupByCategory(tools, 'zzz')).toEqual([])
  })
})
