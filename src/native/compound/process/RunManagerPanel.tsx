import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_MANAGER_DISCUSS_LABEL,
  PROCESS_MANAGER_FOUND_LABEL,
  PROCESS_MANAGER_NEEDS_YOU_TITLE,
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  PROCESS_MANAGER_TRIED_LABEL,
  PROCESS_MANAGER_WHY_LABEL,
  type ProcessRunManagerView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type RunManagerPanelProps = {
  view: ProcessRunManagerView
  /** Open the run's chat, where the manager works and the person can carry on. */
  onOpenChat?: () => void
}

/** Native peer of web's `RunManagerPanel`. */
export default function RunManagerPanel({ view, onOpenChat }: RunManagerPanelProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const { status: state, escalation, preRead, handled } = view
  if (!state && !preRead && handled.lines.length === 0) return null
  const box = {
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: nativeRadii[2],
    backgroundColor: theme.surface.base,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  } as const
  const heading = {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.text.muted,
  } as const
  return (
    <View style={{ marginHorizontal: nativeSpace[3], marginTop: nativeSpace[3], gap: 8 }}>
      {state && state.state !== 'escalated' ? (
        <View
          accessibilityRole="text"
          style={{
            borderWidth: 1,
            borderColor: status.working.softBorder,
            backgroundColor: status.working.softBg,
            borderRadius: nativeRadii[2],
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: status.working.softFg }}>{state.text}</Text>
        </View>
      ) : null}
      {escalation ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: status.on_hold.softBorder,
            backgroundColor: status.on_hold.softBg,
            borderRadius: nativeRadii[3],
            padding: 12,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: status.on_hold.softFg }}>
            {PROCESS_MANAGER_NEEDS_YOU_TITLE} — {escalation.reason}
          </Text>
          {escalation.what.map((line) => (
            <Text key={line} style={{ fontSize: 12, color: theme.text.secondary }}>
              {line}
            </Text>
          ))}
          <Text style={{ fontSize: 12, color: theme.text.primary }}>
            <Text style={{ fontWeight: '600' }}>{PROCESS_MANAGER_FOUND_LABEL}: </Text>
            {escalation.found}
          </Text>
          {escalation.tried.length > 0 ? (
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
                {PROCESS_MANAGER_TRIED_LABEL}
              </Text>
              {escalation.tried.map((t) => (
                <Text key={t} style={{ fontSize: 12, color: theme.text.secondary }}>
                  • {t}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 12, color: theme.text.primary }}>
            <Text style={{ fontWeight: '600' }}>{PROCESS_MANAGER_RECOMMENDS_LABEL}: </Text>
            {escalation.recommendation}
            {escalation.recommendedChoice ? ` (${escalation.recommendedChoice})` : ''}
          </Text>
          {onOpenChat ? (
            <Button size="sm" variant="secondary" onPress={onOpenChat}>
              {PROCESS_MANAGER_DISCUSS_LABEL}
            </Button>
          ) : null}
        </View>
      ) : null}
      {preRead ? (
        <View style={box}>
          <Text style={heading}>{PROCESS_MANAGER_PRE_READ_TITLE}</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{preRead.summary}</Text>
          {preRead.items.map((item) => (
            <View key={item.itemId}>
              <Text style={{ fontSize: 12, color: theme.text.primary }}>{item.finding}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {PROCESS_MANAGER_RECOMMENDS_LABEL}: {item.recommendation}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {handled.lines.length > 0 ? (
        <View style={box}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
          >
            <Text style={heading}>
              {handled.title} {open ? '▾' : '▸'}
            </Text>
          </Pressable>
          {open
            ? handled.lines.map((line) => (
                <View key={line.key}>
                  <Text style={{ fontSize: 12, color: theme.text.primary }}>{line.what}</Text>
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    {PROCESS_MANAGER_WHY_LABEL} {line.why} →{' '}
                    <Text style={{ color: status[line.tone].softFg }}>{line.result}</Text>
                  </Text>
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}
