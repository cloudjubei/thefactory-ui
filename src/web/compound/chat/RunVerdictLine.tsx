import type { SignoffVerdict } from '../../../headless'

/**
 * The verdict as a bold status badge.
 *
 * A verdict is always a SOLID pill; its absence signal is the hollow dot alone.
 * The dashed treatment belongs to the check CHIPS ("nobody looked") and putting
 * it on a headline verdict borrows a grammar that does not mean the same thing
 * there. Both undecided verdicts take sign-off gold — the hue for "not proven" —
 * never the neutral grey that means "not set up".
 */
const VERDICT_BADGE: Record<SignoffVerdict['key'], string> = {
  proven: 'badge--done',
  partly: 'badge--review',
  failed: 'badge--stuck',
  'not-run': 'badge--review',
}

/** What the evidence says of a change: the verdict chip and the sentence saying the same thing. */
export function RunVerdictLine({ headline }: { headline: SignoffVerdict }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge badge--bold ${VERDICT_BADGE[headline.key]}`}>
          <span className={`badge__dot ${headline.hollow ? 'badge__dot--hollow' : ''}`} />
          {headline.word}
        </span>
        <span className="text-[14px] font-semibold text-(--text-primary)">{headline.title}</span>
      </div>
      <p className="max-w-[64ch] text-[12.5px] text-(--text-secondary)">{headline.detail}</p>
    </div>
  )
}
