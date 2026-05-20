/**
 * Pure derivations for an agent-run shape.
 *
 * The library doesn't depend on `thefactory-tools`'s `Chat` — instead it
 * accepts the minimal structural slice it needs (`AgentRunLike`). Hosts pass
 * their own chat shape; TypeScript checks structural compat at the call site.
 */

export type AgentRunMessageLike = {
  role?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    cost?: number
  }
}

export type AgentRunLike = {
  messages: ReadonlyArray<AgentRunMessageLike>
  state?: string
  createdAt?: string | number
  updatedAt?: string | number
}

export type AgentRunUsage = {
  prompt: number
  completion: number
  userMessages: number
  assistantMessages: number
  /** Sum of per-message `usage.cost` values across assistant messages. May be
   *  0 when the host hasn't filled cost on messages — use the LLM-config
   *  pricing fallback below when this is unsuitable. */
  totalCostFromMessages: number
}

/** Aggregate token + cost + message counts from a run's messages. Pure. */
export function computeAgentRunUsage(run: AgentRunLike): AgentRunUsage {
  let prompt = 0
  let completion = 0
  let userMessages = 0
  let assistantMessages = 0
  let totalCostFromMessages = 0

  for (const m of run.messages) {
    const role = String(m.role ?? '').toLowerCase()
    if (role === 'user') userMessages += 1
    if (role === 'assistant') {
      assistantMessages += 1
      prompt += m.usage?.promptTokens ?? 0
      completion += m.usage?.completionTokens ?? 0
      totalCostFromMessages += m.usage?.cost ?? 0
    }
  }

  return { prompt, completion, userMessages, assistantMessages, totalCostFromMessages }
}

export type LLMPriceLike = {
  costInputPerMTokensUSD?: number
  costOutputPerMTokensUSD?: number
}

/** Pricing math: USD cost from prompt+completion tokens and per-1M USD prices. */
export function computeCostUSD(prompt: number, completion: number, price?: LLMPriceLike): number {
  if (!price) return 0
  const input = price.costInputPerMTokensUSD ?? 0
  const output = price.costOutputPerMTokensUSD ?? 0
  return (input * prompt) / 1_000_000 + (output * completion) / 1_000_000
}

/**
 * Run duration relative to a `now` epoch ms. For `running`/`created` runs,
 * the end time is `now`; for terminated runs it's `updatedAt`. The
 * `thinkingMs` is the gap since the last update — used to surface "stalled"
 * runs whose stream has been silent for a while.
 */
export function computeRunDurations(
  run: AgentRunLike,
  nowMs: number,
): { startMs: number; thinkingMs: number } {
  const createMs = run.createdAt ? new Date(run.createdAt).getTime() : nowMs
  const lastUpdateMs = run.updatedAt ? new Date(run.updatedAt).getTime() : nowMs
  const endMs = run.state === 'running' || run.state === 'created' ? nowMs : lastUpdateMs
  return {
    startMs: Math.max(0, endMs - createMs),
    thinkingMs: Math.max(0, nowMs - lastUpdateMs),
  }
}
