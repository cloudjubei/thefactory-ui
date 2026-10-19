import { Pressable, Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

/**
 * Agent-run button — native peer of web's `RunAgentButton`. A tap starts the
 * `developer` agent. Purely presentational: the host wires `onSelect` to
 * actually dispatch the run (see the app-side connected wrapper).
 */

/**
 * The roles this button can start. See web's peer for why there is one: the
 * four prep roles were a hand-sequenced pipeline that a PROCESS now expresses
 * as data.
 */
export type AgentRunType = 'developer'

export const AGENT_RUN_TYPES: readonly AgentRunType[] = ['developer']

export const AGENT_RUN_TYPE_LABELS: Record<AgentRunType, string> = {
  developer: 'Developer',
}

export interface RunAgentButtonProps {
  /** Receives the agent type to run: always `'developer'`. */
  onSelect: (type: AgentRunType) => void
  /** Optional text label beside the play glyph; icon-only when omitted. */
  label?: string
  disabled?: boolean
}

function PlayGlyph({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 5,
        borderBottomWidth: 5,
        borderLeftWidth: 9,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        marginLeft: 1,
      }}
    />
  )
}

export default function RunAgentButton({ onSelect, label, disabled = false }: RunAgentButtonProps) {
  const { theme } = useNativeTheme()
  const accent = theme.accent.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Run agent"
      disabled={disabled}
      onPress={() => onSelect('developer')}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: nativeSpace[3],
        height: 30,
        width: label ? undefined : 30,
        paddingHorizontal: label ? nativeSpace[5] : 0,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: accent,
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <PlayGlyph color={accent} />
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: accent }}>{label}</Text>
      ) : null}
    </Pressable>
  )
}
