import { useEffect, useMemo, useState, type ReactNode } from 'react'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import { normalizeCliTranscript, type CliTranscriptStep } from '../../../headless/utils/cliRunner'
import { formatDurationMs } from '../../../headless/utils/time'
import Markdown from '../Markdown'
import StatusIcon from './ToolCall/StatusIcon'
import { PreLimited, hasToolPreview, renderToolPreview } from './toolPreviews'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
  /**
   * True while the run is still streaming. The trailing step is treated as the
   * "current" operation: expanded by default with a running timer; everything
   * before it stays collapsed.
   */
  streaming?: boolean
  /** Show protocol notes (Session/Turn started, Completed). Default false — they add little. */
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

/** A ticking elapsed-time label for the in-flight (current) step. */
function LiveDuration({ startMs }: { startMs: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{formatDurationMs(Math.max(0, now - startMs))}</>
}

/** Shared collapsible card so every step reads consistently with our tool messages. */
function StepCard({
  open,
  onToggle,
  icon,
  label,
  labelClass,
  right,
  children,
}: {
  open: boolean
  onToggle: () => void
  icon?: ReactNode
  label: ReactNode
  labelClass?: string
  right?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border border-(--border-subtle) bg-(--surface-raised) overflow-hidden animate-fade-in">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-(--surface-hover)"
      >
        <span className="text-[10px] text-(--text-secondary) w-2.5 shrink-0">{open ? '▾' : '▸'}</span>
        {icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
        <span className={`text-[12px] truncate ${labelClass ?? 'text-(--text-primary)'}`}>{label}</span>
        {right ? (
          <span className="ml-auto text-[11px] text-(--text-secondary) shrink-0 tabular-nums">
            {right}
          </span>
        ) : null}
      </button>
      {open && children ? <div className="px-2 pb-2 pt-0.5">{children}</div> : null}
    </div>
  )
}

/** VS Code–style command drawer: the command on top, its output below. */
function CommandBody({ input, result }: { input?: unknown; result?: unknown }) {
  const command = asString((input as { command?: unknown } | undefined)?.command) ?? safeJson(input)
  const output =
    asString((result as { output?: unknown } | undefined)?.output) ?? asString(result)
  const exitCode = (result as { exitCode?: unknown } | undefined)?.exitCode
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary) mb-0.5">
          Command
        </div>
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-(--text-primary) bg-(--surface-base) rounded px-2 py-1">
          {command}
        </pre>
      </div>
      {output != null && output !== '' ? (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary) mb-0.5">
            Output{typeof exitCode === 'number' && exitCode !== 0 ? ` · exit ${exitCode}` : ''}
          </div>
          <PreLimited lines={output.split('\n')} maxLines={14} />
        </div>
      ) : null}
    </div>
  )
}

/** Fallback drawer for a tool we have no bespoke preview for: input then result. */
function GenericToolBody({ input, result }: { input?: unknown; result?: unknown }) {
  return (
    <div className="flex flex-col gap-1.5">
      {input != null ? <PreLimited lines={safeJson(input).split('\n')} maxLines={8} /> : null}
      {result != null ? <PreLimited lines={safeJson(result).split('\n')} maxLines={14} /> : null}
    </div>
  )
}

function ToolBody({ step }: { step: Extract<CliTranscriptStep, { kind: 'tool' }> }) {
  if (COMMAND_TOOLS.has(step.toolName)) return <CommandBody input={step.input} result={step.result} />
  if (hasToolPreview(step.toolName)) {
    return (
      <>
        {renderToolPreview({
          toolCall: { toolCallId: step.toolCallId ?? '', name: step.toolName, arguments: step.input },
          result: step.result,
          resultType: step.resultType,
        })}
      </>
    )
  }
  return <GenericToolBody input={step.input} result={step.result} />
}

function toolLabel(step: Extract<CliTranscriptStep, { kind: 'tool' }>): string {
  if (COMMAND_TOOLS.has(step.toolName)) {
    const cmd = asString((step.input as { command?: unknown } | undefined)?.command)
    const firstLine = cmd?.split('\n')[0].trim()
    return firstLine ? `Shell · ${firstLine}` : 'Shell'
  }
  return step.toolName
}

const THINKING_CLASS = 'italic text-(--text-secondary)'

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
  const right = rightFor(step, isCurrent, streaming)
  const live = isCurrent && streaming
  switch (step.kind) {
    case 'thinking':
      return (
        <StepCard
          open={open}
          onToggle={onToggle}
          label={
            <span className={live ? `${THINKING_CLASS} animate-pulse` : THINKING_CLASS}>Thinking</span>
          }
          right={right}
        >
          <div className="text-[12px] italic text-(--text-secondary)">
            <Markdown text={step.text} />
          </div>
        </StepCard>
      )
    case 'assistant':
      return (
        <StepCard open={open} onToggle={onToggle} label="Response" right={right}>
          <div className="text-[13px] text-(--text-primary)">
            <Markdown text={step.text} />
          </div>
        </StepCard>
      )
    case 'tool':
      return (
        <StepCard
          open={open}
          onToggle={onToggle}
          icon={<StatusIcon resultType={step.resultType} />}
          label={toolLabel(step)}
          right={right}
        >
          <ToolBody step={step} />
        </StepCard>
      )
    case 'system':
    case 'result':
      return (
        <StepCard open={open} onToggle={onToggle} label={step.summary} labelClass="text-(--text-secondary)" right={right}>
          <pre className="text-[11px] whitespace-pre-wrap break-words text-(--text-secondary) max-h-80 overflow-auto">
            {step.raw}
          </pre>
        </StepCard>
      )
    case 'raw':
      return (
        <StepCard open={open} onToggle={onToggle} label="Step" labelClass="text-(--text-secondary)" right={right}>
          <pre className="text-[11px] whitespace-pre-wrap break-words text-(--text-secondary) max-h-80 overflow-auto">
            {step.raw}
          </pre>
        </StepCard>
      )
  }
}

/**
 * A collapsible, VS Code-style inspector for a CLI run's steps: extended
 * thinking, assistant prose, and one drawer per tool operation — reusing our
 * existing tool-preview drawers when the tool is recognized (incl. MCP tools
 * mapped to our names), a command/output drawer for shell commands, and a
 * generic input/result drawer otherwise. Every step is a consistent collapsible
 * card showing its elapsed time. While `streaming`, the trailing (current) step
 * is expanded with a running timer and everything before it is collapsed.
 */
export default function CliRunTranscript({
  entries,
  streaming = false,
  showProtocol = false,
  showThinking = true,
}: CliRunTranscriptProps) {
  const [expanded, setExpanded] = useState(false)
  // Auto-open the step list while the run streams so the current operation is
  // visible the whole time (the user can still collapse it).
  useEffect(() => {
    if (streaming) setExpanded(true)
  }, [streaming])
  // Per-step open overrides (keyed by visible index, stable since steps only
  // append). Absent → the auto rule: the current step is open while streaming.
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
    <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 text-left text-[12px] font-medium text-(--text-secondary) hover:text-(--text-primary)"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? '▾' : '▸'} Run steps ({steps.length})
      </button>
      {expanded ? (
        <div className="flex flex-col gap-1.5">
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
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-(--text-secondary)">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-(--border-default) border-t-transparent animate-spin" />
              Working…
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
