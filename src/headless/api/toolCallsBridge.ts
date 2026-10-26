import { getToolCallSlipStats, listToolCallSlips, type ListToolCallSlipsData } from './generated'
import { extractErrorMessage } from './errorMessage'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'
import {
  TOOL_CALL_SLIP_KINDS,
  TOOL_CALL_SLIP_STATS_MESSAGE,
  TOOL_CALL_SLIPS_MESSAGE,
} from '../utils/appBridgeConstants'

type SlipQuery = NonNullable<ListToolCallSlipsData['query']>

const isKind = (value: unknown): value is SlipQuery['kind'] =>
  (TOOL_CALL_SLIP_KINDS as readonly unknown[]).includes(value)

/** The query an app sent, keeping only the fields the backend reads, each of its own kind. */
export function toolCallSlipQueryOf(payload: unknown): SlipQuery {
  const p = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >
  const query: SlipQuery = {}
  if (typeof p.sinceDays === 'number' && Number.isFinite(p.sinceDays)) query.sinceDays = p.sinceDays
  if (typeof p.toolName === 'string' && p.toolName) query.toolName = p.toolName
  if (isKind(p.kind)) query.kind = p.kind
  if (typeof p.agent === 'string' && p.agent) query.agent = p.agent
  if (typeof p.limit === 'number' && Number.isInteger(p.limit) && p.limit > 0) query.limit = p.limit
  return query
}

/**
 * `overseer:toolCalls.slips` and `overseer:toolCalls.stats`: the tool calls
 * agents got wrong across every project — listed, or counted per tool — for an
 * app that shows where agents miscall tools. Other messages pass through.
 */
export async function dispatchToolCallsBridge(req: BridgeRequest): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (name !== TOOL_CALL_SLIPS_MESSAGE && name !== TOOL_CALL_SLIP_STATS_MESSAGE) return undefined
  const query = toolCallSlipQueryOf(req.payload)
  try {
    const res =
      name === TOOL_CALL_SLIPS_MESSAGE
        ? await listToolCallSlips({ query, throwOnError: true })
        : await getToolCallSlipStats({ query, throwOnError: true })
    return res.data
  } catch (err) {
    throw new Error(extractErrorMessage(err, 'Could not read tool-call slips'))
  }
}
