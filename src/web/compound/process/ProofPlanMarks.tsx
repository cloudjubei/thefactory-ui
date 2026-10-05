import {
  PROOF_PLAN_SIGNOFF_HEADING,
  type ProofPlanMarkRow,
  type StoryStepTone,
} from '../../../headless'
import { IconCheck, IconXCircle } from '../../icons'

const TONE_TEXT: Record<StoryStepTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  review: 'text-(--status-review-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  neutral: 'text-(--text-secondary)',
}

function KindMark({ tone }: { tone: StoryStepTone }) {
  if (tone === 'done') return <IconCheck className="size-3.5" />
  if (tone === 'stuck') return <IconXCircle className="size-3.5" />
  return (
    <span
      aria-hidden
      className={`size-2 rounded-full ${tone === 'neutral' ? 'bg-current' : 'border-[1.5px] border-current'}`}
    />
  )
}

export type ProofPlanMarksProps = {
  rows: readonly ProofPlanMarkRow[]
}

/**
 * A feature's proof plan on its sign-off: each kind it asked for, met or not,
 * and why — judged from its run by the rule its gate uses. Native peer:
 * `native/compound/process/ProofPlanMarks`.
 */
export default function ProofPlanMarks({ rows }: ProofPlanMarksProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {PROOF_PLAN_SIGNOFF_HEADING}
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => (
          <li key={row.kind} className="flex min-w-0 items-baseline gap-2 text-[12px]">
            <span
              className={`inline-flex size-3.5 shrink-0 translate-y-0.5 items-center justify-center ${TONE_TEXT[row.tone]}`}
            >
              <KindMark tone={row.tone} />
            </span>
            <span className="shrink-0 font-semibold text-(--text-primary)">{row.label}</span>
            <span className={`shrink-0 font-medium ${TONE_TEXT[row.tone]}`}>{row.word}</span>
            <span
              className="line-clamp-2 min-w-0 max-w-[72ch] text-(--text-secondary)"
              title={row.detail}
            >
              {row.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
