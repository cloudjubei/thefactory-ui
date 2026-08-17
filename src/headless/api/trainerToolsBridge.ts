import { client } from './generated/client.gen'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * The trainer tools an embedded app may run synchronously through this bridge — the SAFE read / interactive
 * RPC subset (mirrors the backend route's gate). Compute-spending / record-mutating trainer tools are NOT
 * here; they stay behind the chat surface's approval flow.
 */
const SAFE_TRAINER_TOOLS = new Set(['playBoardGame', 'getRunGame'])

/**
 * Dispatch an `overseer:trainer.tool` bridge request: run ONE safe trainer tool against the active project
 * and return its result. Returns `undefined` for messages it doesn't own (so the host can compose other
 * handlers). The bearer credential never leaves the host — it rides the configured `client`.
 */
export async function dispatchTrainerToolsBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<unknown> {
  if (bridgeMessageName(req.type) !== 'trainer.tool') return undefined
  if (!projectId) throw new Error('Cannot run a trainer tool without an active project')
  const payload = (req.payload ?? {}) as { name?: string; args?: Record<string, unknown> }
  const name = payload.name
  if (!name || !SAFE_TRAINER_TOOLS.has(name)) {
    throw new Error(`trainer.tool: unknown or disallowed tool "${name ?? ''}"`)
  }
  const res = await client.post({
    responseType: 'json',
    security: [{ scheme: 'bearer', type: 'http' }],
    url: `/api/v1/projects/${encodeURIComponent(projectId)}/trainer-tools/${encodeURIComponent(name)}`,
    body: payload.args ?? {},
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return res.data
}
