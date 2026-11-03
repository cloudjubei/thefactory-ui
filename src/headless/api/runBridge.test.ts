import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchRunBridge } from './runBridge'
import { getProcessRun, listProcessRuns, type ProcessRun } from './generated'
import {
  APP_RUN_NO_PROJECT,
  APP_RUN_OTHER_PROJECT,
  APP_RUN_QUERY_INVALID,
} from '../utils/appRunStateConstants'

vi.mock('./generated', () => ({ getProcessRun: vi.fn(), listProcessRuns: vi.fn() }))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

const plan = (steps: Array<{ id: string; name: string }>) => ({
  definitionId: 'd',
  definitionScope: 'global',
  definitionVersion: 1,
  name: 'D',
  steps: steps.map((s) => ({ ...s, kind: 'agent' })),
  loops: [],
  frozenAt: 0,
})

const run = (over: Partial<ProcessRun> = {}) =>
  ({
    id: 'root',
    projectId: 'wargames',
    storyId: 's1',
    title: 'Official sources: apply r4',
    status: 'running',
    plan: plan([{ id: 'features:f1', name: 'Apply source revision r4' }]),
    cursor: { stepId: 'features:f1', iteration: 1 },
    loopCounts: {},
    ledger: [
      {
        id: 'e1',
        stepId: 'features:f1',
        iteration: 1,
        status: 'running',
        startedAt: 0,
        childRunId: 'child',
      },
    ],
    startedAt: 5,
    updatedAt: 10,
    ...over,
  }) as unknown as ProcessRun

const child = run({
  id: 'child',
  parentRunId: 'root',
  plan: plan([{ id: 'implement', name: 'Implement' }]) as never,
  cursor: { stepId: 'implement', iteration: 1 },
  ledger: [],
  updatedAt: 20,
})

const notFound = Object.assign(new Error('nf'), { isAxiosError: true, response: { status: 404 } })

function runs(...known: ProcessRun[]) {
  asMock(getProcessRun).mockImplementation(async ({ path }: { path: { runId: string } }) => {
    const found = known.find((r) => r.id === path.runId)
    if (!found) throw notFound
    return { data: found }
  })
}

const read = (payload: unknown) =>
  dispatchRunBridge('wargames', { type: 'overseer:run.read', payload })

beforeEach(() => vi.resetAllMocks())

describe('dispatchRunBridge', () => {
  it('passes through every other message', async () => {
    expect(await dispatchRunBridge('wargames', { type: 'overseer:runs.list' })).toBeUndefined()
    expect(getProcessRun).not.toHaveBeenCalled()
  })

  it('reads a run by its id, down to the step its nested run is on', async () => {
    runs(run(), child)
    expect(await read({ runId: 'root' })).toEqual({
      id: 'root',
      storyId: 's1',
      title: 'Official sources: apply r4',
      state: 'running',
      step: 'Apply source revision r4 · Implement',
      updatedAt: 20,
    })
  })

  it('reads the run alone when its nested run cannot be read', async () => {
    runs(run())
    expect(await read({ runId: 'root' })).toMatchObject({ step: 'Apply source revision r4' })
  })

  it('answers null for a run that is gone', async () => {
    runs()
    expect(await read({ runId: 'gone' })).toBeNull()
  })

  it('refuses another project’s run, and a nested run of another project is not followed', async () => {
    runs(run({ projectId: 'other' }))
    await expect(read({ runId: 'root' })).rejects.toThrow(APP_RUN_OTHER_PROJECT)
    runs(run(), { ...child, projectId: 'other' } as ProcessRun)
    expect(await read({ runId: 'root' })).toMatchObject({ step: 'Apply source revision r4' })
  })

  it('reads a story’s newest top run of this project', async () => {
    asMock(listProcessRuns).mockResolvedValue({
      data: [
        run({ id: 'old', startedAt: 1, ledger: [] }),
        run({ id: 'new', startedAt: 9, ledger: [] }),
        run({ id: 'elsewhere', startedAt: 99, projectId: 'other', ledger: [] }),
      ],
    })
    expect(await read({ storyId: 's1' })).toMatchObject({ id: 'new' })
    expect(asMock(listProcessRuns).mock.calls[0][0].query).toEqual({
      projectId: 'wargames',
      storyId: 's1',
      rootOnly: true,
    })
  })

  it('answers null for a story with no run', async () => {
    asMock(listProcessRuns).mockResolvedValue({ data: [] })
    expect(await read({ storyId: 's1' })).toBeNull()
  })

  it('refuses a read that names no run, and one with no project', async () => {
    await expect(read({})).rejects.toThrow(APP_RUN_QUERY_INVALID)
    await expect(
      dispatchRunBridge(undefined, { type: 'overseer:run.read', payload: { runId: 'r' } }),
    ).rejects.toThrow(APP_RUN_NO_PROJECT)
  })

  it('says why a run could not be read', async () => {
    asMock(getProcessRun).mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 500, data: { error: 'Disk full' } },
      }),
    )
    await expect(read({ runId: 'root' })).rejects.toThrow('Disk full')
  })
})
