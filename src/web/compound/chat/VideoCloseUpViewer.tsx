import { useEffect } from 'react'

import { VIDEO_TIMELINE_TEXT, type VideoTimelineCloseUpRow } from '../../../headless'
import { IconChevronLeft, IconChevronRight, IconPlay } from '../../icons'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export type VideoCloseUpViewerProps = {
  /** Every close-up of the video's timeline, in its order. */
  closeUps: readonly VideoTimelineCloseUpRow[]
  /** The one shown; none, closed. */
  index: number | undefined
  onIndex: (index: number) => void
  onClose: () => void
  /** Play from its time: the viewer closes, the video plays from there as a row's time does. */
  onPlayFrom: (atSec: number) => void
}

const STEP =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:text-(--text-primary) disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-(--accent-primary)'

/**
 * A timeline's close-up at its real size, as big as the window allows, over the chat: its time,
 * place and text, the arrows through the video's other close-ups, and Play from its time. ×,
 * Escape or a press outside close it; focus stays inside and goes back to the close-up after.
 */
export default function VideoCloseUpViewer({
  closeUps,
  index,
  onIndex,
  onClose,
  onPlayFrom,
}: VideoCloseUpViewerProps) {
  const shown = index === undefined ? undefined : closeUps[index]
  const at = index ?? 0
  const canBack = at > 0
  const canOn = at < closeUps.length - 1

  useEffect(() => {
    if (!shown) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key === 'ArrowLeft' && canBack) onIndex(at - 1)
      if (event.key === 'ArrowRight' && canOn) onIndex(at + 1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [shown, at, canBack, canOn, onIndex, onClose])

  return (
    <Modal
      isOpen={!!shown}
      onClose={onClose}
      title={shown ? VIDEO_TIMELINE_TEXT.closeUpTitle(shown.time) : undefined}
      size="xl"
      closeOnEsc={false}
      panelClassName="sm:max-w-[min(96vw,64rem)]"
      contentClassName="flex flex-col gap-3"
      footer={
        shown ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={VIDEO_TIMELINE_TEXT.previousCloseUp}
              title={VIDEO_TIMELINE_TEXT.previousCloseUp}
              disabled={!canBack}
              className={STEP}
              onClick={() => onIndex(at - 1)}
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12px] tabular-nums text-(--text-secondary)" aria-live="polite">
              {VIDEO_TIMELINE_TEXT.closeUpCount(at + 1, closeUps.length)}
            </span>
            <button
              type="button"
              aria-label={VIDEO_TIMELINE_TEXT.nextCloseUp}
              title={VIDEO_TIMELINE_TEXT.nextCloseUp}
              disabled={!canOn}
              className={STEP}
              onClick={() => onIndex(at + 1)}
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              className="ml-auto inline-flex items-center gap-1.5"
              onClick={() => {
                onClose()
                onPlayFrom(shown.timeSec)
              }}
            >
              <IconPlay className="h-3.5 w-3.5 [&_polygon]:fill-current" />
              {VIDEO_TIMELINE_TEXT.playFrom(shown.time)}
            </Button>
          </div>
        ) : null
      }
    >
      {shown ? (
        <>
          <div className="flex min-h-24 items-center justify-center overflow-hidden rounded-md bg-(--surface-muted) p-3">
            <img
              key={shown.key}
              src={shown.url}
              alt={shown.text}
              style={{ width: shown.width, aspectRatio: `${shown.width} / ${shown.height}` }}
              className="max-h-[60vh] max-w-full rounded-xs border border-(--border-subtle) object-contain"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-(--text-secondary)">
              <span className="tabular-nums text-(--accent-primary)">{shown.time}</span>
              {` · ${shown.place}`}
            </span>
            {shown.words ? (
              <span className="text-[13px] leading-5 text-(--text-primary) break-words">
                {shown.words}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  )
}
