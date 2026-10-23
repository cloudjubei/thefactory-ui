import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getUserSetting: vi.fn(), putUserSetting: vi.fn() }))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import {
  readProjectOverviewModelSetting,
  writeProjectOverviewModelSetting,
} from './useProjectOverviewModelSetting'

beforeEach(() => {
  api.getUserSetting.mockReset()
  api.putUserSetting.mockReset()
  api.putUserSetting.mockResolvedValue({ data: { value: {} } })
})

describe('readProjectOverviewModelSetting', () => {
  it('reads a chosen API config from the user setting', async () => {
    api.getUserSetting.mockResolvedValue({
      data: { value: { model: { runner: 'api', llmConfigId: 'cfg-local' } } },
    })
    expect(await readProjectOverviewModelSetting()).toEqual({
      runner: 'api',
      llmConfigId: 'cfg-local',
    })
    expect(api.getUserSetting).toHaveBeenCalledWith({
      path: { key: 'projectOverviewModel' },
      throwOnError: true,
    })
  })

  it('reads a chosen CLI with its model, login and effort', async () => {
    const model = {
      runner: 'cli',
      cli: 'claude-code',
      model: 'opus',
      authCredentialId: 'login-1',
      effort: 'high',
    }
    api.getUserSetting.mockResolvedValue({ data: { value: { model } } })
    expect(await readProjectOverviewModelSetting()).toEqual(model)
  })

  it.each([
    ['nothing stored', { data: { value: null } }],
    ['no answer', { data: undefined }],
    ['the Off shape', { data: { value: { model: null } } }],
    ['the old config-id shape', { data: { value: { llmConfigId: 'cfg-1' } } }],
    ['a CLI choice with no CLI', { data: { value: { model: { runner: 'cli' } } } }],
  ])('reads %s as Off', async (_label, answer) => {
    api.getUserSetting.mockResolvedValue(answer)
    expect(await readProjectOverviewModelSetting()).toBeNull()
  })

  it('passes a failed read on', async () => {
    api.getUserSetting.mockRejectedValue(new Error('offline'))
    await expect(readProjectOverviewModelSetting()).rejects.toThrow('offline')
  })
})

describe('writeProjectOverviewModelSetting', () => {
  it.each([
    ['an API config', { runner: 'api' as const, llmConfigId: 'cfg-hosted', effort: 'high' }],
    ['a CLI on its default model', { runner: 'cli' as const, cli: 'codex' }],
  ])('stores %s as the model choice', async (_label, model) => {
    await writeProjectOverviewModelSetting(model)
    expect(api.putUserSetting).toHaveBeenCalledWith({
      path: { key: 'projectOverviewModel' },
      body: { value: { model } },
      throwOnError: true,
    })
  })

  it('stores the Off shape for no model', async () => {
    await writeProjectOverviewModelSetting(null)
    expect(api.putUserSetting).toHaveBeenCalledWith({
      path: { key: 'projectOverviewModel' },
      body: { value: { model: null } },
      throwOnError: true,
    })
  })

  it('passes a failed write on', async () => {
    api.putUserSetting.mockRejectedValue(new Error('refused'))
    await expect(
      writeProjectOverviewModelSetting({ runner: 'api', llmConfigId: 'cfg-1' }),
    ).rejects.toThrow('refused')
  })
})
