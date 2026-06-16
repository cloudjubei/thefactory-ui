import { useState } from 'react'

import type { CliRunTranscriptEntry } from '../../../headless/api'
import {
  normalizeCliTranscript,
  type CliToolStepResultType,
  type CliTranscriptStep,
} from '../../../headless/utils/cliRunner'
import Markdown from '../Markdown'
import { PreLimited, hasToolPreview, renderToolPreview } from './toolPreviews'

export type CliRunTranscriptProps = {
  /** The run's full transcript (assistant text, tool calls/results, protocol events). */
  entries: CliRunTranscriptEntry[]
}

const STATUS_GLYPH: Record<CliToolStepResultType, string> = {
  pending: '⋯',
  success: '✓',
  errored: '✗',
}
const STATUS_CLASS: Record<CliToolStepResultType, string> = {
  pending: 'text-(--text-secondary)',
  success: 'text-(--color-green-700) dark:text-(--color-green-300)',
  errored: 'text-(--color-red-700) dark:text-(--color-red-300)',
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

/** Drawer for a tool we don't have a bespoke preview for (CLI-native tools like
 * a shell command): the command/input on top, the output/result below. */
function GenericToolBody({ input, result }: { input?: unknown; result?: unknown }) {
  const command = asString((input as { command?: unknown } | undefined)?.command)
  const output =
    asString((result as { output?: unknown } | undefined)?.output) ?? asString(result)
  return (
    <div className="flex flex-col gap-1">
      {command ? (
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-(--text-primary) bg-(--surface-base) rounded px-2 py-1">
          {command}
        </pre>
      ) : input != null ? (
        <PreLimited lines={safeJson(input).split('\n')} maxLines={8} />
      ) : null}
      {output != null ? (
        <PreLimited lines={output.split('\n')} maxLines={12} />
      ) : result != null ? (
        <PreLimited lines={safeJson(result).split('\n')} maxLines={12} />
      ) : null}
    </div>
  )
}

function ToolStep({ step }: { step: Extract<CliTranscriptStep, { kind: 'tool' }> }) {
  const recognized = hasToolPreview(step.toolName)
  return (
    <div className="rounded border border-(--border-subtle) bg-(--surface-base)">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className={`text-[12px] ${STATUS_CLASS[step.resultType]}`}>
          {STATUS_GLYPH[step.resultType]}
        </span>
        <span className="text-[12px] font-medium text-(--text-primary)">{step.toolName}</span>
        {step.resultType === 'pending' ? (
          <span className="text-[11px] text-(--text-secondary)">running…</span>
        ) : null}
      </div>
      <div className="px-2 pb-2">
        {recognized
          ? renderToolPreview({
              toolCall: { toolCallId: step.toolCallId ?? '', name: step.toolName, arguments: step.input },
              result: step.result,
              resultType: step.resultType,
            })
          : <GenericToolBody input={step.input} result={step.result} />}
      </div>
    </div>
  )
}

function RawDisclosure({ summary, raw }: { summary: string; raw: string }) {
  return (
    <details className="rounded border border-(--border-subtle) bg-(--surface-base)">
      <summary className="flex items-center px-2 py-1 cursor-pointer text-[12px] text-(--text-secondary)">
        {summary}
      </summary>
      <pre className="px-2 pb-2 text-[11px] whitespace-pre-wrap break-words text-(--text-secondary) max-h-80 overflow-auto">
        {raw}
      </pre>
    </details>
  )
}

function Step({ step }: { step: CliTranscriptStep }) {
  switch (step.kind) {
    case 'assistant':
      return (
        <div className="px-1 text-[13px] text-(--text-primary)">
          <Markdown text={step.text} />
        </div>
      )
    case 'thinking':
      return (
        <details className="rounded border border-(--border-subtle) bg-(--surface-base)">
          <summary className="px-2 py-1 cursor-pointer text-[11px] italic text-(--text-secondary)">
            Thinking
          </summary>
          <div className="px-2 pb-2 text-[12px] italic text-(--text-secondary)">
            <Markdown text={step.text} />
          </div>
        </details>
      )
    case 'tool':
      return <ToolStep step={step} />
    case 'system':
      return <RawDisclosure summary={step.summary} raw={step.raw} />
    case 'result':
      return <RawDisclosure summary={step.summary} raw={step.raw} />
    case 'raw':
      return <RawDisclosure summary="Step" raw={step.raw} />
  }
}

/**
 * A collapsible, VS Code-style inspector for a CLI run's step-by-step
 * transcript: assistant prose (markdown), extended-thinking, protocol notes,
 * and one drawer per tool operation — reusing our existing tool-preview drawers
 * when the tool is one we recognize, and a generic command/output drawer
 * otherwise. Renders live as `entries` grows.
 */
export default function CliRunTranscript({ entries }: CliRunTranscriptProps) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  const steps = normalizeCliTranscript(entries)
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
            <Step key={i} step={step} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
