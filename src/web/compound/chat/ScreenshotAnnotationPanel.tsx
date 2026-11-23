import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Button } from '../../primitives/Button'
import {
  previewCropMapping,
  screenshotCropPercent,
  screenshotDragRect,
  screenshotPreviewUri,
} from '../../../headless/utils/screenshotAnnotation'
import { SCREENSHOT_ANNOTATION_TEXT } from '../../../headless/utils/screenshotAnnotationConstants'
import type {
  ScreenshotAnnotationView,
  ScreenshotPointRect,
} from '../../../headless/utils/screenshotAnnotationTypes'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'

export type ScreenshotAnnotationPanelProps = {
  view: ScreenshotAnnotationView
}

type Point = { x: number; y: number }

function usePreviewUrl(file: ChatAttachmentFile | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    if (!('blob' in file)) {
      setUrl(screenshotPreviewUri(file))
      return
    }
    const objectUrl = URL.createObjectURL(file.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return url
}

/** Capture, preview, crop and comment on the app before it joins the chat as a note. Web peer of the native panel. */
export default function ScreenshotAnnotationPanel({ view }: ScreenshotAnnotationPanelProps) {
  const { draft, snapshot, unavailableReason, previewFile, capture } = view
  const previewUrl = usePreviewUrl(previewFile)
  const frameRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ from: Point; to: Point } | null>(null)
  // The outline follows `drag`. Pointer-up reads this ref, which the handlers
  // write themselves: `drag` from the last render is still the previous box
  // when the pointer moves and lets go in the same turn.
  const dragRef = useRef<{ from: Point; to: Point } | null>(null)
  const rememberDrag = (next: { from: Point; to: Point } | null) => {
    dragRef.current = next
    setDrag(next)
  }
  const holding =
    !!snapshot.image &&
    (snapshot.phase === 'preview' || snapshot.phase === 'failed' || snapshot.phase === 'uploading')

  const pointOf = (event: PointerEvent<HTMLDivElement>): Point | null => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return null
    return { x: event.clientX - frame.left, y: event.clientY - frame.top }
  }

  const finishDrag = (selection: ScreenshotPointRect) => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame || !snapshot.image) return
    const mapping = previewCropMapping(snapshot.image, {
      width: frame.width,
      height: frame.height,
    })
    if (mapping) draft?.applyCrop(selection, mapping)
  }

  const dragRect = drag ? screenshotDragRect(drag.from, drag.to) : null
  const crop =
    snapshot.crop && snapshot.image ? screenshotCropPercent(snapshot.crop, snapshot.image) : null

  return (
    <section aria-label={SCREENSHOT_ANNOTATION_TEXT.title} className="flex flex-col gap-2 text-sm">
      {!holding ? (
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.phase === 'capturing' ? (
            <>
              <span className="text-(--text-secondary)">
                {SCREENSHOT_ANNOTATION_TEXT.capturing}
              </span>
              <Button size="sm" variant="ghost" onClick={() => draft?.cancel()}>
                {SCREENSHOT_ANNOTATION_TEXT.cancel}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={capture}
              disabled={!!unavailableReason || !draft || !snapshot.canCapture}
            >
              {SCREENSHOT_ANNOTATION_TEXT.capture}
            </Button>
          )}
          {unavailableReason ? (
            <span role="note" className="text-(--text-secondary)">
              {unavailableReason}
            </span>
          ) : null}
          {snapshot.error ? (
            <span role="alert" className="text-(--status-stuck-soft-fg)">
              {snapshot.error}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) p-2">
          <div
            ref={frameRef}
            className="relative w-full touch-none select-none overflow-hidden rounded border border-(--border-default)"
            style={{
              aspectRatio: `${snapshot.image?.width ?? 1} / ${snapshot.image?.height ?? 1}`,
              cursor: snapshot.canCrop ? 'crosshair' : 'default',
            }}
            onPointerDown={(event) => {
              if (!snapshot.canCrop) return
              const point = pointOf(event)
              if (!point) return
              event.currentTarget.setPointerCapture?.(event.pointerId)
              rememberDrag({ from: point, to: point })
            }}
            onPointerMove={(event) => {
              const from = dragRef.current?.from
              if (!from) return
              const point = pointOf(event)
              if (point) rememberDrag({ from, to: point })
            }}
            onPointerUp={() => {
              const done = dragRef.current
              rememberDrag(null)
              if (!done) return
              const selection = screenshotDragRect(done.from, done.to)
              // A click is a press and release on the same point. Applying that
              // zero-size drag flags an empty crop and leaves the previous region.
              if (selection.width === 0 || selection.height === 0) return
              finishDrag(selection)
            }}
            onPointerCancel={() => rememberDrag(null)}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={SCREENSHOT_ANNOTATION_TEXT.preview}
                draggable={false}
                className="block h-full w-full"
              />
            ) : null}
            {crop && !dragRect ? (
              <div
                aria-label={SCREENSHOT_ANNOTATION_TEXT.cropArea}
                className="pointer-events-none absolute border-2 border-(--accent-primary)"
                style={crop}
              />
            ) : null}
            {dragRect ? (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-(--accent-primary)"
                style={{
                  left: dragRect.x,
                  top: dragRect.y,
                  width: dragRect.width,
                  height: dragRect.height,
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-(--text-secondary)">
            {snapshot.areaLabel ? <span>{snapshot.areaLabel}</span> : null}
            {snapshot.canCrop ? <span>{SCREENSHOT_ANNOTATION_TEXT.cropHint}</span> : null}
            {snapshot.canUseEntireImage && snapshot.crop ? (
              <Button size="sm" variant="ghost" onClick={() => draft?.useEntireImage()}>
                {SCREENSHOT_ANNOTATION_TEXT.useEntireImage}
              </Button>
            ) : null}
            {snapshot.canUseAppRegion ? (
              <Button size="sm" variant="ghost" onClick={() => draft?.useAppRegion()}>
                {SCREENSHOT_ANNOTATION_TEXT.useAppRegion}
              </Button>
            ) : null}
          </div>
          {snapshot.needsAppCrop ? (
            <p role="note" className="text-(--text-secondary)">
              {SCREENSHOT_ANNOTATION_TEXT.displaySource}
            </p>
          ) : null}
          <textarea
            aria-label={SCREENSHOT_ANNOTATION_TEXT.comment}
            placeholder={SCREENSHOT_ANNOTATION_TEXT.commentPlaceholder}
            rows={2}
            value={snapshot.comment}
            readOnly={!snapshot.canComment}
            onChange={(event) => draft?.setComment(event.target.value)}
            className="w-full resize-y rounded border border-(--border-default) bg-transparent p-1 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
          />
          {snapshot.error ? (
            <p role="alert" className="text-(--status-stuck-soft-fg)">
              {snapshot.error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {snapshot.phase === 'uploading' ? (
              <>
                <span className="text-(--text-secondary)">
                  {SCREENSHOT_ANNOTATION_TEXT.uploading}
                </span>
                <Button size="sm" variant="ghost" onClick={() => draft?.cancel()}>
                  {SCREENSHOT_ANNOTATION_TEXT.cancel}
                </Button>
              </>
            ) : (
              <>
                {snapshot.canRetry ? (
                  <Button size="sm" variant="primary" onClick={() => draft?.retry()}>
                    {SCREENSHOT_ANNOTATION_TEXT.retry}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!snapshot.canConfirm}
                    onClick={() => draft?.confirm()}
                  >
                    {SCREENSHOT_ANNOTATION_TEXT.confirm}
                  </Button>
                )}
                {snapshot.canRemove ? (
                  <Button size="sm" variant="ghost" onClick={() => draft?.remove()}>
                    {SCREENSHOT_ANNOTATION_TEXT.remove}
                  </Button>
                ) : null}
              </>
            )}
            <span className="text-(--text-muted)">{SCREENSHOT_ANNOTATION_TEXT.confirmHint}</span>
          </div>
        </div>
      )}
    </section>
  )
}
