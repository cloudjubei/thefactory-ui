import {
  formatDateTime,
  formatFriendlyTimestamp,
  processSignoffDiscussDraft,
  processSignoffRecord,
  PROCESS_SIGNOFF_RECORD_TEXT,
  REQUEST_PROOF_HEADING,
  useRunChatDraft,
  type ProcessRun,
  type ProcessSignoffDecisionView,
} from '../../../../headless'
import type { ProcessStepState } from 'thefactory-tools/types'
import { Button } from '../../../primitives/Button'
import { IconChat } from '../../../icons'
import RichText from '../../files/RichText'
import { PROCESS_TONE_BADGE } from '../signoff/tones'
import StorySignoffReview from '../StorySignoffReview'
import type { StepPanelTarget } from './StepSidePanel'

export type SignoffRecordProps = {
  run: ProcessRun
  state: ProcessStepState
  onOpen: (target: StepPanelTarget) => void
}

function DecidedAt({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} title={formatDateTime(new Date(at))}>
      {formatFriendlyTimestamp(new Date(at).toISOString())}
    </time>
  )
}

function DecisionBadge({ decision }: { decision: ProcessSignoffDecisionView }) {
  return (
    <span
      className={`badge badge--soft badge--sm shrink-0 whitespace-nowrap ${PROCESS_TONE_BADGE[decision.tone]}`}
    >
      {decision.label}
    </span>
  )
}

/**
 * A decided sign-off, kept on its step: what was chosen, by whom and where, when,
 * in their words and how approved work came in — with the earlier decisions under it, a
 * way to talk it over in the run's chat, and the review they decided on, read-only.
 */
export default function SignoffRecord({ run, state, onOpen }: SignoffRecordProps) {
  const discuss = useRunChatDraft()
  const record = processSignoffRecord(run, state)
  if (!record) return null
  const { latest, earlier } = record
  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label={PROCESS_SIGNOFF_RECORD_TEXT.heading}
        className="flex flex-col gap-2 rounded-lg p-3"
        style={{
          background: `var(--status-${latest.tone}-soft-bg)`,
          border: `1px solid var(--status-${latest.tone}-soft-border)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-(--text-secondary)">
          <span className="font-semibold text-(--text-primary)">
            {PROCESS_SIGNOFF_RECORD_TEXT.heading}
          </span>
          <DecisionBadge decision={latest} />
          <span>
            {latest.decidedBy ? (
              <span className="font-medium text-(--text-primary)">{latest.decidedBy} · </span>
            ) : null}
            {PROCESS_SIGNOFF_RECORD_TEXT.attempt(latest.attempt)} · <DecidedAt at={latest.at} />
          </span>
          {latest.integration ? (
            <span>
              {PROCESS_SIGNOFF_RECORD_TEXT.integration}{' '}
              <span className="font-medium text-(--text-primary)">{latest.integration}</span>
            </span>
          ) : null}
          <span className="grow" />
          {discuss ? (
            <Button
              size="sm"
              variant="secondary"
              title={PROCESS_SIGNOFF_RECORD_TEXT.discussDetail}
              onClick={() => discuss(processSignoffDiscussDraft(latest))}
            >
              <IconChat className="size-3.5" />
              {PROCESS_SIGNOFF_RECORD_TEXT.discuss}
            </Button>
          ) : null}
        </div>
        {latest.note ? (
          <div className="max-w-[72ch] whitespace-pre-wrap text-[12.5px] leading-relaxed text-(--text-primary)">
            <RichText text={latest.note} typedReferences />
          </div>
        ) : null}
        {latest.requestedProof ? (
          <span className="text-[11.5px] text-(--text-secondary)">
            {REQUEST_PROOF_HEADING}: {latest.requestedProof.join(' · ')}
          </span>
        ) : null}
      </section>

      {earlier.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {PROCESS_SIGNOFF_RECORD_TEXT.earlier}
          </span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {earlier.map((d) => (
              <li
                key={`${d.entryId}:${d.at}`}
                className="flex min-w-0 items-baseline gap-2 text-[11.5px] text-(--text-secondary)"
              >
                <DecisionBadge decision={d} />
                <span className="shrink-0 tabular-nums">
                  {d.decidedBy ? `${d.decidedBy} · ` : null}
                  {PROCESS_SIGNOFF_RECORD_TEXT.attempt(d.attempt)} · <DecidedAt at={d.at} />
                </span>
                {d.note ? (
                  <span className="min-w-0 truncate" title={d.note}>
                    <RichText text={d.note.split('\n')[0]} typedReferences />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.storyId ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {PROCESS_SIGNOFF_RECORD_TEXT.review}
          </span>
          <StorySignoffReview
            projectId={run.projectId}
            storyId={run.storyId}
            storyRunId={run.id}
            onOpenStep={onOpen}
          />
        </div>
      ) : null}
    </div>
  )
}
