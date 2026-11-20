import type { EvidenceOpenTarget, EvidenceReferenceView } from '../../../headless'
import { Button } from '../../primitives/Button'
import ReferencePreviewCard from './ReferencePreviewCard'
import { evidenceGlyph } from './referenceGlyphs'

export type EvidencePreviewCardProps = {
  view: EvidenceReferenceView
  /** Opens the screenshot large or the recording at its moment; without it, no buttons. */
  onOpenTarget?: (target: EvidenceOpenTarget) => void
}

/**
 * What an evidence item is, on hover: its kind, its title and severity, what
 * happened and where, its screenshot or the recording's frame at the moment,
 * and the buttons that open the screenshot or play the moment.
 */
export default function EvidencePreviewCard({ view, onOpenTarget }: EvidencePreviewCardProps) {
  const { card } = view
  const primary = card.actions.find((action) => action.primary)
  const thumbnail = card.thumbnail
  return (
    <ReferencePreviewCard
      view={{
        caption: card.caption,
        title: card.title,
        lines: card.lines,
        ...(card.severity ? { status: card.severity } : {}),
      }}
      glyph={evidenceGlyph(view.glyph)}
    >
      {thumbnail ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={!primary || !onOpenTarget}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (primary) onOpenTarget?.(primary.target)
          }}
          className="block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-md border border-(--border-subtle) bg-black"
        >
          {thumbnail.kind === 'image' ? (
            <img alt="" src={thumbnail.url} className="block size-full object-cover" />
          ) : (
            <video
              muted
              playsInline
              preload="metadata"
              src={
                thumbnail.atSec !== undefined
                  ? `${thumbnail.url}#t=${thumbnail.atSec}`
                  : thumbnail.url
              }
              className="block size-full object-cover"
            />
          )}
        </button>
      ) : null}
      {onOpenTarget && card.actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {card.actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.primary ? 'primary' : 'secondary'}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenTarget(action.target)
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </ReferencePreviewCard>
  )
}
