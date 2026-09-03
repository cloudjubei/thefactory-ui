import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APP_SETTINGS_TYPE } from 'thefactory-tools/constants'

vi.mock('./generated', () => ({
  getUserSetting: vi.fn(),
  putUserSetting: vi.fn(),
}))
vi.mock('./projectData', () => ({
  queryProjectData: vi.fn(),
  putProjectDataRecord: vi.fn(),
  deleteProjectDataRecord: vi.fn(),
}))

import { getUserSetting, putUserSetting } from './generated'
import { queryProjectData, putProjectDataRecord, deleteProjectDataRecord } from './projectData'
import { dispatchAppSettingsBridge } from './appSettingsBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

const GLOBAL = { country: 'GB', currency: 'GBP' }
const APP = { country: 'US', currency: 'USD' }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchAppSettingsBridge', () => {
  it('settings.get returns both raw layers (global + app), scoped to the key', async () => {
    asMock(getUserSetting).mockResolvedValue({ data: { value: GLOBAL } })
    asMock(queryProjectData).mockResolvedValue([{ content: APP }])
    const res = await dispatchAppSettingsBridge('p1', {
      type: 'overseer:settings.get',
      payload: { key: 'locale' },
    })
    expect(res).toEqual({ global: GLOBAL, app: APP })
    expect(getUserSetting).toHaveBeenCalledWith({ path: { key: 'locale' }, throwOnError: true })
    expect(queryProjectData).toHaveBeenCalledWith('p1', {
      type: APP_SETTINGS_TYPE,
      key: 'locale',
    })
  })

  it('settings.get returns nulls when neither layer is set', async () => {
    asMock(getUserSetting).mockResolvedValue({ data: { value: null } })
    asMock(queryProjectData).mockResolvedValue([])
    const res = await dispatchAppSettingsBridge('p1', {
      type: 'overseer:settings.get',
      payload: { key: 'locale' },
    })
    expect(res).toEqual({ global: null, app: null })
  })

  it('settings.put level=global writes the user-global layer and returns the value', async () => {
    asMock(putUserSetting).mockResolvedValue({ data: { value: GLOBAL } })
    const res = await dispatchAppSettingsBridge('p1', {
      type: 'overseer:settings.put',
      payload: { key: 'locale', level: 'global', value: GLOBAL },
    })
    expect(res).toEqual({ value: GLOBAL })
    expect(putUserSetting).toHaveBeenCalledWith({
      path: { key: 'locale' },
      body: { value: GLOBAL },
      throwOnError: true,
    })
    expect(putProjectDataRecord).not.toHaveBeenCalled()
  })

  it('settings.put level=app writes the project override and returns the value', async () => {
    asMock(putProjectDataRecord).mockResolvedValue({ content: APP })
    const res = await dispatchAppSettingsBridge('p1', {
      type: 'overseer:settings.put',
      payload: { key: 'locale', level: 'app', value: APP },
    })
    expect(res).toEqual({ value: APP })
    expect(putProjectDataRecord).toHaveBeenCalledWith('p1', {
      type: APP_SETTINGS_TYPE,
      key: 'locale',
      content: APP,
    })
    expect(putUserSetting).not.toHaveBeenCalled()
  })

  it('settings.delete clears the per-app override', async () => {
    asMock(deleteProjectDataRecord).mockResolvedValue(undefined)
    const res = await dispatchAppSettingsBridge('p1', {
      type: 'overseer:settings.delete',
      payload: { key: 'locale' },
    })
    expect(res).toEqual({ deleted: true })
    expect(deleteProjectDataRecord).toHaveBeenCalledWith('p1', {
      type: APP_SETTINGS_TYPE,
      key: 'locale',
    })
  })

  it('settings.get requires a key', async () => {
    await expect(
      dispatchAppSettingsBridge('p1', { type: 'overseer:settings.get', payload: {} }),
    ).rejects.toThrow(/key/)
  })

  it('settings.put requires a valid level', async () => {
    await expect(
      dispatchAppSettingsBridge('p1', {
        type: 'overseer:settings.put',
        payload: { key: 'locale', value: APP },
      }),
    ).rejects.toThrow(/level/)
  })

  it('returns undefined for non-settings messages', async () => {
    expect(await dispatchAppSettingsBridge('p1', { type: 'overseer:data.query' })).toBeUndefined()
    expect(getUserSetting).not.toHaveBeenCalled()
  })

  it('throws without an active project', async () => {
    await expect(
      dispatchAppSettingsBridge(undefined, {
        type: 'overseer:settings.get',
        payload: { key: 'locale' },
      }),
    ).rejects.toThrow(/without an active project/)
  })
})
