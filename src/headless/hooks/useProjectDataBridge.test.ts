import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectDataBridge } from './useProjectDataBridge'
import { dispatchProjectDataBridge } from '../api/projectData'
import { dispatchProjectsBridge } from '../api/projectsBridge'
import { dispatchWorkBridge } from '../api/workBridge'

vi.mock('react', () => ({ useCallback: (fn: unknown) => fn }))
vi.mock('../api/projectData', () => ({ dispatchProjectDataBridge: vi.fn() }))
vi.mock('../api/liveDataBridge', () => ({ dispatchLiveDataBridge: vi.fn() }))
vi.mock('../api/activitiesBridge', () => ({ dispatchActivitiesBridge: vi.fn() }))
vi.mock('../api/trainerToolsBridge', () => ({ dispatchTrainerToolsBridge: vi.fn() }))
vi.mock('../api/appSettingsBridge', () => ({ dispatchAppSettingsBridge: vi.fn() }))
vi.mock('../api/runnersBridge', () => ({ dispatchRunnersBridge: vi.fn() }))
vi.mock('../api/projectsBridge', () => ({ dispatchProjectsBridge: vi.fn() }))
vi.mock('../api/workBridge', () => ({ dispatchWorkBridge: vi.fn() }))
vi.mock('../contexts/StoriesContext', () => ({
  useStories: () => ({ stories: [], isLoaded: true, loadError: null }),
}))
vi.mock('../contexts/ProjectsContext', () => ({
  useProjects: () => ({ activeProjectId: 'p1' }),
}))
vi.mock('../contexts/LLMConfigsContext', () => ({ useLLMConfigs: () => ({}) }))

beforeEach(() => vi.resetAllMocks())

describe('useProjectDataBridge work wiring', () => {
  it.each(['stories.list', 'runs.list'])('routes %s to the work dispatcher', async (type) => {
    vi.mocked(dispatchWorkBridge).mockResolvedValueOnce([])
    const req = { type }
    expect(await useProjectDataBridge('p1')(req)).toEqual([])
    expect(dispatchWorkBridge).toHaveBeenCalledWith('p1', req, {
      stories: [],
      isLoaded: true,
      loadError: null,
    })
  })

  it('does not take stories from a different project', async () => {
    await useProjectDataBridge('p2')({ type: 'stories.list' })
    expect(dispatchWorkBridge).toHaveBeenCalledWith('p2', { type: 'stories.list' }, undefined)
  })

  it('preserves earlier data and projects handlers', async () => {
    vi.mocked(dispatchProjectDataBridge).mockResolvedValueOnce({ value: 1 })
    expect(await useProjectDataBridge('p1')({ type: 'data.read' })).toEqual({ value: 1 })
    expect(dispatchWorkBridge).not.toHaveBeenCalled()
    vi.mocked(dispatchProjectsBridge).mockResolvedValueOnce([{ id: 'p1' }])
    expect(await useProjectDataBridge('p1')({ type: 'projects.list' })).toEqual([{ id: 'p1' }])
    expect(dispatchWorkBridge).not.toHaveBeenCalled()
  })

  it('leaves unowned messages undefined', async () => {
    expect(await useProjectDataBridge('p1')({ type: 'custom.message' })).toBeUndefined()
    expect(dispatchWorkBridge).toHaveBeenCalled()
  })
})
