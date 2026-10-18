import { mergeChecksView, siblingFallbackView, type MergeChecks } from '../../../headless'
import SiblingFallbackNotice from '../process/SiblingFallbackNotice'
import { CheckChip } from '../chips'
import { TerminalOutput } from '../TerminalOutput'

const TONE_TEXT: Record<MergeChecks['status'], string> = {
  passed: 'text-(--status-done-soft-fg)',
  failed: 'text-(--status-stuck-soft-fg)',
  skipped: 'text-(--text-secondary)',
}

export type MergeChecksResultProps = {
  checks: MergeChecks
}

/**
 * How a merge's result built and type-checked before its branch moved: one
 * line, whether it was checked again with out-of-tree code at its stable
 * branch, a chip per check that ran, and what the failed ones printed — their
 * failing lines first.
 */
export default function MergeChecksResult({ checks }: MergeChecksResultProps) {
  const view = mergeChecksView(checks)
  return (
    <div className="flex flex-col gap-2" aria-label="Checks on the merged result">
      <span className={`text-[12.5px] ${TONE_TEXT[view.status]}`}>{view.summary}</span>
      {checks.siblingFallback ? (
        <SiblingFallbackNotice view={siblingFallbackView(checks.siblingFallback)} hideMessage />
      ) : null}
      {view.chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {view.chips.map((row) => (
            <CheckChip key={row.id} row={row} inert />
          ))}
        </div>
      ) : null}
      {view.failingOutput ? <TerminalOutput text={view.failingOutput} /> : null}
    </div>
  )
}
