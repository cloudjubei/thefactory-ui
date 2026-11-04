import { useState } from 'react'
import { Pressable, Text } from 'react-native'

import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface InlineStopConfirmProps {
  ask: string
  stop: string
  keep: string
  /** What the first press would stop, for a screen reader. */
  label: string
  onStop: () => void
}

/** A Stop that asks in place: work ends only on the second press. */
export default function InlineStopConfirm({
  ask,
  stop,
  keep,
  label,
  onStop,
}: InlineStopConfirmProps) {
  const { theme, status } = useNativeTheme()
  const [asking, setAsking] = useState(false)
  const text = { fontSize: 12, color: theme.text.secondary }
  if (!asking) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setAsking(true)}
        hitSlop={8}
      >
        <Text style={text}>{stop}</Text>
      </Pressable>
    )
  }
  return (
    <>
      <Text style={text}>{ask}</Text>
      <Pressable accessibilityRole="button" onPress={onStop} hitSlop={8}>
        <Text style={{ ...text, color: status.stuck.softFg }}>{stop}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setAsking(false)} hitSlop={8}>
        <Text style={text}>{keep}</Text>
      </Pressable>
    </>
  )
}
