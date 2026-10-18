import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  readProjectLiveData: vi.fn(),
  listDataSources: vi.fn(),
  listProjectDataSources: vi.fn(),
  listSourceRecords: vi.fn(),
  refreshDataSource: vi.fn(),
  updateDataSource: vi.fn(),
}))

import {
  listDataSources,
  listProjectDataSources,
  listSourceRecords,
  readProjectLiveData,
  refreshDataSource,
  updateDataSource,
} from './generated'
import { dispatchLiveDataBridge } from './liveDataBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

const DAY = 86_400_000

const taskSource = {
  id: 'p1:official-sources',
  name: 'Official sources',
  recordType: 'official-source-report',
  freshness: DAY,
  autoUpdate: true,
  projectId: 'p1',
  adapter: { itemsPath: 'items', map: { key: 'key' }, task: { script: 'monitor:sources' } },
  createdAt: 'c',
  updatedAt: 'u',
  lastRefreshedAt: '2026-10-17T09:00:00.000Z',
}

const foreignSource = { ...taskSource, id: 'p2:official-sources', projectId: 'p2' }

function axiosError(status: number, error: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { error } },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  asMock(listProjectDataSources).mockResolvedValue({ data: [taskSource] })
})

describe('dispatchLiveDataBridge — live-data.read', () => {
  it('reads every subscribed source with its schedule when no source is named', async () => {
    asMock(readProjectLiveData).mockResolvedValue({
      data: [
        { sourceId: 's1', recordType: 'stock-quote', records: [] },
        { sourceId: 'gone', recordType: 'x', records: [] },
      ],
    })
    asMock(listDataSources).mockResolvedValue({
      data: [
        { ...taskSource, id: 's1', projectId: undefined, freshness: 60_000, autoUpdate: false },
      ],
    })
    const res = await dispatchLiveDataBridge('p1', { type: 'overseer:live-data.read' })
    expect(readProjectLiveData).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      throwOnError: true,
    })
    expect(res).toEqual([
      {
        sourceId: 's1',
        recordType: 'stock-quote',
        records: [],
        autoUpdate: false,
        freshnessMs: 60_000,
        lastRefreshedAt: '2026-10-17T09:00:00.000Z',
      },
      { sourceId: 'gone', recordType: 'x', records: [] },
    ])
  })

  it('reads one project source by its declared id, answering under that id with its schedule', async () => {
    const record = { id: 'r', key: 'summary', content: { kind: 'summary' } }
    asMock(listSourceRecords).mockResolvedValue({ data: [record] })
    const res = await dispatchLiveDataBridge('p1', {
      type: 'overseer:live-data.read',
      payload: { sourceId: 'official-sources' },
    })
    expect(listProjectDataSources).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      throwOnError: true,
    })
    expect(listSourceRecords).toHaveBeenCalledWith({
      path: { id: 'p1:official-sources' },
      throwOnError: true,
    })
    expect(res).toEqual([
      {
        sourceId: 'official-sources',
        recordType: 'official-source-report',
        records: [record],
        autoUpdate: true,
        freshnessMs: DAY,
        lastRefreshedAt: '2026-10-17T09:00:00.000Z',
      },
    ])
    expect(readProjectLiveData).not.toHaveBeenCalled()
  })

  it("refuses another project's source", async () => {
    asMock(listProjectDataSources).mockResolvedValue({ data: [taskSource, foreignSource] })
    await expect(
      dispatchLiveDataBridge('p1', {
        type: 'overseer:live-data.read',
        payload: { sourceId: 'p2:official-sources' },
      }),
    ).rejects.toThrow('No live-data source "p2:official-sources" in this project.')
    expect(listSourceRecords).not.toHaveBeenCalled()
  })
})

describe('dispatchLiveDataBridge — live-data.refresh', () => {
  it('refreshes the project source and answers its result under the declared id', async () => {
    asMock(refreshDataSource).mockResolvedValue({
      data: {
        sourceId: 'p1:official-sources',
        recordType: 'official-source-report',
        itemCount: 3,
        at: '2026-10-18T10:00:00.000Z',
      },
    })
    const res = await dispatchLiveDataBridge('p1', {
      type: 'overseer:live-data.refresh',
      payload: { sourceId: 'official-sources' },
    })
    expect(refreshDataSource).toHaveBeenCalledWith({
      path: { id: 'p1:official-sources' },
      throwOnError: true,
    })
    expect(res).toEqual({
      sourceId: 'official-sources',
      recordType: 'official-source-report',
      itemCount: 3,
      at: '2026-10-18T10:00:00.000Z',
    })
  })

  it("passes a refresh's own error through in its result", async () => {
    asMock(refreshDataSource).mockResolvedValue({
      data: {
        sourceId: 'p1:official-sources',
        recordType: '',
        itemCount: 0,
        at: 'a',
        error: 'boom',
      },
    })
    const res = await dispatchLiveDataBridge('p1', {
      type: 'overseer:live-data.refresh',
      payload: { sourceId: 'official-sources' },
    })
    expect(res).toMatchObject({ sourceId: 'official-sources', error: 'boom' })
  })

  it('asks for a source id', async () => {
    await expect(
      dispatchLiveDataBridge('p1', { type: 'overseer:live-data.refresh', payload: {} }),
    ).rejects.toThrow(/sourceId/)
    expect(refreshDataSource).not.toHaveBeenCalled()
  })

  it('refuses an unknown source without calling refresh', async () => {
    await expect(
      dispatchLiveDataBridge('p1', {
        type: 'overseer:live-data.refresh',
        payload: { sourceId: 'nope' },
      }),
    ).rejects.toThrow('No live-data source "nope" in this project.')
    expect(refreshDataSource).not.toHaveBeenCalled()
  })
})

describe('dispatchLiveDataBridge — live-data.schedule', () => {
  it("changes the source's schedule and answers the stored one", async () => {
    asMock(updateDataSource).mockResolvedValue({
      data: { ...taskSource, autoUpdate: true, freshness: 7 * DAY },
    })
    const res = await dispatchLiveDataBridge('p1', {
      type: 'overseer:live-data.schedule',
      payload: { sourceId: 'official-sources', autoUpdate: true, freshnessMs: 7 * DAY },
    })
    expect(updateDataSource).toHaveBeenCalledWith({
      path: { id: 'p1:official-sources' },
      body: { autoUpdate: true, freshness: 7 * DAY },
      throwOnError: true,
    })
    expect(res).toEqual({ autoUpdate: true, freshnessMs: 7 * DAY })
  })

  it('turns auto-update off without touching the period', async () => {
    asMock(updateDataSource).mockResolvedValue({ data: { ...taskSource, autoUpdate: false } })
    const res = await dispatchLiveDataBridge('p1', {
      type: 'overseer:live-data.schedule',
      payload: { sourceId: 'official-sources', autoUpdate: false },
    })
    expect(asMock(updateDataSource).mock.calls[0][0].body).toEqual({ autoUpdate: false })
    expect(res).toEqual({ autoUpdate: false, freshnessMs: DAY })
  })

  it('refuses a malformed schedule before reading the sources', async () => {
    await expect(
      dispatchLiveDataBridge('p1', {
        type: 'overseer:live-data.schedule',
        payload: { sourceId: 'official-sources', autoUpdate: true, freshnessMs: -1 },
      }),
    ).rejects.toThrow(/freshnessMs/)
    expect(listProjectDataSources).not.toHaveBeenCalled()
    expect(updateDataSource).not.toHaveBeenCalled()
  })

  it("lifts the backend's 400 message", async () => {
    asMock(updateDataSource).mockRejectedValue(
      axiosError(400, 'A task source accepts only freshness and autoUpdate'),
    )
    await expect(
      dispatchLiveDataBridge('p1', {
        type: 'overseer:live-data.schedule',
        payload: { sourceId: 'official-sources', autoUpdate: true },
      }),
    ).rejects.toThrow('A task source accepts only freshness and autoUpdate')
  })
})

describe('dispatchLiveDataBridge — routing', () => {
  it('returns undefined for non-live-data messages', async () => {
    expect(await dispatchLiveDataBridge('p1', { type: 'overseer:data.query' })).toBeUndefined()
    expect(readProjectLiveData).not.toHaveBeenCalled()
  })

  it('throws without an active project', async () => {
    await expect(
      dispatchLiveDataBridge(undefined, { type: 'overseer:live-data.read' }),
    ).rejects.toThrow(/project/i)
  })

  it('throws for an unknown live-data op', async () => {
    await expect(
      dispatchLiveDataBridge('p1', { type: 'overseer:live-data.frobnicate' }),
    ).rejects.toThrow(/Unknown live-data bridge op/)
  })
})
