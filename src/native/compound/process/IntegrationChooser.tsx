import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_INTEGRATION_CANCEL,
  PROCESS_INTEGRATION_CHOOSER_HEAD,
  PROCESS_INTEGRATION_CHOOSER_NOTE,
  processIntegrationChoices,
  type ProcessIntegrationMode,
  type ProcessWorkBranch,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type IntegrationChooserProps = {
  /** The branch the work is on, and the branch it goes back to. */
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>
  /** The question heading the choices. */
  head?: string
  busy?: boolean
  onChoose: (mode: ProcessIntegrationMode) => void
  onCancel: () => void
}

/**
 * How approved work comes in — merge, merge as one commit, or a pull request —
 * each with the one line that says what it does, in place of the decide row.
 * The native peer of the web `IntegrationChooser`.
 */
export default function IntegrationChooser({
  workBranch,
  head = PROCESS_INTEGRATION_CHOOSER_HEAD,
  busy = false,
  onChoose,
  onCancel,
}: IntegrationChooserProps) {
  const { theme } = useNativeTheme()
  return (
    <View accessibilityLabel={head} style={{ width: '100%', gap: nativeSpace[2] }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>{head}</Text>
      <View style={{ gap: 6 }}>
        {processIntegrationChoices(workBranch).map((choice) => (
          <Pressable
            key={choice.mode}
            accessibilityRole="button"
            accessibilityLabel={choice.label}
            accessibilityHint={choice.detail}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onChoose(choice.mode)}
            style={({ pressed }) => ({
              gap: 2,
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: pressed ? theme.accent.primary : theme.border.default,
              backgroundColor: theme.surface.raised,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              opacity: busy ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              {choice.label}
            </Text>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{choice.detail}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontSize: 11, color: theme.text.muted }}>
        {PROCESS_INTEGRATION_CHOOSER_NOTE}
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Button size="sm" variant="ghost" disabled={busy} onPress={onCancel}>
          {PROCESS_INTEGRATION_CANCEL}
        </Button>
      </View>
    </View>
  )
}
