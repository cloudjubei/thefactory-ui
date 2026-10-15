import { useEffect, useState, type ReactNode } from 'react'

import {
  processAttemptLeaf,
  processLeafReview,
  processStepStates,
  reportBodyView,
  useProcessRun,
  useStepFiling,
  type ProcessNodeRunRef,
  type ProcessRun,
} from '../../../../headless'
import type { ProcessLedgerEntry, ProcessStepState } from 'thefactory-tools/types'
import SegmentedControl from '../../../primitives/SegmentedControl'
import { IconClose, IconExternalLink } from '../../../icons'
import ProcessCheckList from '../ProcessCheckList'
import RunChatButton, { type RunChatButtonProps } from '../RunChatButton'
import VerificationReview from '../VerificationReview'
import CodeReviewPanel from '../signoff/CodeReviewPanel'
import SignoffReportPanel from '../signoff/SignoffReportPanel'

/** Which step's output the side panel shows — an attempt of it, when one is named. */
export type StepPanelTarget = { runId: string; stepId: string; entryId?: string }

export type StepSidePanelProps = {
  target: StepPanelTarget
  onClose: () => void
  /** Render an agent run's chat in the panel. */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Open the agent run as a full page — the host's own route. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /** The run's chat — the same one its header opens — so the step can be discussed from here. */
  chat?: RunChatButtonProps
}

type View = 'output' | 'transcript'

/**
 * The full view of one step's output, slid in from the right over the
 * pipeline: its code review, report, checks, verify proof or chat, under a
 * head with the run's chat, ↗ (open as a full page) and ✕. It covers the run's
 * page column only, so the docked run chat stays open beside it.
 */
export default function StepSidePanel({
  target,
  onClose,
  renderAgentRun,
  onOpenAgentRun,
  chat,
}: StepSidePanelProps) {
  const { run } = useProcessRun(target.runId)
  const [view, setView] = useState<View>('output')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => setView('output'), [target.runId, target.stepId, target.entryId])

  const state = run ? processStepStates(run).find((s) => s.step.id === target.stepId) : undefined
  const entry =
    state && target.entryId ? state.entries.find((e) => e.id === target.entryId) : state?.latest
  const index = state && entry ? state.entries.indexOf(entry) : -1
  const title = state
    ? state.entries.length > 1 && index >= 0
      ? `${state.step.name} · attempt ${index + 1}`
      : state.step.name
    : ''
  const ref = entry?.runRef
  const hasOutput = state ? state.step.kind !== 'agent' && state.step.kind !== 'capture' : false
  const canTranscript = ref?.chatContextId !== undefined && renderAgentRun !== undefined
  const leafReview =
    run && state && entry
      ? processLeafReview(run, processAttemptLeaf(entry, state.step.name) ?? {})
      : undefined
  const switchable = canTranscript && (hasOutput || leafReview !== undefined)

  return (
    <>
      <button
        type="button"
        aria-label="Close the panel"
        onClick={onClose}
        className="absolute inset-0 z-40 cursor-default bg-black/20"
      />
      <aside
        aria-label={title}
        className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l border-(--border-subtle) bg-(--surface-raised) shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--text-primary)">
            {title}
          </span>
          {switchable ? (
            <SegmentedControl
              size="sm"
              ariaLabel="What to show for this step"
              value={view}
              onChange={(v) => setView(v === 'transcript' ? 'transcript' : 'output')}
              options={[
                { value: 'output', label: 'Output' },
                { value: 'transcript', label: 'Transcript' },
              ]}
            />
          ) : null}
          {chat ? <RunChatButton {...chat} compact /> : null}
          {ref && onOpenAgentRun ? (
            <button
              type="button"
              aria-label="Open as a full page"
              title="Open as a full page"
              onClick={() => onOpenAgentRun(ref)}
              className="inline-flex size-7.5 items-center justify-center rounded-md border border-(--border-subtle) text-(--text-secondary) hover:bg-(--surface-hover)"
            >
              <IconExternalLink className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            className="inline-flex size-7.5 items-center justify-center rounded-md border border-(--border-subtle) text-(--text-secondary) hover:bg-(--surface-hover)"
          >
            <IconClose className="size-3.5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {!run || !state ? (
            <div className="p-4 text-[12.5px] text-(--text-secondary)">Loading…</div>
          ) : view === 'transcript' && ref && renderAgentRun ? (
            <div className="flex min-h-0 flex-1 flex-col">{renderAgentRun(ref, onClose)}</div>
          ) : (
            <StepOutput
              run={run}
              state={state}
              entry={entry}
              leafReview={leafReview}
              {...(renderAgentRun && ref ? { transcript: renderAgentRun(ref, onClose) } : {})}
            />
          )}
        </div>
      </aside>
    </>
  )
}

function StepOutput({
  run,
  state,
  entry,
  leafReview,
  transcript,
}: {
  run: ProcessRun
  state: ProcessStepState
  entry: ProcessLedgerEntry | undefined
  leafReview: ReturnType<typeof processLeafReview>
  transcript?: ReactNode
}) {
  if (state.step.kind === 'judge') return <ReviewOutput run={run} entry={entry} />
  if (state.step.kind === 'report') return <ReportOutput run={run} entry={entry} />
  if (state.step.kind === 'check') {
    return (
      <div className="p-4">
        <ProcessCheckList step={state.step} latest={entry} />
      </div>
    )
  }
  if (leafReview) {
    return (
      <VerificationReview
        projectId={run.projectId}
        review={leafReview.scope}
        entry={leafReview.entry}
        title={state.step.name}
      />
    )
  }
  if (transcript) return <div className="flex min-h-0 flex-1 flex-col">{transcript}</div>
  return (
    <div className="p-4 text-[13px] text-(--text-secondary)">
      {entry?.summary?.trim() || 'Nothing to show for this step yet.'}
    </div>
  )
}

function ReviewOutput({ run, entry }: { run: ProcessRun; entry: ProcessLedgerEntry | undefined }) {
  const { tile, loaded } = useStepFiling(run, entry, ['code-review'])
  return (
    <div className="p-4">
      {tile ? (
        <CodeReviewPanel review={tile} {...(entry?.review ? { verdict: entry.review } : {})} />
      ) : (
        <span className="text-[13px] text-(--text-secondary)">
          {loaded
            ? (entry?.review?.reason ?? 'No code review was filed for this step.')
            : 'Loading…'}
        </span>
      )}
    </div>
  )
}

function ReportOutput({ run, entry }: { run: ProcessRun; entry: ProcessLedgerEntry | undefined }) {
  const { tile, loaded } = useStepFiling(run, entry, ['final-report', 'feature-report'])
  return (
    <div className="px-4 pb-4">
      {tile ? (
        <SignoffReportPanel view={{ tiles: [], ...reportBodyView(tile, []) }} hideTiles />
      ) : (
        <span className="block pt-4 text-[13px] text-(--text-secondary)">
          {loaded ? (entry?.summary ?? 'No report was filed for this step.') : 'Loading…'}
        </span>
      )}
    </div>
  )
}
