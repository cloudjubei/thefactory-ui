import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  listProjectData: vi.fn(),
  putProjectData: vi.fn(),
  deleteProjectData: vi.fn(),
}))

import { listProjectData, putProjectData, deleteProjectData } from './generated'
import {
  queryProjectData,
  putProjectDataRecord,
  deleteProjectDataRecord,
  dispatchProjectDataBridge,
  createProjectDataApi,
} from './projectData'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('queryProjectData', () => {
  it('calls listProjectData with path + query and returns the array', async () => {
    asMock(listProjectData).mockResolvedValue({
      data: [{ scope: 'p1', type: 'holding', key: 'AAPL' }],
    })
    const res = await queryProjectData('p1', { type: 'holding', key: 'AAPL' })
    expect(listProjectData).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      query: { type: 'holding', key: 'AAPL' },
      throwOnError: true,
    })
    expect(res).toEqual([{ scope: 'p1', type: 'holding', key: 'AAPL' }])
  })

  it('returns an empty array when the response data is nullish', async () => {
    asMock(listProjectData).mockResolvedValue({ data: undefined })
    expect(await queryProjectData('p1')).toEqual([])
  })
})

describe('putProjectDataRecord', () => {
  it('calls putProjectData with the body and returns the record', async () => {
    const rec = { scope: 'p1', type: 'holding', key: 'AAPL', content: { n: 1 } }
    asMock(putProjectData).mockResolvedValue({ data: rec })
    const res = await putProjectDataRecord('p1', {
      type: 'holding',
      key: 'AAPL',
      content: { n: 1 },
    })
    expect(putProjectData).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { type: 'holding', key: 'AAPL', content: { n: 1 } },
      throwOnError: true,
    })
    expect(res).toEqual(rec)
  })
})

describe('deleteProjectDataRecord', () => {
  it('calls deleteProjectData with path + query', async () => {
    asMock(deleteProjectData).mockResolvedValue({ data: undefined })
    await deleteProjectDataRecord('p1', { type: 'holding', key: 'AAPL' })
    expect(deleteProjectData).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      query: { type: 'holding', key: 'AAPL' },
      throwOnError: true,
    })
  })
})

describe('dispatchProjectDataBridge', () => {
  it('routes data.query to listProjectData', async () => {
    asMock(listProjectData).mockResolvedValue({ data: [] })
    const res = await dispatchProjectDataBridge('p1', {
      type: 'overseer:data.query',
      payload: { type: 'holding' },
    })
    expect(res).toEqual([])
    expect(listProjectData).toHaveBeenCalled()
  })

  it('routes data.put to putProjectData and returns the record', async () => {
    const rec = { scope: 'p1', type: 'holding', key: 'AAPL', content: {} }
    asMock(putProjectData).mockResolvedValue({ data: rec })
    const res = await dispatchProjectDataBridge('p1', {
      type: 'overseer:data.put',
      payload: { type: 'holding', key: 'AAPL', content: {} },
    })
    expect(res).toEqual(rec)
  })

  it('routes data.delete to deleteProjectData and returns { deleted: true }', async () => {
    asMock(deleteProjectData).mockResolvedValue({ data: undefined })
    const res = await dispatchProjectDataBridge('p1', {
      type: 'overseer:data.delete',
      payload: { type: 'holding', key: 'AAPL' },
    })
    expect(res).toEqual({ deleted: true })
  })

  it('returns undefined for non-data bridge messages', async () => {
    expect(await dispatchProjectDataBridge('p1', { type: 'overseer:ready' })).toBeUndefined()
    expect(listProjectData).not.toHaveBeenCalled()
  })

  it('throws for an unknown data.* op', async () => {
    await expect(
      dispatchProjectDataBridge('p1', { type: 'overseer:data.frobnicate' }),
    ).rejects.toThrow()
  })

  it('throws when there is no active project', async () => {
    await expect(
      dispatchProjectDataBridge(undefined, { type: 'overseer:data.query' }),
    ).rejects.toThrow(/project/i)
  })

  it('throws when data.put payload is missing type', async () => {
    await expect(
      dispatchProjectDataBridge('p1', { type: 'overseer:data.put', payload: { content: {} } }),
    ).rejects.toThrow(/type/i)
    expect(putProjectData).not.toHaveBeenCalled()
  })

  it('throws when data.delete payload is missing key', async () => {
    await expect(
      dispatchProjectDataBridge('p1', {
        type: 'overseer:data.delete',
        payload: { type: 'holding' },
      }),
    ).rejects.toThrow(/key/i)
    expect(deleteProjectData).not.toHaveBeenCalled()
  })
})

describe('createProjectDataApi', () => {
  it('binds the project id to query / put / remove', async () => {
    asMock(listProjectData).mockResolvedValue({ data: [] })
    asMock(putProjectData).mockResolvedValue({ data: { scope: 'p1' } })
    asMock(deleteProjectData).mockResolvedValue({ data: undefined })
    const api = createProjectDataApi('p1')

    await api.query({ type: 'holding' })
    await api.put({ type: 'holding', key: 'AAPL', content: {} })
    await api.remove({ type: 'holding', key: 'AAPL' })

    expect(listProjectData).toHaveBeenCalledWith(
      expect.objectContaining({ path: { projectId: 'p1' } }),
    )
    expect(putProjectData).toHaveBeenCalledWith(
      expect.objectContaining({ path: { projectId: 'p1' } }),
    )
    expect(deleteProjectData).toHaveBeenCalledWith(
      expect.objectContaining({ path: { projectId: 'p1' } }),
    )
  })

  it('query resolves to [] when no project is active', async () => {
    const api = createProjectDataApi(undefined)
    expect(await api.query()).toEqual([])
    expect(listProjectData).not.toHaveBeenCalled()
  })

  it('put rejects when no project is active', async () => {
    const api = createProjectDataApi(undefined)
    await expect(api.put({ type: 'holding', content: {} })).rejects.toThrow(/project/i)
    expect(putProjectData).not.toHaveBeenCalled()
  })

  it('remove rejects when no project is active', async () => {
    const api = createProjectDataApi(undefined)
    await expect(api.remove({ type: 'holding', key: 'AAPL' })).rejects.toThrow(/project/i)
    expect(deleteProjectData).not.toHaveBeenCalled()
  })
})
