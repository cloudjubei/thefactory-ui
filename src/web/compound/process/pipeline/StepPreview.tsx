import type { ReactNode } from 'react'

import {
  codeReviewPreview,
  codeReviewVerdictBadge,
  codeReviewView,
  hasIsolatedAttempts,
  processStageChips,
  processStepStates,
  processStepTone,
  reportPreviewTiles,
  reportSectionsOf,
  useProcessRun,
  useStepFiling,
  type ProcessRun,
  type ProcessStepPreviewKind,
  type ProcessRunStopHolder,
} from '../../../../headless'
import type { ProcessStepState } from 'thefactory-tools/types'
import { IconExternalLink } from '../../../icons'
import ProcessCheckList from '../ProcessCheckList'
import { PROCESS_TONE_BADGE, REVIEW_TONE_BADGE, REVIEW_TONE_TEXT } from '../signoff/tones'
import SignoffRecord from './SignoffRecord'
import type { StepPanelTarget } from './StepSidePanel'

export type StepPreviewProps = {
  run: ProcessRun
  state: ProcessStepState
  kind: ProcessStepPreviewKind
  /** Who has the stop the run waits at — the stopped stage of the nested run it mirrors says so. */
  stopHolder?: ProcessRunStopHolder
  onOpen: (target: StepPanelTarget) => void
  /** Open a feature's own pipeline in place — its full page. */
  onDrill: (childRunId: string) => void
}

/** A card that previews what a step produced; the whole card opens its full view in the side panel. */
function PeekCard({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3.5 py-3 text-left text-[12.5px] text-(--text-primary) hover:border-(--accent-primary)/50 hover:bg-(--accent-primary)/5"
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</span>
      <IconExternalLink className="size-4 shrink-0 text-(--accent-primary) opacity-45 group-hover:opacity-100" />
    </button>
  )
}

/**
 * What a step's chevron shows: a preview of its output — a code review's
 * verdict and counts, a report's four tiles, a feature's stages as chips —
 * each opening its full view in the side panel; a decided sign-off, its record.
 */
export default function StepPreview({
  run,
  state,
  kind,
  stopHolder,
  onOpen,
  onDrill,
}: StepPreviewProps) {
  const target = (entryId?: string): StepPanelTarget => ({
    runId: run.id,
    stepId: state.step.id,
    ...(entryId ? { entryId } : {}),
  })
  if (kind === 'code-review')
    return <ReviewPreview run={run} state={state} onOpen={() => onOpen(target())} />
  if (kind === 'report')
    return <ReportPreview run={run} state={state} onOpen={() => onOpen(target())} />
  if (kind === 'stages' && state.latest?.childRunId) {
    const childRunId = state.latest.childRunId
    return (
      <StagesPreview
        childRunId={childRunId}
        {...(stopHolder && run.park?.childRunId === childRunId ? { stopHolder } : {})}
        onOpen={onOpen}
        onDrill={onDrill}
      />
    )
  }
  if (kind === 'signoff') return <SignoffRecord run={run} state={state} onOpen={onOpen} />
  if (kind === 'checks') {
    return (
      <PeekCard label={`Open ${state.step.name}`} onClick={() => onOpen(target())}>
        <span className="min-w-0 flex-1">
          <ProcessCheckList step={state.step} latest={state.latest} />
        </span>
      </PeekCard>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <PeekCard label={`Open ${state.step.name}`} onClick={() => onOpen(target(state.latest?.id))}>
        <span className="text-(--text-secondary)">
          {state.latest?.summary?.trim() || state.step.description || state.step.name}
        </span>
      </PeekCard>
      {hasIsolatedAttempts(state.entries) ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-(--text-muted)">Attempts</span>
          {state.entries.map((e, i) => {
            const tone = processStepTone(e.status === 'running' ? 'running' : 'done', e.outcome)
            return (
              <button
                key={e.id ?? i}
                type="button"
                title={e.summary ?? e.outcome ?? `Attempt ${i + 1}`}
                onClick={() => onOpen(target(e.id))}
                className={`badge badge--soft badge--sm tabular-nums ${PROCESS_TONE_BADGE[tone]}`}
              >
                #{i + 1}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ReviewPreview({
  run,
  state,
  onOpen,
}: {
  run: ProcessRun
  state: ProcessStepState
  onOpen: () => void
}) {
  const { tile } = useStepFiling(run, state.latest, ['code-review'])
  const view = tile ? codeReviewView(tile, state.latest?.review) : undefined
  if (view) {
    const preview = codeReviewPreview(view)
    return (
      <PeekCard label={`Open ${state.step.name}`} onClick={onOpen}>
        <span className={`badge badge--bold ${REVIEW_TONE_BADGE[preview.verdict.tone]}`}>
          {preview.verdict.label}
        </span>
        <span className="min-w-0 flex-[1_1_200px] text-(--text-secondary)">{preview.line}</span>
        <span className="flex flex-wrap gap-1.5">
          {preview.chips.map((chip) => (
            <span
              key={chip.key}
              className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[chip.tone]}`}
            >
              {chip.label}
            </span>
          ))}
        </span>
      </PeekCard>
    )
  }
  const verdict = state.latest?.review
  const badge = codeReviewVerdictBadge({ verdict: verdict?.verdict })
  return (
    <PeekCard label={`Open ${state.step.name}`} onClick={onOpen}>
      <span className={`badge badge--bold ${REVIEW_TONE_BADGE[badge.tone]}`}>{badge.label}</span>
      <span className="text-(--text-secondary)">
        {verdict?.reason ?? state.latest?.summary ?? ''}
      </span>
    </PeekCard>
  )
}

function ReportPreview({
  run,
  state,
  onOpen,
}: {
  run: ProcessRun
  state: ProcessStepState
  onOpen: () => void
}) {
  const { tile } = useStepFiling(run, state.latest, ['final-report', 'feature-report'])
  const sections = tile ? reportSectionsOf(tile) : undefined
  if (!sections) {
    return (
      <PeekCard label={`Open ${state.step.name}`} onClick={onOpen}>
        <span className="text-(--text-secondary)">
          {state.latest?.summary?.trim() || (tile ? 'Report written' : 'Report')}
        </span>
      </PeekCard>
    )
  }
  return (
    <PeekCard label={`Open ${state.step.name}`} onClick={onOpen}>
      <span className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
        {reportPreviewTiles(sections).map((t) => (
          <span key={t.key} className="flex min-w-0 flex-col">
            <span className="text-[11.5px] text-(--text-secondary)">{t.label}</span>
            <span className={`truncate font-semibold ${REVIEW_TONE_TEXT[t.tone]}`}>{t.value}</span>
          </span>
        ))}
      </span>
    </PeekCard>
  )
}

function StagesPreview({
  childRunId,
  stopHolder,
  onOpen,
  onDrill,
}: {
  childRunId: string
  /** Who has the stop the nested run is at, as its top-level run reads it. */
  stopHolder?: ProcessRunStopHolder
  onOpen: (target: StepPanelTarget) => void
  onDrill: (childRunId: string) => void
}) {
  const { run: child } = useProcessRun(childRunId)
  if (!child) return null
  const chips = processStageChips(processStepStates(child), child.park?.stepId, stopHolder)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.stepId}
          type="button"
          disabled={chip.inert}
          onClick={() => onOpen({ runId: child.id, stepId: chip.stepId })}
          className={`inline-flex h-7.5 items-center gap-1.5 rounded-full border px-3 text-[12px] text-(--text-primary) enabled:hover:border-(--accent-primary)/50 enabled:hover:bg-(--accent-primary)/5 disabled:opacity-60 ${chip.tone === 'working' ? 'border-(--status-working-soft-border) bg-(--status-working-soft-bg)' : 'border-(--border-subtle) bg-(--surface-raised)'}`}
        >
          {chip.mark ? (
            <span className="font-bold" style={{ color: `var(--status-${chip.tone}-soft-fg)` }}>
              {chip.mark}
            </span>
          ) : null}
          <span className="font-semibold">{chip.label}</span>
          {chip.note ? <span className="text-(--text-secondary)">{chip.note}</span> : null}
        </button>
      ))}
      <button
        type="button"
        aria-label="Open this feature’s pipeline"
        title="Open this feature’s pipeline"
        onClick={() => onDrill(childRunId)}
        className="inline-flex size-7.5 items-center justify-center rounded-full border border-(--border-subtle) text-(--accent-primary) hover:bg-(--surface-hover)"
      >
        <IconExternalLink className="size-3.5" />
      </button>
    </div>
  )
}
