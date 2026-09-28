import type { SignoffTally, SignoffVerdict } from '../../../../headless'

export type VerdictBadgeProps = {
  verdict: SignoffVerdict
  /** The count the verdict is over — `Proven · 2/2` — so no separate line has to repeat it. */
  tally?: SignoffTally
}

/**
 * A verdict is always a SOLID pill; its absence signal is the hollow dot alone.
 * Both undecided verdicts take review blue — the hue for "not proven" — never the
 * neutral grey that means "not set up". Kept in one place so the story header,
 * each feature section and the single-run panel all draw the verdict identically.
 */
const VERDICT_BADGE: Record<SignoffVerdict['key'], string> = {
  proven: 'badge--done',
  partly: 'badge--review',
  failed: 'badge--stuck',
  'not-run': 'badge--review',
}

/** The verdict word as a bold status badge, with its tally when it has one. */
export default function VerdictBadge({ verdict, tally }: VerdictBadgeProps) {
  return (
    <span className={`badge badge--bold ${VERDICT_BADGE[verdict.key]}`} title={tally?.title}>
      <span className={`badge__dot ${verdict.hollow ? 'badge__dot--hollow' : ''}`} />
      {tally ? `${verdict.word} · ${tally.label}` : verdict.word}
    </span>
  )
}
