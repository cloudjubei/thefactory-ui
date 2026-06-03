import { describe, it, expect } from 'vitest'
import type { DataSource } from '../api/generated'
import {
  emptySourceForm,
  sourceToForm,
  formToSourceInput,
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
