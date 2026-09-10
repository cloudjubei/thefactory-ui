import { IconBranch, IconCommit } from '../../icons'

export type RefChipKind = 'commit' | 'branch'

export type RefChipProps = {
  /** A commit sha (shortened to 8 for display) or a branch name. */
  value: string
  kind: RefChipKind
  className?: string
  title?: string
}

/**
 * A git ref, as a chip. Commits and branches share one shape so a reader learns
 * it once; the branch is tinted so the two never read alike.
 */
export default function RefChip({ value, kind, className, title }: RefChipProps) {
  const display = kind === 'commit' && /^[0-9a-f]{12,}$/i.test(value) ? value.slice(0, 8) : value
  const Glyph = kind === 'branch' ? IconBranch : IconCommit
  return (
    <span
      className={['ref-chip', kind === 'branch' ? 'ref-chip--branch' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      title={title ?? value}
    >
      <Glyph className="ref-chip__glyph" />
      {display}
    </span>
  )
}
