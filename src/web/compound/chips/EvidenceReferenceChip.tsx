import { useState, type ReactNode, type SyntheticEvent } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import {
  EVIDENCE_REFERENCE_COPY,
  useEvidenceReference,
  type EvidenceLink,
  type EvidenceOpenTarget,
  type EvidenceReferenceView,
} from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import EvidenceTargetOverlay from '../chat/EvidenceTargetOverlay'
import { PROCESS_TONE_BADGE } from '../process/signoff/tones'
import EvidencePreviewCard from './EvidencePreviewCard'
import { evidenceGlyph } from './referenceGlyphs'

export type EvidenceReferenceChipViewProps = {
  view: EvidenceReferenceView
  /** The preview its hover shows, in place of the one `view` makes — the live one, with what happened. */
  card?: ReactNode
  /** Opens the screenshot or the recording in place. */
  onOpenTarget?: (target: EvidenceOpenTarget) => void
  /** Follows the link, for an item with nothing to open in place. */
  onFollow?: () => void
}

/**
 * A cited evidence item as a chip in the text, from {@link evidenceReferenceView}:
 * its kind's glyph, its short title, the time of a moment, an issue's
 * severity; its preview on hover; a click that opens the screenshot large or
 * the recording at the moment. Something gone reads calmly as not kept.
 */
export function EvidenceReferenceChipView({
  view,
  card,
  onOpenTarget,
  onFollow,
}: EvidenceReferenceChipViewProps) {
  const Glyph = evidenceGlyph(view.glyph)
  const gone = view.phase === 'gone'
  const waiting = view.phase === 'loading'
  const open = view.open
  const act =
    open && onOpenTarget ? () => onOpenTarget(open) : gone || waiting ? undefined : onFollow
  const className = [
    'ref-chip',
    'ref-chip--reference',
    act ? 'ref-chip--link' : '',
    waiting ? 'ref-chip--loading' : '',
    gone ? 'border-dashed bg-(--surface-base) text-(--text-muted)' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const body = (
    <>
      <Glyph className={`ref-chip__glyph ${act ? 'text-(--accent-primary) opacity-100' : ''}`} />
      <span className="ref-chip__label ref-chip__title">{view.label}</span>
      {view.time && !gone ? (
        <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-(--accent-primary)">
          {view.time}
        </span>
      ) : null}
      {view.severity ? (
        <span
          className={`badge badge--soft badge--sm ref-chip__status ${PROCESS_TONE_BADGE[view.severity.tone]}`}
        >
          {view.severity.label}
        </span>
      ) : null}
      {gone ? (
        <span className="shrink-0 text-[11px] text-(--text-muted)">
          · {EVIDENCE_REFERENCE_COPY.notKept}
        </span>
      ) : null}
    </>
  )
  return (
    <Tooltip
      placement="top"
      allowedPlacements={['top', 'bottom']}
      zIndex={2000}
      content={
        card ?? <EvidencePreviewCard view={view} {...(onOpenTarget ? { onOpenTarget } : {})} />
      }
    >
      {act ? (
        <button
          type="button"
          className={className}
          title={view.citation}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            act()
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            act()
          }}
        >
          {body}
        </button>
      ) : (
        <span className={className} title={view.citation} aria-busy={waiting ? true : undefined}>
          {body}
        </span>
      )}
    </Tooltip>
  )
}

function LiveCard({
  link,
  onOpenTarget,
}: {
  link: EvidenceLink
  onOpenTarget: (target: EvidenceOpenTarget) => void
}) {
  const { view } = useEvidenceReference(link, { withIssue: true })
  return view ? <EvidencePreviewCard view={view} onOpenTarget={onOpenTarget} /> : null
}

/** The overlay is a portal: what happens in it stays out of the message the chip sits in. */
function keepInside(e: SyntheticEvent) {
  e.stopPropagation()
}

export type EvidenceReferenceChipProps = {
  link: EvidenceLink
  /** Follows the link — the app's evidence page — for an item with nothing to open in place. */
  onOpen?: (link: ResourceLink) => void
}

/**
 * A cited evidence item a message or report points at, read once however many
 * chips cite it, as {@link EvidenceReferenceChipView}; its hover reads what an
 * issue says happened, and a click opens it in place.
 */
export default function EvidenceReferenceChip({ link, onOpen }: EvidenceReferenceChipProps) {
  const { view } = useEvidenceReference(link)
  const [opened, setOpened] = useState<EvidenceOpenTarget | undefined>()
  if (!view) return null
  return (
    <>
      <EvidenceReferenceChipView
        view={view}
        card={<LiveCard link={link} onOpenTarget={setOpened} />}
        onOpenTarget={setOpened}
        {...(onOpen ? { onFollow: () => onOpen(link) } : {})}
      />
      {opened ? (
        <span
          className="contents"
          onClick={keepInside}
          onMouseDown={keepInside}
          onKeyDown={keepInside}
        >
          <EvidenceTargetOverlay target={opened} onClose={() => setOpened(undefined)} />
        </span>
      ) : null}
    </>
  )
}
