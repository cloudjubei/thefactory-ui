import type { MouseEvent } from 'react'
import StatusChip, { type ChipState } from '../chips/StatusChip'

export type AgentRunBulletData = {
  agentRunId?: string
  state?: ChipState
  provider?: string
  model?: string
}

export type AgentRunBulletProps = {
  run: AgentRunBulletData
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

/**
 * Compact button rendering an agent-run as a status chip. The aria/title
 * label surfaces the run id, state, and provider/model so it works as both
 * an inline indicator and an accessible launcher into the run details.
 *
 * Presentational only — caller wires `onClick` to its own navigation.
 */
export default function AgentRunBullet({ run, onClick }: AgentRunBulletProps) {
  const state = run.state ?? 'created'
  const provider = run.provider ?? 'unknown'
  const model = run.model ?? 'unknown'
  const label = `Agent Run ${run.agentRunId?.slice(0, 8) ?? '?'} · ${state} · ${provider} · ${model}`

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center p-0 m-0 bg-transparent border-0"
      style={{ lineHeight: 1 }}
    >
      <StatusChip state={state} />
    </button>
  )
}
