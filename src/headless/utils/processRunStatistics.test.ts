import { describe, expect, it } from 'vitest'
import type { ProcessRunStatistics } from 'thefactory-tools/types'

import { processStatisticsLine, processStatisticsRows } from './processRunStatistics'

const stats = (over: Partial<ProcessRunStatistics> = {}): ProcessRunStatistics => ({
  definitionId: 'story-default',
  definitionVersion: 2,
  runCount: 12,
  firstPassRate: 0.583,
  medianIterations: 2,
  medianCostUsd: 1.5,
  costSampleCount: 12,
  ...over,
})

describe('processStatisticsRows', () => {
  it('lists a process’s versions, newest first, leaving others out', () => {
    const rows = processStatisticsRows(
      [
        stats({ definitionVersion: 1, runCount: 3 }),
        stats({ definitionVersion: 3, runCount: 1 }),
        stats({ definitionId: 'other', definitionVersion: 9 }),
      ],
      'story-default',
    )
    expect(rows.map((r) => r.version)).toEqual(['v3', 'v1'])
  })

  it('says each measure in words', () => {
    expect(processStatisticsRows([stats()], 'story-default')[0]).toEqual({
      version: 'v2',
      runs: '12 runs',
      firstPass: '58% first pass',
      iterations: '2 attempts',
      cost: '$1.50 a run',
    })
  })

  it('says a single run and a single attempt as one', () => {
    const row = processStatisticsRows(
      [stats({ runCount: 1, medianIterations: 1 })],
      'story-default',
    )[0]
    expect(row?.runs).toBe('1 run')
    expect(row?.iterations).toBe('1 attempt')
  })

  it('keeps the half of a median between two counts', () => {
    expect(
      processStatisticsRows([stats({ medianIterations: 1.5 })], 'story-default')[0]?.iterations,
    ).toBe('1.5 attempts')
  })

  it('leaves the cost out when no run stated a charge', () => {
    const row = processStatisticsRows(
      [stats({ costSampleCount: 0, medianCostUsd: undefined })],
      'story-default',
    )[0]
    expect(row?.cost).toBeUndefined()
  })

  it('says a free run’s cost, a charge of zero included', () => {
    expect(
      processStatisticsRows([stats({ medianCostUsd: 0, costSampleCount: 2 })], 'story-default')[0]
        ?.cost,
    ).toBe('$0.00 a run')
  })
})

describe('processStatisticsLine', () => {
  it('is the newest version’s measures on one line', () => {
    expect(
      processStatisticsLine(
        [stats({ definitionVersion: 1, runCount: 3 }), stats()],
        'story-default',
      ),
    ).toBe('12 runs · 58% first pass · 2 attempts · $1.50 a run')
  })

  it('reads the version asked for, when it has run', () => {
    expect(
      processStatisticsLine(
        [stats({ definitionVersion: 1, runCount: 3 }), stats()],
        'story-default',
        1,
      ),
    ).toMatch(/^3 runs/)
  })

  it('is nothing for a process with no ended runs', () => {
    expect(processStatisticsLine([], 'story-default')).toBeUndefined()
    expect(processStatisticsLine([stats({ runCount: 0 })], 'story-default')).toBeUndefined()
  })

  it('is nothing for a version that has not run', () => {
    expect(processStatisticsLine([stats()], 'story-default', 9)).toBeUndefined()
  })
})
