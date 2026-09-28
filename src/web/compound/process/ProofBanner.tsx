import { Fragment, useState } from 'react'

import type { VerifyProofDryLine, VerifyProofHeader, VerifyProofTone } from '../../../headless'
import { IconCheckCircle, IconChevronRight, IconExclamation, IconInfo } from '../../icons'
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
 * A dry attempt as one quiet line under its header: the colour is carried by a
 * dot, and what was faked — with the builds it ran against — folds open in place
 * as a neutral table. A caveat to read while signing off, not an alarm.
 */
export function DryProofLine({ dry }: { dry: VerifyProofDryLine }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2 text-[12.5px] leading-normal text-(--text-secondary)">
        <span
          aria-hidden
          className="mt-[6.5px] size-[7px] shrink-0 rounded-full bg-(--status-working-bg)"
        />
        <p className="m-0 max-w-[72ch]">
          <strong className="font-semibold text-(--text-primary)">{dry.lead}</strong> {dry.text}{' '}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-medium text-(--accent-primary) hover:underline"
          >
            {open ? dry.toggle.close : dry.toggle.open}
            <IconChevronRight
              className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
        </p>
      </div>
      {open ? (
        <dl className="m-0 grid max-w-[72ch] grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-lg border border-(--border-subtle) text-[12.5px]">
          {dry.rows.map((row, i) => {
            const rule = i < dry.rows.length - 1 ? 'border-b border-(--border-subtle)' : ''
            return (
              <Fragment key={row.label}>
                <dt
                  className={`bg-(--surface-raised) px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) ${rule}`}
                >
                  {row.label}
                </dt>
                <dd
                  className={`m-0 bg-(--surface-base) px-2.5 py-1.5 text-(--text-secondary) ${rule}`}
                >
                  {row.kind === 'text' ? (
                    <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{row.text}</p>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      {row.parts.map((part, j) =>
                        part.kind === 'sha' ? (
                          <RefChip key={`${j}:${part.sha}`} kind="commit" value={part.sha} />
                        ) : (
                          <span key={`${j}:${part.text}`}>{part.text}</span>
                        ),
                      )}
                    </span>
                  )}
                </dd>
              </Fragment>
            )
          })}
        </dl>
      ) : null}
    </div>
  )
}

function UnvouchedNote({ text }: { text: string }) {
  return (
    <span className="flex max-w-[72ch] items-start gap-1.5 text-[12px] text-(--text-primary)">
      <IconInfo className="mt-px size-3.5 shrink-0 text-(--text-muted)" />
      {text}
    </span>
  )
}

/**
 * What data a verification ran on, said before anything else it shows. A dry
 * attempt is one quiet line whose detail folds open — a caveat, not an alarm;
 * a live or unstated one keeps its banner. A proof the backend can no longer
 * vouch for any of says so here, so a pass with nothing under it that counts
 * is explained.
 */
export default function ProofBanner({ header }: { header: VerifyProofHeader }) {
  if (header.dry) {
    return (
      <div className="flex flex-col gap-1.5">
        <DryProofLine dry={header.dry} />
        {header.unvouched ? <UnvouchedNote text={header.unvouched.text} /> : null}
      </div>
    )
  }
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
        {header.unvouched ? <UnvouchedNote text={header.unvouched.text} /> : null}
        <ProofBuildLine header={header} />
      </div>
    </div>
  )
}
