import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import {
  normalizeCliTranscript,
  type CliToolStepResultType,
  type CliTranscriptStep,
} from '../../../headless/utils/cliRunner'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Markdown from '../Markdown'
import { PreLimited, hasToolPreview, renderToolPreviewNative } from './toolPreviews'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
}

const STATUS_GLYPH: Record<CliToolStepResultType, string> = {
  pending: '⋯',
  success: '✓',
  errored: '✗',
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2) ?? String(v)
  } catch {
    return String(v)
  }
}

function GenericToolBody({ input, result }: { input?: unknown; result?: unknown }) {
  const { theme } = useNativeTheme()
  const command = asString((input as { command?: unknown } | undefined)?.command)
  const output = asString((result as { output?: unknown } | undefined)?.output) ?? asString(result)
  return (
    <View style={{ gap: 4 }}>
      {command ? (
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Courier',
            color: theme.text.primary,
            backgroundColor: theme.surface.base,
            paddingHorizontal: 6,
            paddingVertical: 4,
            borderRadius: 4,
          }}
        >
          {command}
        </Text>
      ) : input != null ? (
        <PreLimited lines={safeJson(input).split('\n')} maxLines={8} />
      ) : null}
      {output != null ? (
        <PreLimited lines={output.split('\n')} maxLines={12} />
      ) : result != null ? (
        <PreLimited lines={safeJson(result).split('\n')} maxLines={12} />
      ) : null}
    </View>
  )
}

function ToolStep({ step }: { step: Extract<CliTranscriptStep, { kind: 'tool' }> }) {
  const { theme } = useNativeTheme()
  const statusColor =
    step.resultType === 'success'
      ? nativePalette.green[700]
      : step.resultType === 'errored'
        ? nativePalette.red[700]
        : theme.text.secondary
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Text style={{ fontSize: 12, color: statusColor }}>{STATUS_GLYPH[step.resultType]}</Text>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>{step.toolName}</Text>
        {step.resultType === 'pending' ? (
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>running…</Text>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
        {hasToolPreview(step.toolName)
          ? renderToolPreviewNative({
              toolCall: { toolCallId: step.toolCallId ?? '', name: step.toolName, arguments: step.input },
              result: step.result,
              resultType: step.resultType,
            })
          : <GenericToolBody input={step.input} result={step.result} />}
      </View>
    </View>
  )
}

function RawDisclosure({ summary, raw }: { summary: string; raw: string }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 4 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{open ? '▾' : '▸'}</Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{summary}</Text>
      </Pressable>
      {open ? (
        <Text style={{ paddingHorizontal: 8, paddingBottom: 8, fontSize: 11, color: theme.text.secondary }}>
          {raw}
        </Text>
      ) : null}
    </View>
  )
}

function ThinkingStep({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 4 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ paddingHorizontal: 8, paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 11, fontStyle: 'italic', color: theme.text.secondary }}>
          {open ? '▾' : '▸'} Thinking
        </Text>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          <Markdown text={text} />
        </View>
      ) : null}
    </View>
  )
}

function Step({ step }: { step: CliTranscriptStep }) {
  switch (step.kind) {
    case 'assistant':
      return (
        <View style={{ paddingHorizontal: 2 }}>
          <Markdown text={step.text} />
        </View>
      )
    case 'thinking':
      return <ThinkingStep text={step.text} />
    case 'tool':
      return <ToolStep step={step} />
    case 'system':
    case 'result':
      return <RawDisclosure summary={step.summary} raw={step.raw} />
    case 'raw':
      return <RawDisclosure summary="Step" raw={step.raw} />
  }
}

/**
 * Native mirror of web's `CliRunTranscript`: a collapsible, VS Code-style
 * inspector for a CLI run's steps — assistant prose, extended-thinking,
 * protocol notes, and one drawer per tool operation (reusing our native
 * tool-preview drawers when recognized, else a generic command/output drawer).
 * Renders live as `entries` grows.
 */
export default function CliRunTranscript({ entries }: CliRunTranscriptProps) {
  const { theme } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  const steps = normalizeCliTranscript(entries)
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
          {expanded ? '▾' : '▸'} Run steps ({steps.length})
        </Text>
      </Pressable>
      {expanded ? (
        <View style={{ gap: 6 }}>
          {steps.map((step, i) => (
            <Step key={i} step={step} />
          ))}
        </View>
      ) : null}
    </View>
  )
}
