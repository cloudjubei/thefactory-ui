import { describe, expect, it } from 'vitest'
import type { AccessRecord } from 'thefactory-tools/types'

import {
  accessRecordProjectNames,
  accessRecordSection,
  accessRecordsUnder,
  formatAccessRecordAt,
} from './accessRecordView'

function entry(over: Partial<AccessRecord> = {}): AccessRecord {
  return {
    who: 'agent',
    what: 'cross-project read',
    targetProjectId: 'thefactory-backend',
    tool: 'readPaths',
    why: 'Reads are allowed across projects.',
    at: Date.UTC(2026, 10, 4, 8, 44),
    ...over,
  }
}

describe('formatAccessRecordAt', () => {
  it('prints the instant in UTC', () => {
    expect(formatAccessRecordAt(Date.UTC(2026, 10, 4, 8, 44))).toBe('4 Nov 2026, 08:44 UTC')
  })
})

describe('accessRecordSection', () => {
  it('is absent when nothing was recorded', () => {
    expect(accessRecordSection(undefined)).toBeUndefined()
    expect(accessRecordSection([])).toBeUndefined()
  })

  it('lays a record out in words, oldest first, and names a known project', () => {
    const section = accessRecordSection(
      [
        entry({
          tool: 'sign-off',
          what: 'sign-off',
          who: 'person',
          at: Date.UTC(2026, 10, 4, 9, 0),
        }),
        entry(),
      ],
      { 'thefactory-backend': 'Factory Backend' },
    )
    expect(section?.title).toBe('Access')
    expect(section?.summary).toBe('2 records')
    expect(section?.rows.map((row) => row.tool)).toEqual(['readPaths', 'sign-off'])
    expect(section?.rows[0]).toMatchObject({
      who: 'An agent',
      what: 'cross-project read',
      target: 'Factory Backend (thefactory-backend)',
      why: 'Reads are allowed across projects.',
      when: '4 Nov 2026, 08:44 UTC',
    })
    expect(section?.rows[1]?.who).toBe('You')
  })

  it('says one record in the singular and keeps an unknown who as stored', () => {
    const section = accessRecordSection([entry({ who: 'verifier' })])
    expect(section?.summary).toBe('1 record')
    expect(section?.rows[0]?.who).toBe('verifier')
  })

  it('names the manager and leaves a project id as it is when no title is known', () => {
    const section = accessRecordSection([
      entry({ who: 'manager', targetProjectId: 'thefactory-ui' }),
    ])
    expect(section?.rows[0]).toMatchObject({
      who: 'The manager',
      target: 'thefactory-ui',
    })
  })

  it('drops an exact duplicate and a value that is not a record', () => {
    const section = accessRecordSection([entry(), entry(), { who: ' ' } as AccessRecord])
    expect(section?.rows).toHaveLength(1)
  })

  it('keeps two records that happened at the same time in the order they were given', () => {
    const section = accessRecordSection([
      entry({ tool: 'listStories', at: 5 }),
      entry({ tool: 'getStory', at: 5 }),
    ])
    expect(section?.rows.map((row) => row.tool)).toEqual(['listStories', 'getStory'])
  })
})

describe('accessRecordsUnder', () => {
  it('keeps the story run and the runs under it, and leaves another run out', () => {
    const records = accessRecordsUnder(
      [
        { id: 'story', accessRecords: [entry({ tool: 'sign-off', at: 40 })] },
        {
          id: 'feature',
          parentRunId: 'story',
          accessRecords: [entry({ tool: 'readPaths', at: 10 })],
        },
        {
          id: 'step',
          parentRunId: 'feature',
          accessRecords: [entry({ tool: 'getStory', at: 20 })],
        },
        { id: 'other', accessRecords: [entry({ tool: 'listProjects', at: 1 })] },
      ],
      'story',
    )
    expect(records.map((record) => record.tool)).toEqual(['readPaths', 'getStory', 'sign-off'])
  })

  it('reads every loaded run when there is no story run to hang them on', () => {
    const records = accessRecordsUnder(
      [
        { id: 'a', accessRecords: [entry({ tool: 'readPaths', at: 2 })] },
        { id: 'b', accessRecords: [entry({ tool: 'getStory', at: 1 })] },
      ],
      undefined,
    )
    expect(records.map((record) => record.tool)).toEqual(['getStory', 'readPaths'])
  })
})

describe('accessRecordProjectNames', () => {
  it('keeps a title and skips a blank one', () => {
    expect(
      accessRecordProjectNames([
        { id: 'thefactory-backend', title: ' Factory Backend ' },
        { id: 'bare', title: '  ' },
      ]),
    ).toEqual({ 'thefactory-backend': 'Factory Backend' })
  })
})
