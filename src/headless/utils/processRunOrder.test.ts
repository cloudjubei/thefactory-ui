import { describe, expect, it } from 'vitest'

import { compareRunsNewestFirst } from './processRunOrder'

type Row = { id: string; startedAt?: number | null }

const order = (rows: Row[]) =>
  rows
    .slice()
    .sort(compareRunsNewestFirst)
    .map((r) => r.id)

describe('compareRunsNewestFirst', () => {
  it('puts the latest start first when every run has started', () => {
    expect(
      order([
        { id: 'a', startedAt: 10 },
        { id: 'c', startedAt: 30 },
        { id: 'b', startedAt: 20 },
      ]),
    ).toEqual(['c', 'b', 'a'])
  })

  it('puts a run with no start yet ahead of every started run — a pending run is the newest', () => {
    expect(
      order([{ id: 'old', startedAt: 10 }, { id: 'pending' }, { id: 'new', startedAt: 50 }]),
    ).toEqual(['pending', 'new', 'old'])
  })

  it('treats a null start as not started', () => {
    expect(
      order([
        { id: 'started', startedAt: 5 },
        { id: 'none', startedAt: null },
      ]),
    ).toEqual(['none', 'started'])
  })

  it('keeps several unstarted runs first, in the order they came', () => {
    expect(
      order([{ id: 'x', startedAt: 1 }, { id: 'p1' }, { id: 'y', startedAt: 2 }, { id: 'p2' }]),
    ).toEqual(['p1', 'p2', 'y', 'x'])
  })

  it('keeps runs that started at the same moment in the order they came', () => {
    expect(
      order([
        { id: 'first', startedAt: 7 },
        { id: 'second', startedAt: 7 },
        { id: 'later', startedAt: 9 },
      ]),
    ).toEqual(['later', 'first', 'second'])
  })

  it('reads a start at 0 as started, not as missing', () => {
    expect(order([{ id: 'zero', startedAt: 0 }, { id: 'pending' }])).toEqual(['pending', 'zero'])
    expect(compareRunsNewestFirst({ startedAt: 0 }, { startedAt: 0 })).toBe(0)
    expect(compareRunsNewestFirst({}, {})).toBe(0)
  })
})
