import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { formatDurationMs } from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { Button } from '../../../primitives/Button'

export type WorkBarProps = {
  /** What is running — "Verifying on a device", "Capturing screens". */
  label: string
  /** When this work started, so the bar can say how long it has been going. */
  startedAtMs: number | undefined
  /** Stops the work; omitted when the host has nothing to stop. */
  onCancel?: () => void
  cancelling?: boolean
}

/**
 * Takes the decision bar's place while an agent is producing evidence. Replaced,
 * not disabled: a greyed-out Approve still reads as a thing you could tap; a
 * bar that has become something else reads as a state you are in.
 */
export default function WorkBar({ label, startedAtMs, onCancel, cancelling }: WorkBarProps) {
  const { theme, status } = useNativeTheme()
  const working = status.working
  // A number that keeps moving is what separates "still working" from "stuck".
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAtMs === undefined) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAtMs])
  const elapsed =
    startedAtMs === undefined ? undefined : formatDurationMs(Math.max(0, now - startedAtMs))
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: working.softBorder,
        backgroundColor: working.softBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          height: 20,
          paddingHorizontal: 6,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: working.softBorder,
          backgroundColor: working.softBg,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: nativeRadii.round,
            backgroundColor: working.softFg,
          }}
        />
        <Text style={{ fontSize: 10, color: working.softFg }}>Agent working</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>{label}</Text>
      <ActivityIndicator size="small" color={working.softFg} />
      {elapsed ? <Text style={{ fontSize: 11, color: theme.text.muted }}>{elapsed}</Text> : null}
      <View style={{ flex: 1 }} />
      {onCancel ? (
        <Button size="sm" variant="ghost" disabled={cancelling} onPress={onCancel}>
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </Button>
      ) : null}
      <Text style={{ flexBasis: '100%', fontSize: 11.5, color: theme.text.secondary }}>
        Keep reading — tabs, evidence and the comparison overlay all still work.{' '}
        <Text style={{ fontWeight: '700', color: theme.text.primary }}>
          Sign-off comes back when this finishes.
        </Text>
      </Text>
    </View>
  )
}
