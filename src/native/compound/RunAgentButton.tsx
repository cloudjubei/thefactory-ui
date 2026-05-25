import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import ActionMenu, { type ActionMenuItem } from './ActionMenu'

/**
 * Agent-run button + picker — native peer of web's `RunAgentButton`. A plain
 * tap starts the default `developer` agent; a long-press opens a picker of all
 * agent types. Purely presentational: the host wires `onSelect` to actually
 * dispatch the run (see the app-side connected wrapper).
 */

export type AgentRunType = 'developer' | 'tester' | 'planner' | 'contexter' | 'speccer'

export const AGENT_RUN_TYPES: readonly AgentRunType[] = [
  'speccer',
  'planner',
  'contexter',
  'tester',
  'developer',
]

export const AGENT_RUN_TYPE_LABELS: Record<AgentRunType, string> = {
  speccer: 'Speccer',
  planner: 'Planner',
  contexter: 'Contexter',
  tester: 'Tester',
  developer: 'Developer',
}

export interface RunAgentButtonProps {
  /**
   * Receives the chosen agent type: `'developer'` on a plain tap, any type
   * picked from the long-press menu.
   */
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const accent = theme.accent.primary

  const items: ActionMenuItem[] = AGENT_RUN_TYPES.map((type) => ({
    key: type,
    label: AGENT_RUN_TYPE_LABELS[type],
    onPress: () => {
      setPickerOpen(false)
      onSelect(type)
    },
  }))

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Run agent"
        accessibilityHint="Tap to run the developer agent, long-press to choose an agent type"
        disabled={disabled}
        onPress={() => onSelect('developer')}
        onLongPress={() => setPickerOpen(true)}
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
      <ActionMenu
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Run agent"
        actions={items}
      />
    </>
  )
}
