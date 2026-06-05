import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  runAnalysisJob: vi.fn(),
}))

import { runAnalysisJob } from './generated'
import { dispatchAnalysisBridge } from './analysisBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchAnalysisBridge', () => {
  it('runs the named job for analysis.run, passing jobName, params, and the agent config id', async () => {
    asMock(runAnalysisJob).mockResolvedValue({
      data: { records: [{ type: 'opportunity', key: 'latest', content: { items: [] } }] },
    })
    const res = await dispatchAnalysisBridge(
      'p1',
      { type: 'overseer:analysis.run', payload: { jobName: 'opportunities', params: { a: 1 } } },
      'cfg-agent',
    )
    expect(runAnalysisJob).toHaveBeenCalledWith({
      path: { projectId: 'p1', jobName: 'opportunities' },
      body: { llmConfigId: 'cfg-agent', params: { a: 1 } },
      throwOnError: true,
    })
    expect(res).toEqual({
      records: [{ type: 'opportunity', key: 'latest', content: { items: [] } }],
    })
  })

  it('returns undefined for non-analysis messages', async () => {
    expect(await dispatchAnalysisBridge('p1', { type: 'overseer:data.query' })).toBeUndefined()
    expect(runAnalysisJob).not.toHaveBeenCalled()
  })

  it('throws without an active project', async () => {
    await expect(
      dispatchAnalysisBridge(undefined, {
        type: 'overseer:analysis.run',
        payload: { jobName: 'opportunities' },
      }),
    ).rejects.toThrow(/project/i)
  })

  it('throws when analysis.run has no jobName', async () => {
    await expect(
      dispatchAnalysisBridge('p1', { type: 'overseer:analysis.run', payload: {} }),
    ).rejects.toThrow(/jobName/i)
    expect(runAnalysisJob).not.toHaveBeenCalled()
  })

  it('throws for an unknown analysis op', async () => {
    await expect(
      dispatchAnalysisBridge('p1', { type: 'overseer:analysis.frobnicate' }),
    ).rejects.toThrow()
  })
})
