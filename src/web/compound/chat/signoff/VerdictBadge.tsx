import type { SignoffVerdict } from '../../../../headless'

export type VerdictBadgeProps = {
  verdict: SignoffVerdict
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

/** The verdict word as a bold status badge. */
export default function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <span className={`badge badge--bold ${VERDICT_BADGE[verdict.key]}`}>
      <span className={`badge__dot ${verdict.hollow ? 'badge__dot--hollow' : ''}`} />
      {verdict.word}
    </span>
  )
}
