import type { ComponentType } from 'react'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import Tooltip from '../../primitives/Tooltip'
import {
  IconAttach,
  IconBoard,
  IconChat,
  IconDocument,
  IconFiles,
  IconFolder,
  IconList,
  IconMonitor,
} from '../../icons'

export type ReferenceChipProps = {
  description: ReferenceDescription
  /** Opens what the chip points at. Omitted, or for something gone, the chip is not a button. */
  onOpen?: (link: ResourceLink) => void
}

const GLYPHS: Record<ReferenceDescription['kind'], ComponentType<{ className?: string }>> = {
  story: IconBoard,
  feature: IconList,
  note: IconDocument,
  groupNote: IconDocument,
  attachment: IconAttach,
  file: IconFiles,
  project: IconFolder,
  chat: IconChat,
  app: IconMonitor,
}

/**
 * Something a message points at — a story, feature, note, attachment, file or
 * in-app link — as a chip: its current number or name, what it is on hover,
 * and a click that opens it. Something gone shows as such and opens nothing.
 */
export default function ReferenceChip({ description, onOpen }: ReferenceChipProps) {
  const Glyph = GLYPHS[description.kind]
  const link = description.missing ? undefined : description.link
  const className = [
    'ref-chip',
    'ref-chip--reference',
    link && onOpen ? 'ref-chip--link' : '',
    description.missing ? 'ref-chip--missing' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const body = (
    <>
      <Glyph className="ref-chip__glyph" />
      <span className="ref-chip__label">{description.label}</span>
    </>
  )
  return (
    <Tooltip
      placement="top"
      allowedPlacements={['top', 'bottom']}
      zIndex={2000}
      content={
        <div className="flex max-w-80 flex-col gap-1 text-[12px]">
          <span className="font-semibold text-(--text-primary)">{description.label}</span>
          {description.detail ? (
            <span className="text-(--text-secondary)">{description.detail}</span>
          ) : null}
        </div>
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
        <span className={className}>{body}</span>
      )}
    </Tooltip>
  )
}
