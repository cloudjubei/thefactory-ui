import { Pressable, Text, View } from 'react-native'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import type { WorkLaunchOptionView } from '../../headless/utils/workLaunchViewTypes'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'

export type WorkLaunchChooserProps = {
  /** The two ways, the project's last one first-picked — `workLaunchOptions`. */
  options: WorkLaunchOptionView[]
  /** Start the work this way. The host owns the call. */
  onChoose: (mode: WorkLaunchMode) => void
  /** Close the choice without starting anything. */
  onCancel?: () => void
  busy?: boolean
}

/**
 * The one choice every "start work" makes — a process run, or in this chat — one tap each, the
 * project's last way picked first. The native peer of the web chooser.
 */
export default function WorkLaunchChooser({
  options,
  onChoose,
  onCancel,
  busy,
}: WorkLaunchChooserProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {options.map((option) => (
        <Pressable
          key={option.mode}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          disabled={busy}
          onPress={() => onChoose(option.mode)}
          style={{
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[2],
            gap: 2,
            opacity: busy ? 0.6 : 1,
            borderColor: option.preselected ? theme.accent.primary : theme.border.default,
            backgroundColor: option.preselected ? theme.surface.raised : theme.surface.base,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
            {option.label}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{option.hint}</Text>
        </Pressable>
      ))}
      {onCancel ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" onPress={onCancel} disabled={busy}>
            Cancel
          </Button>
        </View>
      ) : null}
    </View>
  )
}
