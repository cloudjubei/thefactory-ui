import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { RUN_DETAILS_COPY, useRunDiagnostics, type RunDiagnosticsEvent } from '../../../headless'
import type { ProcessStatusTone } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'

export type RunDiagnosticsViewProps = {
  /** The run whose flight recorder to show. */
  runId: string
  /** Whether the viewer has Debug mode on — the caller owns the gate. */
  enabled: boolean
}

const LEVEL_TONE: Record<RunDiagnosticsEvent['level'], ProcessStatusTone> = {
  error: 'blocked',
  warn: 'on_hold',
  info: 'queued',
}

/**
 * Native peer of
 * [web's `RunDiagnosticsView`](../../../web/compound/process/RunDiagnosticsView.tsx).
 * The per-run flight recorder, folded to one line until opened and fetched only
 * once opened; shown only in Debug mode.
 */
export default function RunDiagnosticsView({ runId, enabled }: RunDiagnosticsViewProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  if (!enabled) return null
  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        marginBottom: nativeSpace[4],
        borderRadius: nativeRadii[4],
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[2],
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.muted} />
        </View>
        <Text
          style={{
            fontSize: 10.5,
            fontWeight: '600',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {RUN_DETAILS_COPY.debug}
        </Text>
      </Pressable>
      {open ? <RunDiagnosticsPanel runId={runId} /> : null}
    </View>
  )
}

function RunDiagnosticsPanel({ runId }: { runId: string }) {
  const { theme } = useNativeTheme()
  const { diagnostics, isLoaded, loadError } = useRunDiagnostics(runId, { enabled: true })
  const events = diagnostics?.events ?? []
  const pad = { paddingHorizontal: nativeSpace[4], paddingVertical: nativeSpace[2] }
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
      <Text
        style={{ ...pad, paddingVertical: nativeSpace[1], fontSize: 10.5, color: theme.text.muted }}
      >
        {RUN_DETAILS_COPY.events(events.length, diagnostics?.truncated === true)}
      </Text>
      {loadError ? (
        <Text style={{ ...pad, fontSize: 11, color: theme.text.secondary }}>
          {loadError.message}
        </Text>
      ) : !isLoaded ? (
        <Text style={{ ...pad, fontSize: 11, color: theme.text.muted }}>Loading diagnostics…</Text>
      ) : events.length === 0 ? (
        <Text style={{ ...pad, fontSize: 11, color: theme.text.muted }}>
          No diagnostics recorded for this run.
        </Text>
      ) : (
        events.map((event, i) => <EventRow key={i} event={event} />)
      )}
    </View>
  )
}

function EventRow({ event }: { event: RunDiagnosticsEvent }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const tone = status[LEVEL_TONE[event.level] ?? 'queued']
  const hasData = event.data !== undefined && Object.keys(event.data).length > 0
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[1],
      }}
    >
      <Pressable
        accessibilityRole="button"
        disabled={!hasData}
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}
      >
        <View
          style={{ marginTop: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: tone.fg }}
        />
        <Text style={{ fontSize: 10, color: theme.text.muted }}>
          {new Date(event.at).toLocaleTimeString()}
        </Text>
        <Text
          style={{
            fontSize: 9.5,
            textTransform: 'uppercase',
            color: theme.text.muted,
            backgroundColor: theme.surface.muted,
            paddingHorizontal: 3,
            borderRadius: 3,
          }}
        >
          {event.phase}
        </Text>
        <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.primary }}>{event.message}</Text>
        {hasData ? (
          <Text style={{ fontSize: 10, color: theme.text.muted }}>{open ? '−' : '+'}</Text>
        ) : null}
      </Pressable>
      {open && hasData ? (
        <Text
          style={{
            marginTop: 4,
            marginLeft: 14,
            fontSize: 10.5,
            fontFamily: 'Courier',
            color: theme.text.secondary,
          }}
        >
          {JSON.stringify(event.data, null, 2)}
        </Text>
      ) : null}
    </View>
  )
}
