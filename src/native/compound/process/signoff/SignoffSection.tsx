import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronDown } from '../../../icons'

export type SignoffSectionProps = {
  title: string
  summary?: string
  defaultOpen?: boolean
  attention?: boolean
  children: ReactNode
}

/**
 * Native peer of web's `SignoffSection`: one collapsible section of the code
 * review or the report, with the same header everywhere — title, one-line
 * summary, chevron.
 */
export default function SignoffSection({
  title,
  summary,
  defaultOpen = false,
  attention = false,
  children,
}: SignoffSectionProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: attention ? status.working.softFg : theme.text.primary,
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: theme.text.secondary }}
        >
          {summary ?? ''}
        </Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open ? <View style={{ paddingBottom: 14 }}>{children}</View> : null}
    </View>
  )
}
