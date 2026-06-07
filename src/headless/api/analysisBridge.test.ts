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

  it('surfaces the real backend error message from the axios response body', async () => {
    // The generated client (throwOnError) rejects with a raw AxiosError whose
    // `.message` is generic; the useful cause lives on response.data.error.
    asMock(runAnalysisJob).mockRejectedValue({
      message: 'Request failed with status code 500',
      response: { data: { error: 'Web search failed: Exa returned 429 (rate limit)' } },
    })
    await expect(
      dispatchAnalysisBridge('p1', {
        type: 'overseer:analysis.run',
        payload: { jobName: 'news', params: {} },
      }),
    ).rejects.toThrow('Web search failed: Exa returned 429 (rate limit)')
  })

  it('falls back to the error message when no response body is present', async () => {
    asMock(runAnalysisJob).mockRejectedValue(new Error('Network Error'))
    await expect(
      dispatchAnalysisBridge('p1', {
        type: 'overseer:analysis.run',
        payload: { jobName: 'news', params: {} },
      }),
    ).rejects.toThrow('Network Error')
  })
})
