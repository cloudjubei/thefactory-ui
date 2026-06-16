import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import { cliTranscriptEntryView } from '../../../headless/utils/cliRunner'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
}

function kindColor(kind: CliRunTranscriptEntry['kind']): string {
  if (kind === 'assistant') return nativePalette.blue[700]
  if (kind === 'tool-call') return nativePalette.orange[700]
  if (kind === 'tool-result') return nativePalette.green[700]
  return nativePalette.gray[600]
}

function TranscriptRow({ entry }: { entry: CliRunTranscriptEntry }) {
  const { theme } = useNativeTheme()
  const { label, detail, raw } = cliTranscriptEntryView(entry)
  const [open, setOpen] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const hasRaw = raw !== detail
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 4 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{open ? '▾' : '▸'}</Text>
        <Text style={{ fontSize: 12, fontWeight: '500', color: kindColor(entry.kind) }}>{label}</Text>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 8 }}>
          <Text style={{ fontSize: 11, color: theme.text.primary }}>{detail}</Text>
          {hasRaw ? (
            <View>
              <Text
                onPress={() => setShowRaw((v) => !v)}
                style={{ fontSize: 11, color: theme.text.secondary, textDecorationLine: 'underline' }}
              >
                {showRaw ? 'Hide raw payload' : 'Show raw payload'}
              </Text>
              {showRaw ? (
                <Text style={{ marginTop: 4, fontSize: 11, color: theme.text.secondary }}>{raw}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/**
 * Native mirror of web's `CliRunTranscript`: a collapsible inspector for a CLI
 * run's step-by-step transcript (assistant messages, tool calls/results,
 * protocol events). Each row expands to the readable content with a "show raw
 * payload" toggle for thorough inspection.
 */
export default function CliRunTranscript({ entries }: CliRunTranscriptProps) {
  const { theme } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {expanded ? '▾' : '▸'} Run steps ({entries.length})
        </Text>
      </Pressable>
      {expanded ? (
        <View style={{ gap: 6 }}>
          {entries.map((entry, i) => (
            <TranscriptRow key={i} entry={entry} />
          ))}
        </View>
      ) : null}
    </View>
  )
}
