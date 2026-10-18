import { describe, expect, it } from 'vitest'
import type { DataRecord, DataSource, SubscribedRecords } from '../api/generated'
import {
  appLiveDataEntry,
  appSourceNotFound,
  appSourceSchedule,
  dataChangedPush,
  declaredSourceId,
  findAppSource,
  liveDataChangedPush,
  parseAppSchedulePayload,
  parseAppSourceId,
  projectSourceId,
  schedulePatch,
  withSourceSchedules,
} from './appLiveData'
import {
  APP_SCHEDULE_AUTO_UPDATE_REQUIRED,
  APP_SCHEDULE_FRESHNESS_INVALID,
  APP_SOURCE_ID_REQUIRED,
} from './appLiveDataConstants'

const DAY = 86_400_000

function taskSource(over: Partial<DataSource> = {}): DataSource {
  return {
    id: 'wargames:official-sources',
    name: 'Official sources',
    recordType: 'official-source-report',
    freshness: DAY,
    autoUpdate: true,
    projectId: 'wargames',
    adapter: {
      itemsPath: 'items',
      kind: 'snapshot',
      map: { key: 'key' },
      task: { script: 'monitor:sources' },
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    lastRefreshedAt: '2026-10-17T09:00:00.000Z',
    ...over,
  }
}

function fetchSource(over: Partial<DataSource> = {}): DataSource {
  return {
    id: 'b6c1',
    name: 'Stock quotes',
    recordType: 'stock-quote',
    freshness: 3_600_000,
    autoUpdate: false,
    adapter: {
      itemsPath: 'data',
      map: { key: 'symbol', value: 'price' },
      fetch: { url: 'https://example.com/q' },
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  }
}

const record: DataRecord = {
  id: 'r1',
  scope: 'general',
  type: 'official-source-report',
  key: 'summary',
  content: { kind: 'summary' },
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-17T09:00:00.000Z',
} as DataRecord

describe('projectSourceId', () => {
  it('prefixes a declared id with its project', () => {
    expect(projectSourceId('wargames', 'official-sources')).toBe('wargames:official-sources')
  })

  it('keeps an id already stored under the same project', () => {
    expect(projectSourceId('wargames', 'wargames:official-sources')).toBe(
      'wargames:official-sources',
    )
  })

  it("prefixes another project's stored id, so it can never name that project's source", () => {
    expect(projectSourceId('wargames', 'other:official-sources')).toBe(
      'wargames:other:official-sources',
    )
  })
})

describe('declaredSourceId', () => {
  it("strips the project's prefix", () => {
    expect(declaredSourceId('wargames', 'wargames:official-sources')).toBe('official-sources')
  })

  it("leaves an id that isn't this project's alone", () => {
    expect(declaredSourceId('wargames', 'b6c1')).toBe('b6c1')
    expect(declaredSourceId('wargames', 'other:official-sources')).toBe('other:official-sources')
  })
})

describe('findAppSource', () => {
  const sources = [fetchSource(), taskSource(), taskSource({ id: 'other:x', projectId: 'other' })]

  it('finds the project source by its declared id', () => {
    expect(findAppSource('wargames', sources, 'official-sources')?.id).toBe(
      'wargames:official-sources',
    )
  })

  it("refuses another project's source, even named by its stored id", () => {
    expect(findAppSource('wargames', sources, 'other:x')).toBeUndefined()
  })

  it('refuses a source stored under the prefix but owned by no project', () => {
    const stray = taskSource({ id: 'wargames:stray', projectId: undefined })
    expect(findAppSource('wargames', [stray], 'stray')).toBeUndefined()
  })

  it('refuses a global source named by its own id', () => {
    expect(findAppSource('wargames', sources, 'b6c1')).toBeUndefined()
  })
})

describe('appSourceNotFound', () => {
  it('names the id the app sent', () => {
    expect(appSourceNotFound('nope')).toBe('No live-data source "nope" in this project.')
  })
})

describe('parseAppSourceId', () => {
  it('reads a trimmed sourceId', () => {
    expect(parseAppSourceId({ sourceId: ' official-sources ' })).toBe('official-sources')
  })

  it.each([undefined, null, 'official-sources', [], {}, { sourceId: '' }, { sourceId: 4 }])(
    'returns null for %j',
    (payload) => {
      expect(parseAppSourceId(payload)).toBeNull()
    },
  )
})

describe('parseAppSchedulePayload', () => {
  it('reads an auto-update schedule with its period', () => {
    expect(
      parseAppSchedulePayload({ sourceId: 'official-sources', autoUpdate: true, freshnessMs: DAY }),
    ).toEqual({ sourceId: 'official-sources', autoUpdate: true, freshnessMs: DAY })
  })

  it('reads turning auto-update off without a period', () => {
    expect(parseAppSchedulePayload({ sourceId: 'official-sources', autoUpdate: false })).toEqual({
      sourceId: 'official-sources',
      autoUpdate: false,
    })
  })

  it('asks for the source id first', () => {
    expect(parseAppSchedulePayload({ autoUpdate: true })).toEqual({
      error: APP_SOURCE_ID_REQUIRED,
    })
  })

  it('asks for a boolean autoUpdate', () => {
    expect(parseAppSchedulePayload({ sourceId: 's', autoUpdate: 'yes' })).toEqual({
      error: APP_SCHEDULE_AUTO_UPDATE_REQUIRED,
    })
  })

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, '86400000'])(
    'refuses freshnessMs %j',
    (freshnessMs) => {
      expect(parseAppSchedulePayload({ sourceId: 's', autoUpdate: true, freshnessMs })).toEqual({
        error: APP_SCHEDULE_FRESHNESS_INVALID,
      })
    },
  )

  it('rounds a fractional period to whole milliseconds', () => {
    expect(
      parseAppSchedulePayload({ sourceId: 's', autoUpdate: true, freshnessMs: 1000.6 }),
    ).toEqual({ sourceId: 's', autoUpdate: true, freshnessMs: 1001 })
  })
})

describe('schedulePatch', () => {
  it('sends the period as freshness', () => {
    expect(schedulePatch({ sourceId: 's', autoUpdate: true, freshnessMs: DAY })).toEqual({
      autoUpdate: true,
      freshness: DAY,
    })
  })

  it('keeps the stored period when none is sent', () => {
    expect(schedulePatch({ sourceId: 's', autoUpdate: false })).toEqual({ autoUpdate: false })
  })
})

describe('appSourceSchedule', () => {
  it("reads the source's schedule", () => {
    expect(appSourceSchedule(taskSource())).toEqual({
      autoUpdate: true,
      freshnessMs: DAY,
      lastRefreshedAt: '2026-10-17T09:00:00.000Z',
    })
  })

  it('says null for a source that never refreshed', () => {
    expect(appSourceSchedule(taskSource({ lastRefreshedAt: undefined })).lastRefreshedAt).toBeNull()
  })
})

describe('appLiveDataEntry', () => {
  it('names the source by its declared id, with its records and schedule', () => {
    expect(appLiveDataEntry('wargames', taskSource(), [record])).toEqual({
      sourceId: 'official-sources',
      recordType: 'official-source-report',
      records: [record],
      autoUpdate: true,
      freshnessMs: DAY,
      lastRefreshedAt: '2026-10-17T09:00:00.000Z',
    })
  })
})

describe('withSourceSchedules', () => {
  const subscribed: SubscribedRecords[] = [
    { sourceId: 'b6c1', recordType: 'stock-quote', records: [] },
    {
      sourceId: 'wargames:official-sources',
      recordType: 'official-source-report',
      records: [record],
    },
    { sourceId: 'gone', recordType: 'gone', records: [] },
  ]

  it('adds each known source schedule beside its records and keeps the stored ids', () => {
    const out = withSourceSchedules(subscribed, [fetchSource(), taskSource()])
    expect(out[0]).toEqual({
      sourceId: 'b6c1',
      recordType: 'stock-quote',
      records: [],
      autoUpdate: false,
      freshnessMs: 3_600_000,
      lastRefreshedAt: null,
    })
    expect(out[1]).toMatchObject({
      sourceId: 'wargames:official-sources',
      records: [record],
      autoUpdate: true,
      freshnessMs: DAY,
    })
  })

  it('leaves an entry whose source is unknown as it was', () => {
    expect(withSourceSchedules(subscribed, [])[2]).toEqual({
      sourceId: 'gone',
      recordType: 'gone',
      records: [],
    })
  })
})

describe('liveDataChangedPush', () => {
  const at = '2026-10-18T12:00:00.000Z'

  it("pushes a project source's status under its declared id", () => {
    expect(
      liveDataChangedPush(
        'wargames',
        { sourceId: 'wargames:official-sources', projectId: 'wargames', status: 'fresh' },
        at,
      ),
    ).toEqual({
      type: 'overseer:live-data.changed',
      payload: { sourceId: 'official-sources', status: 'fresh', at },
    })
  })

  it('pushes an event that names no project when its id is under the project', () => {
    expect(
      liveDataChangedPush(
        'wargames',
        { sourceId: 'wargames:official-sources', status: 'error' },
        at,
      )?.payload,
    ).toEqual({ sourceId: 'official-sources', status: 'error', at })
  })

  it("does not push another project's source", () => {
    expect(
      liveDataChangedPush(
        'wargames',
        { sourceId: 'other:x', projectId: 'other', status: 'fetching' },
        at,
      ),
    ).toBeNull()
  })

  it('does not push a global source', () => {
    expect(liveDataChangedPush('wargames', { sourceId: 'b6c1', status: 'fresh' }, at)).toBeNull()
  })

  it('does not push an event with an unknown status', () => {
    expect(
      liveDataChangedPush(
        'wargames',
        { sourceId: 'wargames:official-sources', status: 'odd' as 'fresh' },
        at,
      ),
    ).toBeNull()
  })
})

describe('dataChangedPush', () => {
  it("pushes a change to the project's records with its collection", () => {
    expect(
      dataChangedPush('wargames', {
        action: 'upserted',
        scope: 'wargames',
        type: 'source-decision',
        key: 'r3',
      }),
    ).toEqual({ type: 'overseer:data.changed', payload: { collection: 'source-decision' } })
  })

  it('pushes a delete too', () => {
    expect(
      dataChangedPush('wargames', {
        action: 'deleted',
        scope: 'wargames',
        type: 'source-decision',
        key: 'r3',
      })?.payload,
    ).toEqual({ collection: 'source-decision' })
  })

  it("does not push another scope's change", () => {
    expect(
      dataChangedPush('wargames', { action: 'upserted', scope: 'general', type: 't', key: null }),
    ).toBeNull()
  })
})
