import { useMemo, useState } from 'react'
import {
  EVIDENCE_REFERENCE_COPY,
  evidenceTime,
  useEvidenceReference,
  type EvidenceLink,
  type EvidenceOpenTarget,
  type EvidenceReferenceView,
} from '../../headless'
import { IconChevronLeft } from '../icons'
import { Button } from '../primitives/Button'
import EvidenceTargetOverlay from '../compound/chat/EvidenceTargetOverlay'
import { WalkthroughRecording } from '../compound/chat/signoff/WalkthroughTab'
import { evidenceGlyph } from '../compound/chips/referenceGlyphs'
import ImageViewer from '../compound/files/ImageViewer'
import { PROCESS_TONE_BADGE } from '../compound/process/signoff/tones'

function Shown({ target }: { target: EvidenceOpenTarget }) {
  if (target.kind === 'image') {
    return (
      <figure className="m-0 flex flex-col overflow-hidden rounded-lg border border-(--border-subtle)">
        <div className="h-[min(62vh,640px)] min-h-[240px]">
          <ImageViewer src={target.url} alt={target.caption} />
        </div>
        <figcaption className="border-t border-(--border-subtle) px-3 py-2 text-xs text-(--text-secondary)">
          {target.caption}
        </figcaption>
      </figure>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <WalkthroughRecording
        projectId={target.projectId}
        tile={{
          ref: { id: target.evidenceId, mediaType: target.mediaType },
          caption: target.caption,
        }}
        label={EVIDENCE_REFERENCE_COPY.recording}
        {...(target.atSec !== undefined ? { startAt: target.atSec } : {})}
      />
      <p className="m-0 text-[12.5px] text-(--text-secondary)">
        {target.atSec !== undefined ? (
          <>
            {EVIDENCE_REFERENCE_COPY.openedAt}{' '}
            <b className="text-(--text-primary)">{evidenceTime(target.atSec)}</b>
            {' · '}
          </>
        ) : null}
        {target.caption}
      </p>
    </div>
  )
}

export type EvidenceViewBodyProps = {
  view: EvidenceReferenceView
  onBack?: () => void
}

/**
 * One evidence item on its own page: its kind, title and severity, what
 * happened and where, and the item itself — the screenshot to zoom, or the
 * recording playing from the moment — with its other way to open. Something
 * gone says so calmly.
 */
export function EvidenceViewBody({ view, onBack }: EvidenceViewBodyProps) {
  const [opened, setOpened] = useState<EvidenceOpenTarget | undefined>()
  const Glyph = evidenceGlyph(view.glyph)
  const { card } = view
  const rest = card.actions.filter((action) => action.target !== view.open)
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4 p-4 sm:p-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 self-start rounded px-1 py-0.5 text-[12.5px] text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <IconChevronLeft className="size-3.5" />
          {EVIDENCE_REFERENCE_COPY.back}
        </button>
      ) : null}
      <header className="flex items-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-(--text-secondary)">
          <Glyph className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-(--text-secondary)">
            {card.caption}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 min-w-0 break-words text-[17px] font-semibold text-(--text-primary)">
              {card.title}
            </h1>
            {card.severity ? (
              <span
                className={`badge badge--soft badge--sm ${PROCESS_TONE_BADGE[card.severity.tone]}`}
              >
                {card.severity.label}
              </span>
            ) : null}
          </span>
        </span>
      </header>
      {card.lines.length > 0 ? (
        <div className="flex flex-col gap-1 text-[13px]">
          {card.lines.map((line) => (
            <div key={`${line.label}:${line.value}`} className="flex gap-3 leading-normal">
              {line.label ? (
                <span className="w-[84px] shrink-0 text-(--text-secondary)">{line.label}</span>
              ) : null}
              <span className="min-w-0 break-words text-(--text-primary)">{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {view.phase === 'gone' ? (
        <div className="flex flex-col items-start gap-1.5 rounded-lg border border-dashed border-(--border-strong) bg-(--surface-base) p-4 text-[13px] text-(--text-secondary)">
          <b className="text-(--text-primary)">{EVIDENCE_REFERENCE_COPY.goneTitle}</b>
          <span>{EVIDENCE_REFERENCE_COPY.goneBody}</span>
        </div>
      ) : view.open ? (
        <Shown target={view.open} />
      ) : null}
      {rest.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {rest.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="secondary"
              onClick={() => setOpened(action.target)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {opened ? (
        <EvidenceTargetOverlay target={opened} onClose={() => setOpened(undefined)} />
      ) : null}
    </div>
  )
}

export type EvidenceViewProps = {
  projectId: string
  evidenceId: string
  /** The moment to open its recording at — the link's `?at=`. */
  at?: number
  onBack?: () => void
}

/**
 * The page an evidence link opens, `/projects/<projectId>/evidence/<evidenceId>?at=`:
 * the item read by its reference and shown by {@link EvidenceViewBody}. Each app
 * mounts it at that route.
 */
export default function EvidenceView({ projectId, evidenceId, at, onBack }: EvidenceViewProps) {
  const link = useMemo<EvidenceLink>(
    () => ({ kind: 'evidence', projectId, evidenceId, ...(at !== undefined ? { at } : {}) }),
    [projectId, evidenceId, at],
  )
  const { view } = useEvidenceReference(link, { withIssue: true })
  return view ? <EvidenceViewBody view={view} {...(onBack ? { onBack } : {})} /> : null
}
