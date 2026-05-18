import { Pressable } from 'react-native'
import StatusChip, { type ChipState } from '../chips/StatusChip'

export interface AgentRunBulletData {
  agentRunId?: string
  state?: ChipState
  provider?: string
  model?: string
}

export interface AgentRunBulletProps {
  run: AgentRunBulletData
  onPress?: () => void
}

export default function AgentRunBullet({ run, onPress }: AgentRunBulletProps) {
  const state = run.state ?? 'created'
  const provider = run.provider ?? 'unknown'
  const model = run.model ?? 'unknown'
  const label = `Agent Run ${run.agentRunId?.slice(0, 8) ?? '?'} · ${state} · ${provider} · ${model}`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <StatusChip state={state} />
    </Pressable>
  )
}
