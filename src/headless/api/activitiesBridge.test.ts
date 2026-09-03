import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  runActivity: vi.fn(),
  listActivities: vi.fn(),
  getActivity: vi.fn(),
  abortActivity: vi.fn(),
  resumeActivity: vi.fn(),
}))

import { runActivity } from './generated'
import { dispatchActivitiesBridge } from './activitiesBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchActivitiesBridge', () => {
  it('starts an activity on the LLM config when no CLI model is selected', async () => {
    asMock(runActivity).mockResolvedValue({ data: { activityId: 'a1' } })
    const res = await dispatchActivitiesBridge(
      'p1',
      {
        type: 'overseer:activities.start',
        payload: { activityType: 'build-catalog', params: { a: 1 } },
      },
      'cfg-activity',
    )
    expect(runActivity).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { activityType: 'build-catalog', llmConfigId: 'cfg-activity', params: { a: 1 } },
      throwOnError: true,
    })
    expect(res).toEqual({ activityId: 'a1' })
  })

  it('sends the CLI model and omits llmConfigId when a CLI selection is given', async () => {
    asMock(runActivity).mockResolvedValue({ data: { activityId: 'a2' } })
    const cliModel = {
      cli: 'codex' as const,
      modelId: 'gpt-5.1-codex',
      effort: 'high' as const,
      credentialId: 'cred-1',
    }
    const res = await dispatchActivitiesBridge(
      'p1',
      { type: 'overseer:activities.start', payload: { activityType: 'build-catalog' } },
      'cfg-activity',
      cliModel,
    )
    expect(runActivity).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { activityType: 'build-catalog', cliModel, params: undefined },
      throwOnError: true,
    })
    expect(res).toEqual({ activityId: 'a2' })
  })

  it('returns undefined for non-activities messages', async () => {
    expect(await dispatchActivitiesBridge('p1', { type: 'overseer:data.query' })).toBeUndefined()
    expect(runActivity).not.toHaveBeenCalled()
  })

  it('throws without an active project', async () => {
    await expect(
      dispatchActivitiesBridge(undefined, {
        type: 'overseer:activities.start',
        payload: { activityType: 'build-catalog' },
      }),
    ).rejects.toThrow(/project/i)
  })

  it('throws when activities.start has no activityType', async () => {
    await expect(
      dispatchActivitiesBridge('p1', { type: 'overseer:activities.start', payload: {} }),
    ).rejects.toThrow(/activityType/i)
    expect(runActivity).not.toHaveBeenCalled()
  })

  it('surfaces the real backend error message from the axios response body', async () => {
    asMock(runActivity).mockRejectedValue({
      message: 'Request failed with status code 409',
      response: { data: { error: 'An activity of this type is already running' } },
    })
    await expect(
      dispatchActivitiesBridge('p1', {
        type: 'overseer:activities.start',
        payload: { activityType: 'build-catalog' },
      }),
    ).rejects.toThrow('An activity of this type is already running')
  })
})
