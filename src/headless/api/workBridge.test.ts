import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchWorkBridge } from './workBridge'
import {
  listFeatureRequests,
  listProcessRuns,
  listStories,
  type GetStoryResponse,
  type ProcessRun,
} from './generated'

vi.mock('./generated', () => ({
  listStories: vi.fn(),
  listProcessRuns: vi.fn(),
  listFeatureRequests: vi.fn(),
}))

const story = {
  id: 's1',
  title: 'A story',
  status: 'ACTIVE',
  description: 'private story description',
  features: [
    { id: 'f1', title: 'A feature', status: 'NEW', description: 'private feature description' },
  ],
} as unknown as GetStoryResponse
const storySummary = {
  id: 's1',
  title: 'A story',
  status: 'ACTIVE',
  features: [{ id: 'f1', title: 'A feature', status: 'NEW' }],
}
const run = (overrides: Partial<ProcessRun> = {}) =>
  ({
    id: 'r1',
    projectId: 'p1',
    title: 'A run',
    status: 'running',
    storyId: 's1',
    plan: { definitionId: 'implement', steps: [{ secret: 'not exposed' }] },
    ledger: [{ secret: 'not exposed' }],
    cursor: { stepId: 'develop', iteration: 1 },
    startedAt: 10,
    updatedAt: 20,
    ...overrides,
  }) as ProcessRun

beforeEach(() => vi.resetAllMocks())

describe('dispatchWorkBridge', () => {
  it('uses loaded project stories and only returns summary fields', async () => {
    expect(
      await dispatchWorkBridge(
        'p1',
        { type: 'overseer:stories.list' },
        { stories: [story], isLoaded: true, loadError: null },
      ),
    ).toEqual([storySummary])
    expect(listStories).not.toHaveBeenCalled()
  })

  it('fetches project stories when there is no loaded snapshot', async () => {
    vi.mocked(listStories).mockResolvedValueOnce({ data: [story] } as never)
    expect(await dispatchWorkBridge('p1', { type: 'stories.list' })).toEqual([storySummary])
    expect(listStories).toHaveBeenCalledWith({ path: { projectId: 'p1' }, throwOnError: true })
  })

  it('returns scoped run summaries newest first, without plans or ledgers', async () => {
    const park = { reason: 'gate', message: 'Review needed', parkedAt: 30 } as const
    const runs = [
      run({ updatedAt: 100 }),
      run({ id: 'r2', startedAt: 30, updatedAt: 40, status: 'parked', park }),
      run({ id: 'foreign', projectId: 'p2', startedAt: 50 }),
    ]
    vi.mocked(listProcessRuns).mockResolvedValueOnce({ data: runs } as never)
    expect(await dispatchWorkBridge('p1', { type: 'overseer:runs.list' })).toEqual([
      {
        id: 'r2',
        title: 'A run',
        status: 'parked',
        processId: 'implement',
        storyId: 's1',
        currentStepId: 'develop',
        park,
        updatedAt: 40,
      },
      {
        id: 'r1',
        title: 'A run',
        status: 'running',
        processId: 'implement',
        storyId: 's1',
        currentStepId: 'develop',
        updatedAt: 100,
      },
    ])
    expect(listProcessRuns).toHaveBeenCalledWith({
      query: { projectId: 'p1', rootOnly: true },
      throwOnError: true,
    })
    expect(runs.map((r) => r.id)).toEqual(['r1', 'r2', 'foreign'])
  })

  it('lists a run that has not started yet first', async () => {
    const runs = [
      run({ id: 'old', startedAt: 5 }),
      run({ id: 'pending', status: 'pending', startedAt: undefined }),
      run({ id: 'new', startedAt: 40 }),
    ]
    vi.mocked(listProcessRuns).mockResolvedValueOnce({ data: runs } as never)
    const listed = (await dispatchWorkBridge('p1', { type: 'runs.list' })) as { id: string }[]
    expect(listed.map((r) => r.id)).toEqual(['pending', 'new', 'old'])
  })

  it('returns the requests the project sent, as summaries', async () => {
    vi.mocked(listFeatureRequests).mockResolvedValueOnce({
      data: [
        {
          id: 'fr1',
          title: 'Explorer subagent',
          targetProjectId: 'thefactory-knowledge',
          status: 'completed',
          references: ['@thefactory-references:refs/fastcontext.md'],
          description: 'not exposed',
          requestedBy: { fromProjectId: 'p1' },
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-21T00:00:00.000Z',
        },
        {
          id: 'fr2',
          title: 'No references',
          targetProjectId: 'thefactory-tools',
          status: 'pending',
          requestedBy: { fromProjectId: 'p1' },
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
        },
      ],
    } as never)
    expect(await dispatchWorkBridge('p1', { type: 'requests.list' })).toEqual([
      {
        id: 'fr1',
        title: 'Explorer subagent',
        targetProjectId: 'thefactory-knowledge',
        status: 'completed',
        references: ['@thefactory-references:refs/fastcontext.md'],
        updatedAt: '2026-10-21T00:00:00.000Z',
      },
      {
        id: 'fr2',
        title: 'No references',
        targetProjectId: 'thefactory-tools',
        status: 'pending',
        references: [],
        updatedAt: '2026-10-20T00:00:00.000Z',
      },
    ])
    expect(listFeatureRequests).toHaveBeenCalledWith({
      query: { fromProjectId: 'p1' },
      throwOnError: true,
    })
  })

  it.each(['stories.list', 'runs.list', 'requests.list'])(
    'returns [] without a project for %s',
    async (type) => {
      expect(
        await dispatchWorkBridge(
          undefined,
          { type },
          {
            stories: [story],
            isLoaded: true,
            loadError: null,
          },
        ),
      ).toEqual([])
      expect(listStories).not.toHaveBeenCalled()
      expect(listProcessRuns).not.toHaveBeenCalled()
      expect(listFeatureRequests).not.toHaveBeenCalled()
    },
  )

  it.each(['projects.list', 'data.read', 'stories.create', 'runs.start'])(
    'passes through %s',
    async (type) => {
      expect(await dispatchWorkBridge('p1', { type })).toBeUndefined()
      expect(await dispatchWorkBridge(undefined, { type })).toBeUndefined()
      expect(listStories).not.toHaveBeenCalled()
      expect(listProcessRuns).not.toHaveBeenCalled()
    },
  )

  it.each(['stories.list', 'runs.list', 'requests.list'])(
    'surfaces readable backend errors for %s',
    async (type) => {
      const error = { response: { data: { error: 'Project is unavailable' } }, message: 'HTTP 404' }
      vi.mocked(listStories).mockRejectedValueOnce(error)
      vi.mocked(listProcessRuns).mockRejectedValueOnce(error)
      vi.mocked(listFeatureRequests).mockRejectedValueOnce(error)
      await expect(dispatchWorkBridge('p1', { type })).rejects.toThrow('Project is unavailable')
    },
  )

  it('surfaces the story provider load error instead of a misleading empty list', async () => {
    await expect(
      dispatchWorkBridge(
        'p1',
        { type: 'stories.list' },
        {
          stories: [],
          isLoaded: true,
          loadError: new Error('Story loading failed'),
        },
      ),
    ).rejects.toThrow('Story loading failed')
  })

  it('returns [] for empty backend results', async () => {
    vi.mocked(listStories).mockResolvedValueOnce({ data: [] } as never)
    vi.mocked(listProcessRuns).mockResolvedValueOnce({ data: [] } as never)
    expect(await dispatchWorkBridge('p1', { type: 'stories.list' })).toEqual([])
    expect(await dispatchWorkBridge('p1', { type: 'runs.list' })).toEqual([])
  })
})
