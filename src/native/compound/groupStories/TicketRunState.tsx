import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { TICKET_RUN_TEXT, type TicketRunOpen, type TicketRunState } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

type Opens = {
  run: TicketRunState
  /** Open the run; without it the run is only said. */
  onOpen?: ((open: TicketRunOpen) => void) | undefined
}

/** Native peer of web's `TicketRunDot`: the run's dot in its badge's tone. */
export function TicketRunDot({ run }: { run: TicketRunState }) {
  const { status } = useNativeTheme()
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: status[run.tone].bg,
        borderWidth: 1,
        borderColor: status[run.tone].softBorder,
      }}
    />
  )
}

function Words({ run, size }: { run: TicketRunState; size: number }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ flexShrink: 1, fontSize: size }}>
      <Text style={{ fontWeight: '500', color: theme.text.primary }}>{run.name}</Text>
      <Text style={{ color: theme.text.muted }}> · </Text>
      <Text
        style={
          run.asks
            ? { fontWeight: '500', color: theme.text.primary }
            : { color: theme.text.secondary }
        }
      >
        {run.state}
      </Text>
    </Text>
  )
}

/** Native peer of web's `TicketRunLine`: the run in a line under the row, tinted while it waits on the person, with Open run. */
export function TicketRunLine({ run, onOpen }: Opens) {
  const { theme, status } = useNativeTheme()
  const tone = status[run.tone]
  return (
    <View
      accessibilityLabel={`${run.label}. ${run.hint}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 4,
        backgroundColor: run.asks ? tone.softBg : theme.surface.muted,
        borderWidth: run.asks ? 1 : 0,
        borderColor: tone.softBorder,
      }}
    >
      <TicketRunDot run={run} />
      <Words run={run} size={12} />
      {onOpen ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={TICKET_RUN_TEXT.openRunHint(run.label)}
          style={{ marginLeft: 'auto' }}
          onPress={() => onOpen(run.open)}
        >
          <Text style={{ fontSize: 12, color: theme.accent.primary }}>
            {TICKET_RUN_TEXT.openRun} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Native peer of web's `TicketRunChip`: the run as a chip among the row's chips; pressing it opens the run. */
export function TicketRunChip({ run, onOpen }: Opens) {
  const { status } = useNativeTheme()
  const tone = status[run.tone]
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    maxWidth: 320,
    borderRadius: nativeRadii.round,
    borderWidth: 1,
    borderColor: tone.softBorder,
    backgroundColor: tone.softBg,
    paddingHorizontal: nativeSpace[2],
    paddingVertical: 1,
  }
  const body = (
    <>
      <TicketRunDot run={run} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 11, color: tone.softFg }}>
        {run.label}
      </Text>
    </>
  )
  return onOpen ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${run.hint} — ${TICKET_RUN_TEXT.openRun}`}
      style={style}
      onPress={() => onOpen(run.open)}
    >
      {body}
    </Pressable>
  ) : (
    <View accessibilityLabel={run.hint} style={style}>
      {body}
    </View>
  )
}

/** Native peer of web's `TicketRunWords`: a dot and the run's words beside the row's chips; pressing them opens it. */
export function TicketRunWords({ run, onOpen }: Opens) {
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flexShrink: 1,
  }
  const body = (
    <>
      <TicketRunDot run={run} />
      <Words run={run} size={12} />
    </>
  )
  return onOpen ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${run.hint} — ${TICKET_RUN_TEXT.openRun}`}
      style={style}
      onPress={() => onOpen(run.open)}
    >
      {body}
    </Pressable>
  ) : (
    <View accessibilityLabel={run.hint} style={style}>
      {body}
    </View>
  )
}

/** Native peer of web's `TicketRunStrip`: the run on top of a ticket's page, Open run, and the run's own card under it. */
export function TicketRunStrip({ run, onOpen, card }: Opens & { card?: ReactNode }) {
  const { theme, status } = useNativeTheme()
  const tone = status[run.tone]
  return (
    <View
      accessibilityLabel={run.label}
      style={{
        gap: nativeSpace[2],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: tone.softBorder,
        backgroundColor: tone.softBg,
        padding: nativeSpace[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <TicketRunDot run={run} />
          <Words run={run} size={13} />
        </View>
        {onOpen ? (
          <Button size="sm" variant="secondary" onPress={() => onOpen(run.open)}>
            {TICKET_RUN_TEXT.openRun}
          </Button>
        ) : null}
      </View>
      {!card && run.hint !== run.state ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{run.hint}</Text>
      ) : null}
      {card ? (
        <View
          style={{
            gap: nativeSpace[2],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            padding: nativeSpace[3],
          }}
        >
          {card}
        </View>
      ) : null}
    </View>
  )
}
