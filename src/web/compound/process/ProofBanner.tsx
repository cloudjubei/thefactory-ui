import type { VerifyProofHeader, VerifyProofTone } from '../../../headless'
import { IconCheckCircle, IconExclamation, IconInfo } from '../../icons'
import { RefChip } from '../chips'

const BOX_TONE: Record<VerifyProofTone, string> = {
  done: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg)',
  working: 'border-(--status-working-soft-border) bg-(--status-working-soft-bg)',
  stuck: 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg)',
  empty: 'border-(--status-empty-soft-border) bg-(--status-empty-soft-bg)',
}

const TITLE_TONE: Record<VerifyProofTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  working: 'text-(--status-working-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  empty: 'text-(--text-primary)',
}

const ICON: Record<VerifyProofHeader['mode'], typeof IconInfo> = {
  live: IconCheckCircle,
  dry: IconExclamation,
  unknown: IconInfo,
}

/**
 * Which builds every pair had to come from — the base, the branch, and any test
 * seam. Worded as the requirement it is: a pair that did not count may have been
 * built from something else, and says so on its own frames.
 */
export function ProofBuildLine({ header }: { header: VerifyProofHeader }) {
  if (!header.baseSha && !header.headSha) return null
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-(--text-secondary)">
      {header.baseSha ? (
        <>
          <span>Befores must be built from the base</span>
          <RefChip kind="commit" value={header.baseSha} />
        </>
      ) : null}
      {header.seams.length > 0 ? (
        <>
          <span>with test seam</span>
          {header.seams.map((s) => (
            <RefChip key={s} kind="commit" value={s} />
          ))}
        </>
      ) : null}
      {header.headSha ? (
        <>
          <span>
            {header.baseSha ? '· afters from the branch' : 'Afters must be built from the branch'}
          </span>
          <RefChip kind="commit" value={header.headSha} />
        </>
      ) : null}
    </span>
  )
}

/**
 * What data a verification ran on, said before anything else it shows. A dry
 * pass proves the change works on faked data — the banner spells out what was
 * faked and what the live backend must send, so the reader knows exactly what
 * is still unverified end to end.
 */
export default function ProofBanner({ header }: { header: VerifyProofHeader }) {
  const Icon = ICON[header.mode]
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${BOX_TONE[header.tone]}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${TITLE_TONE[header.tone]}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`text-[13px] font-semibold ${TITLE_TONE[header.tone]}`}>
          {header.title}
        </span>
        <span className="max-w-[72ch] text-[12px] text-(--text-secondary)">{header.detail}</span>
        {header.faked ? (
          <div className="flex max-w-[72ch] flex-col gap-0.5 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
              {header.faked.label}
            </span>
            <p className="m-0 whitespace-pre-wrap text-[12.5px] text-(--text-primary)">
              {header.faked.text}
            </p>
          </div>
        ) : null}
        {header.todo ? (
          <span className="max-w-[72ch] text-[12px] font-medium text-(--text-primary)">
            {header.todo}
          </span>
        ) : null}
        <ProofBuildLine header={header} />
      </div>
    </div>
  )
}
