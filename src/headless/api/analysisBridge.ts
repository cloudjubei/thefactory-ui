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
      const res = await runAnalysisJob({
        path: { projectId, jobName: payload.jobName },
        body: { llmConfigId, params: payload.params },
        throwOnError: true,
      })
      return res.data
    }
    default:
      throw new Error(`Unknown analysis bridge op: ${name}`)
  }
}
