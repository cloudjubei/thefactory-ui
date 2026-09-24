import { useState } from 'react'

import type { VerifyAttemptView } from '../../../headless'
import { IconChevronRight } from '../../icons'
import { ScreensTab } from '../chat/signoff'
import ProofBanner from './ProofBanner'
import ProofScreens from './ProofScreens'

export type OtherVerifyAttemptsProps = {
  /** "Earlier attempts (3)". */
  label: string
  attempts: readonly VerifyAttemptView[]
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

const STATUS_TONE: Record<VerifyAttemptView['status']['tone'], string> = {
  done: 'text-(--status-done-soft-fg)',
  review: 'text-(--status-review-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
}

function Attempt({
  attempt,
  onOpenPair,
  onRequestImage,
}: {
  attempt: VerifyAttemptView
  onOpenPair: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}) {
  const { evidence } = attempt
  return (
    <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-overlay) p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-(--text-primary)">{attempt.title}</span>
        <span className={`text-[12px] font-medium ${STATUS_TONE[attempt.status.tone]}`}>
          {attempt.status.label}
        </span>
      </div>
      {attempt.notes.map((note) => (
        <div key={note.label} className="flex max-w-[72ch] flex-col gap-0.5">
          <p className="m-0 text-[12px] text-(--text-secondary)">
            <span className="font-medium text-(--text-primary)">{note.label}</span>
            {note.reason ? ` — ${note.reason}` : ''}
          </p>
          {note.details ? (
            <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-[12px] text-(--text-secondary)">
              {note.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      {evidence.proof ? (
        <>
          {evidence.proof.header ? <ProofBanner header={evidence.proof.header} /> : null}
          <ProofScreens view={evidence.proof} onOpen={onOpenPair} onRequestImage={onRequestImage} />
        </>
      ) : evidence.pairs.length > 0 ? (
        <ScreensTab
          pairs={evidence.pairs}
          onOpen={onOpenPair}
          capturedLabel={undefined}
          onRequestImage={onRequestImage}
          capturing={false}
        />
      ) : (
        <span className="text-[11px] text-(--text-secondary)">
          No screens were filed for this attempt.
        </span>
      )}
    </div>
  )
}

/**
 * The verify attempts a section is NOT showing, folded away — the default view
 * is the attempt the feature was accepted on. Opened, each attempt says how it
 * ended, why, and what it judged, so an honest earlier failure is still there
 * for a reader who wants the history.
 */
export default function OtherVerifyAttempts({
  label,
  attempts,
  onOpenPair,
  onRequestImage,
}: OtherVerifyAttemptsProps) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="group/others rounded-lg border border-(--border-subtle) bg-(--surface-base)"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-(--text-secondary) [&::-webkit-details-marker]:hidden">
        <IconChevronRight className="size-3.5 shrink-0 transition-transform group-open/others:rotate-90" />
        {label}
      </summary>
      {open ? (
        <div className="flex flex-col gap-2.5 border-t border-(--border-subtle) px-3 py-2.5">
          {attempts.map((a) => (
            <Attempt
              key={a.key}
              attempt={a}
              onOpenPair={onOpenPair}
              onRequestImage={onRequestImage}
            />
          ))}
        </div>
      ) : null}
    </details>
  )
}
