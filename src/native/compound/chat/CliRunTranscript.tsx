import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import { normalizeCliTranscript, type CliTranscriptStep } from '../../../headless/utils/cliRunner'
import { formatDurationMs } from '../../../headless/utils/time'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Markdown from '../Markdown'
import { PreLimited, hasToolPreview, renderToolPreviewNative } from './toolPreviews'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
  /** True while the run streams — the trailing step is current: expanded + running timer. */
  streaming?: boolean
  /** Show protocol notes (Session/Turn started, Completed). Default false. */
  showProtocol?: boolean
  /** Show the model's extended-thinking steps. Default true. */
  showThinking?: boolean
}

const COMMAND_TOOLS = new Set(['command_execution', 'shell', 'bash', 'runShellCommand'])

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

function LiveDuration({ startMs }: { startMs: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{formatDurationMs(Math.max(0, now - startMs))}</>
}

function StatusGlyph({ resultType }: { resultType: 'success' | 'errored' | 'pending' }) {
  const { theme } = useNativeTheme()
  const color =
    resultType === 'success'
      ? nativePalette.green[700]
      : resultType === 'errored'
        ? nativePalette.red[700]
        : theme.text.secondary
  const glyph = resultType === 'success' ? '✓' : resultType === 'errored' ? '✗' : '⋯'
  return <Text style={{ fontSize: 12, color }}>{glyph}</Text>
}

function StepCard({
  open,
  onToggle,
  icon,
  label,
  labelColor,
  labelItalic,
  right,
  children,
}: {
  open: boolean
  onToggle: () => void
  icon?: ReactNode
  label: string
  labelColor?: string
  labelItalic?: boolean
  right?: ReactNode
  children?: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 6, overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 10, color: theme.text.secondary, width: 10 }}>{open ? '▾' : '▸'}</Text>
        {icon ?? null}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 12,
            flexShrink: 1,
            fontStyle: labelItalic ? 'italic' : 'normal',
            color: labelColor ?? theme.text.primary,
          }}
        >
          {label}
        </Text>
        {right != null ? (
          <Text style={{ marginLeft: 'auto', fontSize: 11, color: theme.text.secondary }}>{right}</Text>
        ) : null}
      </Pressable>
      {open && children ? <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>{children}</View> : null}
    </View>
  )
}

function CommandBody({ input, result }: { input?: unknown; result?: unknown }) {
  const { theme } = useNativeTheme()
  const command = asString((input as { command?: unknown } | undefined)?.command) ?? safeJson(input)
  const output = asString((result as { output?: unknown } | undefined)?.output) ?? asString(result)
  const exitCode = (result as { exitCode?: unknown } | undefined)?.exitCode
  return (
    <View style={{ gap: 6 }}>
      <View>
        <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.secondary, marginBottom: 2 }}>
          COMMAND
        </Text>
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
      </View>
      {output != null && output !== '' ? (
        <View>
          <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.secondary, marginBottom: 2 }}>
            {typeof exitCode === 'number' && exitCode !== 0 ? `OUTPUT · exit ${exitCode}` : 'OUTPUT'}
          </Text>
          <PreLimited lines={output.split('\n')} maxLines={14} />
        </View>
      ) : null}
    </View>
  )
}

function GenericToolBody({ input, result }: { input?: unknown; result?: unknown }) {
  const { theme } = useNativeTheme()
  const label = { fontSize: 10, fontWeight: '600' as const, color: theme.text.secondary, marginBottom: 2 }
  const resultText = typeof result === 'string' ? result : result != null ? safeJson(result) : ''
  const argEntries =
    input && typeof input === 'object' && !Array.isArray(input)
      ? Object.entries(input as Record<string, unknown>)
      : null
  return (
    <View style={{ gap: 6 }}>
      {input != null ? (
        <View>
          <Text style={label}>INPUT</Text>
          {argEntries && argEntries.length > 0 ? (
            <View style={{ gap: 2 }}>
              {argEntries.map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary }}>{k}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Courier', color: theme.text.primary, flexShrink: 1 }}>
                    {typeof v === 'string' ? v : safeJson(v)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <PreLimited lines={safeJson(input).split('\n')} maxLines={8} />
          )}
        </View>
      ) : null}
      {resultText ? (
        <View>
          <Text style={label}>RESULT</Text>
          <PreLimited lines={resultText.split('\n')} maxLines={14} />
        </View>
      ) : null}
    </View>
  )
}

function ToolBody({ step }: { step: Extract<CliTranscriptStep, { kind: 'tool' }> }) {
  if (COMMAND_TOOLS.has(step.toolName)) return <CommandBody input={step.input} result={step.result} />
  if (hasToolPreview(step.toolName)) {
    return (
      <>
        {renderToolPreviewNative({
          toolCall: { toolCallId: step.toolCallId ?? '', name: step.toolName, arguments: step.input },
          result: step.result,
          resultType: step.resultType,
        })}
      </>
    )
  }
  return <GenericToolBody input={step.input} result={step.result} />
}

function shellLabel(step: Extract<CliTranscriptStep, { kind: 'tool' }>): string {
  const cmd = asString((step.input as { command?: unknown } | undefined)?.command)
  const firstLine = cmd?.split('\n')[0].trim()
  return firstLine ? `Shell · ${firstLine}` : 'Shell'
}

function rightFor(step: CliTranscriptStep, isCurrent: boolean, streaming: boolean): ReactNode {
  if (step.durationMs != null) return formatDurationMs(step.durationMs)
  if (isCurrent && streaming) return <LiveDuration startMs={step.at} />
  return null
}

function StepRow({
  step,
  open,
  onToggle,
  isCurrent,
  streaming,
}: {
  step: CliTranscriptStep
  open: boolean
  onToggle: () => void
  isCurrent: boolean
  streaming: boolean
}) {
  const { theme } = useNativeTheme()
  const right = rightFor(step, isCurrent, streaming)
  switch (step.kind) {
    case 'thinking':
      return (
        <StepCard open={open} onToggle={onToggle} label="Thinking" labelItalic labelColor={theme.text.secondary} right={right}>
          <Markdown text={step.text} />
        </StepCard>
      )
    case 'assistant':
      return (
        <StepCard open={open} onToggle={onToggle} label="Response" right={right}>
          <Markdown text={step.text} />
        </StepCard>
      )
    case 'tool':
      return (
        <StepCard
          open={open}
          onToggle={onToggle}
          icon={<StatusGlyph resultType={step.resultType} />}
          label={COMMAND_TOOLS.has(step.toolName) ? shellLabel(step) : step.toolName}
          right={right}
        >
          <ToolBody step={step} />
        </StepCard>
      )
    case 'system':
    case 'result':
      return (
        <StepCard open={open} onToggle={onToggle} label={step.summary} labelColor={theme.text.secondary} right={right}>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{step.raw}</Text>
        </StepCard>
      )
    case 'raw':
      return (
        <StepCard open={open} onToggle={onToggle} label="Step" labelColor={theme.text.secondary} right={right}>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{step.raw}</Text>
        </StepCard>
      )
  }
}

/**
 * Native mirror of web's `CliRunTranscript`: a collapsible, VS Code-style
 * inspector for a CLI run's steps — extended thinking, assistant prose, and one
 * drawer per tool operation (reusing native tool-preview drawers when
 * recognized, a command/output drawer for shell commands, a generic drawer
 * otherwise). Every step is a consistent card showing its elapsed time; while
 * `streaming`, the trailing (current) step is expanded with a running timer.
 */
export default function CliRunTranscript({
  entries,
  streaming = false,
  showProtocol = false,
  showThinking = true,
}: CliRunTranscriptProps) {
  const { theme } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (streaming) setExpanded(true)
  }, [streaming])
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})

  const steps = useMemo(() => {
    const all = normalizeCliTranscript(entries)
    return all.filter((s) => {
      if (s.kind === 'thinking') return showThinking
      if (s.kind === 'system' || s.kind === 'result' || s.kind === 'raw') return showProtocol
      return true
    })
  }, [entries, showProtocol, showThinking])

  if (entries.length === 0) return null
  const currentIndex = streaming ? steps.length - 1 : -1
  const isOpen = (i: number) => (i in overrides ? overrides[i] : i === currentIndex)

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
      <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {expanded ? '▾' : '▸'} Run steps ({steps.length})
        </Text>
      </Pressable>
      {expanded ? (
        <View style={{ gap: 6 }}>
          {steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              open={isOpen(i)}
              onToggle={() => setOverrides((o) => ({ ...o, [i]: !isOpen(i) }))}
              isCurrent={i === currentIndex}
              streaming={streaming}
            />
          ))}
          {streaming ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
              <ActivityIndicator size="small" color={theme.text.secondary} />
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>Working…</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
