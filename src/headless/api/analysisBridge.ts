import { runAnalysisJob } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:analysis.*` bridge request on behalf of an embedded app.
 * Returns `undefined` for messages that aren't `analysis.*` (so the host can
 * compose other handlers). The bearer credential never leaves the host; the
 * job writes its result to project storage, which the app re-reads via `data.*`.
 */
export async function dispatchAnalysisBridge(
  projectId: string | undefined,
  req: BridgeRequest,
  llmConfigId?: string,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('analysis.')) return undefined
  if (!projectId) {
    throw new Error('Cannot handle an analysis bridge request without an active project')
  }

  switch (name) {
    case 'analysis.run': {
      const payload = (req.payload ?? {}) as {
        jobName?: string
        params?: Record<string, unknown>
      }
      if (!payload.jobName) {
        throw new Error('analysis.run requires a jobName')
      }
      try {
        const res = await runAnalysisJob({
          path: { projectId, jobName: payload.jobName },
          body: { llmConfigId, params: payload.params },
          throwOnError: true,
        })
        return res.data
      } catch (err) {
        throw analysisRunError(err)
      }
    }
    default:
      throw new Error(`Unknown analysis bridge op: ${name}`)
  }
}

/**
 * Lift the backend's real message out of the axios error. The generated client
 * rethrows a raw `AxiosError` whose `.message` is a generic "status code 500";
 * the useful cause (`sendError`'s `{ error }` body) lives on `response.data.error`.
 */
function analysisRunError(err: unknown): Error {
  const e = err as { response?: { data?: { error?: unknown } }; message?: unknown }
  const detail = e?.response?.data?.error
  if (typeof detail === 'string' && detail.trim()) return new Error(detail)
  if (err instanceof Error) return err
  if (typeof e?.message === 'string' && e.message) return new Error(e.message)
  return new Error('Analysis request failed')
}
