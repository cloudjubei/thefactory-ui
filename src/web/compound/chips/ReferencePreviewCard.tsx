import type { ComponentType, ReactNode } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import type { FilePreviewTarget, ReferencePreview } from '../../../headless'
import { FILE_PREVIEW_LABEL } from '../../../headless/utils/filePreviewConstants'
import { Button } from '../../primitives/Button'
import { PROCESS_TONE_BADGE } from '../process/signoff/tones'

export type ReferencePreviewCardProps = {
  view: ReferencePreview
  glyph: ComponentType<{ className?: string }>
  /** Opens what the card is about; without it, the card offers no button. */
  onOpen?: (link: ResourceLink) => void
  /** Opens a file in a popup, beside "Open in Files"; only a file's card offers it. */
  onPreview?: (target: FilePreviewTarget) => void
  /** A second action beside the open button — a run's chat. */
  secondary?: { label: string; onSelect: () => void }
  /** More to show under the lines — a design's miniature. */
  children?: ReactNode
}

/**
 * What a reference is, on hover: its kind, its number and title, its status,
 * a line or two about it, and one click that opens it — for a file, a second
 * that previews it in a popup.
 */
export default function ReferencePreviewCard({
  view,
  glyph: Glyph,
  onOpen,
  onPreview,
  secondary,
  children,
}: ReferencePreviewCardProps) {
  const primary = view.primary && onOpen ? view.primary : undefined
  const filePreview = view.filePreview && onPreview ? view.filePreview : undefined
  return (
    <div className="flex w-72 max-w-full flex-col gap-2.5 text-[12.5px]">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-(--text-secondary)">
          <Glyph className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-(--text-secondary)">
            {view.caption}
          </span>
          <span className="break-words text-[14px] font-semibold leading-snug text-(--text-primary)">
            {view.title}
          </span>
        </span>
      </div>
      {view.status ? (
        <span
          className={`badge badge--soft badge--sm self-start ${PROCESS_TONE_BADGE[view.status.tone]}`}
        >
          {view.status.label}
        </span>
      ) : null}
      {view.lines.length > 0 ? (
        <div className="flex flex-col gap-1">
          {view.lines.map((line) => (
            <div key={`${line.label}:${line.value}`} className="flex gap-2.5 leading-normal">
              {line.label ? (
                <span className="w-[74px] shrink-0 text-(--text-secondary)">{line.label}</span>
              ) : null}
              <span className="min-w-0 break-words text-(--text-primary)">{line.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {children}
      {primary || filePreview || secondary ? (
        <div className="flex flex-wrap gap-2">
          {primary ? (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpen?.(primary.link)
              }}
            >
              {primary.label}
            </Button>
          ) : null}
          {filePreview ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPreview?.(filePreview)
              }}
            >
              {FILE_PREVIEW_LABEL}
            </Button>
          ) : null}
          {secondary ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                secondary.onSelect()
              }}
            >
              {secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
