import { describe, it, expect } from 'vitest'
import type { DataSource } from '../api/generated'
import {
  emptySourceForm,
  sourceToForm,
  formToSourceInput,
  formToSourcePatch,
  isTaskSource,
  validateSourceForm,
  humanizeMs,
  isSourceFresh,
} from './liveDataForm.js'

const SOURCE: DataSource = {
  id: 's1',
  name: 'US prices',
  recordType: 'stock-quote',
  freshness: 86_400_000,
  autoUpdate: true,
  adapter: {
    fetch: { url: 'https://x.test/p', method: 'GET' },
    itemsPath: 'data',
    kind: 'sample',
    map: { key: 'symbol', value: 'price', time: 'asOf' },
  },
  historyCap: 30,
  createdAt: 't',
  updatedAt: 't',
  lastRefreshedAt: '2026-06-01T00:00:00.000Z',
}

describe('sourceToForm / formToSourceInput', () => {
  it('round-trips a source through the form', () => {
    const form = sourceToForm(SOURCE)
    expect(form).toMatchObject({
      name: 'US prices',
      recordType: 'stock-quote',
      freshnessValue: '1',
      freshnessUnit: 'days',
      autoUpdate: true,
      url: 'https://x.test/p',
      method: 'GET',
      itemsPath: 'data',
      kind: 'sample',
      mapKey: 'symbol',
      mapValue: 'price',
      mapTime: 'asOf',
      historyCap: '30',
    })

    const input = formToSourceInput(form)
    expect(input).toEqual({
      name: 'US prices',
      recordType: 'stock-quote',
      freshness: 86_400_000,
      autoUpdate: true,
      adapter: {
        fetch: { url: 'https://x.test/p', method: 'GET' },
        itemsPath: 'data',
        kind: 'sample',
        map: { key: 'symbol', value: 'price', time: 'asOf' },
      },
      historyCap: 30,
    })
  })

  it('converts hours/minutes freshness units to ms', () => {
    expect(
      formToSourceInput({ ...emptySourceForm(), freshnessValue: '6', freshnessUnit: 'hours' })
        .freshness,
    ).toBe(21_600_000)
    expect(
      formToSourceInput({ ...emptySourceForm(), freshnessValue: '30', freshnessUnit: 'minutes' })
        .freshness,
    ).toBe(1_800_000)
  })

  it('omits optional adapter fields and historyCap when blank', () => {
    const input = formToSourceInput({
      ...emptySourceForm(),
      name: 'n',
      recordType: 't',
      url: 'https://a',
      itemsPath: 'items',
      kind: 'snapshot',
      mapKey: 'id',
    })
    expect(input.adapter.fetch.method).toBeUndefined()
    expect(input.adapter.map).toEqual({ key: 'id' })
    expect(input.historyCap).toBeUndefined()
  })
})

describe('validateSourceForm', () => {
  it('passes a complete sample form', () => {
    expect(validateSourceForm(sourceToForm(SOURCE))).toBeNull()
  })

  it('rejects a missing name / bad url / missing key', () => {
    expect(validateSourceForm(emptySourceForm())).toMatch(/name/i)
    const f = { ...emptySourceForm(), name: 'n', recordType: 't', url: 'ftp://x' }
    expect(validateSourceForm(f)).toMatch(/http/i)
  })

  it('requires a map value for sample sources only', () => {
    const base = {
      ...emptySourceForm(),
      name: 'n',
      recordType: 't',
      url: 'https://a',
      itemsPath: 'i',
      mapKey: 'k',
    }
    expect(validateSourceForm({ ...base, kind: 'sample', mapValue: '' })).toMatch(/value/i)
    expect(validateSourceForm({ ...base, kind: 'snapshot', mapValue: '' })).toBeNull()
  })
})

describe('humanizeMs', () => {
  it('formats common windows', () => {
    expect(humanizeMs(86_400_000)).toBe('1d')
    expect(humanizeMs(21_600_000)).toBe('6h')
    expect(humanizeMs(1_800_000)).toBe('30m')
  })
})

describe('isSourceFresh', () => {
  it('is fresh within the window, stale past it, false when never refreshed', () => {
    const now = new Date('2026-06-01T12:00:00.000Z').getTime()
    expect(isSourceFresh(SOURCE, now)).toBe(true)
    expect(isSourceFresh(SOURCE, now + 86_400_000)).toBe(false)
    expect(isSourceFresh({ ...SOURCE, lastRefreshedAt: undefined }, now)).toBe(false)
  })
})

const TASK_SOURCE: DataSource = {
  id: 'wargames:official-sources',
  name: 'Official sources',
  recordType: 'official-source-report',
  freshness: 7 * 86_400_000,
  autoUpdate: false,
  projectId: 'wargames',
  adapter: {
    itemsPath: 'items',
    kind: 'snapshot',
    map: { key: 'key' },
    task: { script: 'monitor:sources', args: ['--json'] },
  },
  createdAt: 't',
  updatedAt: 't',
}

describe('task sources', () => {
  it('tells a task source from a fetch source', () => {
    expect(isTaskSource(TASK_SOURCE)).toBe(true)
    expect(isTaskSource(SOURCE)).toBe(false)
  })

  it('reads a task source into the form with its script and no URL', () => {
    expect(sourceToForm(TASK_SOURCE)).toMatchObject({
      adapterKind: 'task',
      taskScript: 'monitor:sources --json',
      name: 'Official sources',
      freshnessValue: '7',
      freshnessUnit: 'days',
      autoUpdate: false,
      url: '',
      method: '',
      itemsPath: 'items',
      kind: 'snapshot',
      mapKey: 'key',
    })
  })

  it('reads a script with no arguments', () => {
    const noArgs: DataSource = {
      ...TASK_SOURCE,
      adapter: { itemsPath: 'items', map: { key: 'key' }, task: { script: 'monitor:sources' } },
    }
    expect(sourceToForm(noArgs).taskScript).toBe('monitor:sources')
  })

  it('marks a fetch source as fetch with no script', () => {
    expect(sourceToForm(SOURCE)).toMatchObject({ adapterKind: 'fetch', taskScript: '' })
    expect(emptySourceForm()).toMatchObject({ adapterKind: 'fetch', taskScript: '' })
  })

  it('validates only the schedule of a task source', () => {
    const form = sourceToForm(TASK_SOURCE)
    expect(validateSourceForm(form)).toBeNull()
    expect(validateSourceForm({ ...form, name: '', mapKey: '' })).toBeNull()
    expect(validateSourceForm({ ...form, freshnessValue: '0' })).toMatch(/freshness/i)
    expect(validateSourceForm({ ...form, freshnessValue: 'x' })).toMatch(/freshness/i)
  })

  it('saves only freshness and auto-update for a task source', () => {
    const form = { ...sourceToForm(TASK_SOURCE), freshnessValue: '1', autoUpdate: true }
    expect(formToSourcePatch(form)).toEqual({ freshness: 86_400_000, autoUpdate: true })
  })

  it('saves the whole source for a fetch source', () => {
    const form = sourceToForm(SOURCE)
    expect(formToSourcePatch(form)).toEqual(formToSourceInput(form))
  })
})
