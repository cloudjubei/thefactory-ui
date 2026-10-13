import type { ReactNode } from 'react'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { referencePreview, type ReferencePreview } from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import { PROCESS_TONE_BADGE } from '../process/signoff/tones'
import ReferencePreviewCard from './ReferencePreviewCard'
import { referenceGlyph } from './referenceGlyphs'

export type ReferenceChipProps = {
  description: ReferenceDescription
  /** Opens what the chip points at. Omitted, or for something gone, the chip is not a button. */
  onOpen?: (link: ResourceLink) => void
  /** Shown in the preview under its lines — a design's miniature. */
  preview?: ReactNode
  /** The pill the chip shows, over the one its description has — a run's live status. */
  status?: ReferencePreview['status']
  /** The preview card, in place of the one its description makes — a run's, live. */
  card?: ReactNode
}

/**
 * Something a message points at — a story, feature, process run or process,
 * note, attachment, file or in-app link — as a chip: its current number or
 * name with its title and status, a preview card on hover, and a click that
 * opens it. Something still being looked up shows neutral; something gone
 * shows dashed and opens nothing.
 */
export default function ReferenceChip({
  description,
  onOpen,
  preview,
  status,
  card,
}: ReferenceChipProps) {
  const Glyph = referenceGlyph(description)
  const view = referencePreview(description)
  const pill = status ?? view.status
  const link = description.missing || description.loading ? undefined : description.link
  const className = [
    'ref-chip',
    'ref-chip--reference',
    link && onOpen ? 'ref-chip--link' : '',
    description.missing ? 'ref-chip--missing' : '',
    description.loading ? 'ref-chip--loading' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const title = description.loading ? undefined : description.title
  const body = (
    <>
      <Glyph className="ref-chip__glyph" />
      <span className={title ? 'ref-chip__tag' : 'ref-chip__label'}>{description.label}</span>
      {title ? <span className="ref-chip__label ref-chip__title">{title}</span> : null}
      {pill && !description.missing ? (
        <span
          className={`badge badge--soft badge--sm ref-chip__status ${PROCESS_TONE_BADGE[pill.tone]}`}
        >
          {pill.label}
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
        card ?? (
          <ReferencePreviewCard view={view} glyph={Glyph} {...(onOpen ? { onOpen } : {})}>
            {preview}
          </ReferencePreviewCard>
        )
      }
    >
      {link && onOpen ? (
        <button
          type="button"
          className={className}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onOpen(link)
          }}
          // The tooltip's anchor takes Enter and Space to pin itself; the chip's
          // own keys open what it points at.
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            onOpen(link)
          }}
        >
          {body}
        </button>
      ) : (
        <span className={className} aria-busy={description.loading ? true : undefined}>
          {body}
        </span>
      )}
    </Tooltip>
  )
}
