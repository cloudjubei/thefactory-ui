import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { TOOL_STEPS_LABEL } from '../../../headless/utils/toolStepGroupsConstants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'

export type ToolStepsFoldProps = {
  /** How many tool-call rows this line stands for. */
  count: number
  /** Those rows, shown once the line is opened. */
  children: ReactNode
}

/**
 * Consecutive tool-call rows drawn as one "N steps" line. Closed until the
 * line is pressed, then the rows it stands for. Native peer of web's
 * `ToolStepsFold`.
 */
export default function ToolStepsFold({ count, children }: ToolStepsFoldProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const label = TOOL_STEPS_LABEL(count)
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={() => setOpen((value) => !value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[2],
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.overlay,
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevron size={14} color={theme.text.secondary} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary }}>
          {label}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: nativeSpace[2], gap: nativeSpace[2] }}>{children}</View>
      ) : null}
    </View>
  )
}
