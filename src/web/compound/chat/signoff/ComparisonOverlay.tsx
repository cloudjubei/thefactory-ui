import { useEffect, useMemo, useRef, useState } from 'react'

import {
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  screenPairFileStem,
  zoomByWheel,
  zoomIn,
  zoomLabel,
  zoomOut,
  type ScreenPair,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { FullScreenOverlay } from '../../../primitives/FullScreenOverlay'
import SegmentedControl from '../../../primitives/SegmentedControl'
import Tooltip from '../../../primitives/Tooltip'
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
} from '../../../icons'
import { RefChip } from '../../chips'
import { saveSideBySide } from './download'

export type ComparisonOverlayProps = {
  pairs: readonly ScreenPair[]
  /** Key of the pair to show; `undefined` keeps the overlay closed. */
  openKey: string | undefined
  onClose: () => void
  baseSha: string | undefined
  headSha: string | undefined
}

type Mode = 'mirror' | 'slide'

const BASE_WIDTH = 240

function Caption({ word, sha }: { word: 'Before' | 'After'; sha: string | undefined }) {
  return (
    <figcaption className="flex items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
      <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">{word}</span>
      {sha ? <RefChip kind="commit" value={sha} /> : null}
    </figcaption>
  )
}

function Frame({ src, alt, width }: { src: string | undefined; alt: string; width: number }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{ width, height: 'auto' }}
      className="block select-none rounded-md border border-(--border-default) bg-white"
    />
  ) : (
    <div
      style={{ width, height: width * 2 }}
      className="animate-pulse rounded-md border border-(--border-default) bg-(--surface-muted)"
    />
  )
}

/**
 * The before/after comparison, edge to edge. Two modes for stills — Mirror
 * (both frames, left is always base) and Slide (one frame, a divider reveals
 * the branch) — under ONE shared zoom, so the pair can only ever be compared
 * at the same scale. Diff needs a pixel comparison the backend does not file
 * yet, so it is not offered rather than offered and empty.
 */
export default function ComparisonOverlay({
  pairs,
  openKey,
  onClose,
  baseSha,
  headSha,
}: ComparisonOverlayProps) {
  const [mode, setMode] = useState<Mode>('slide')
  const [zoom, setZoom] = useState(1)
  const [slidePct, setSlidePct] = useState(50)
  const [holdBase, setHoldBase] = useState(false)
  const [position, setPosition] = useState(0)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const isOpen = openKey !== undefined
  const openIndex = useMemo(() => pairs.findIndex((p) => p.key === openKey), [pairs, openKey])

  useEffect(() => {
    if (openIndex >= 0) setPosition(openIndex)
  }, [openIndex])

  useEffect(() => {
    if (!isOpen) return
    const step = (d: number) =>
      setPosition((p) => (pairs.length ? (p + d + pairs.length) % pairs.length : 0))
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if ((e.key === 'b' || e.key === 'B') && !e.repeat) setHoldBase(true)
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') setHoldBase(false)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [isOpen, pairs.length])

  const pair = pairs[position]
  const width = Math.round(BASE_WIDTH * zoom)
  const before = pair?.before?.dataUri
  const after = pair?.after?.dataUri
  const canSlide = Boolean(pair?.before && pair?.after)
  const effectiveMode: Mode = canSlide ? mode : 'mirror'
  const cut = holdBase ? 100 : slidePct

  const pairFact =
    pair?.class === 'new'
      ? 'This screen exists only on the branch.'
      : pair?.class === 'removed'
        ? 'This screen exists only on the base.'
        : pair?.class === 'single'
          ? 'A single capture — there is nothing to compare it with.'
          : 'Captured on both the base and the branch.'

  const hint =
    effectiveMode === 'mirror'
      ? 'Both frames are on screen, so there is nothing to flip.'
      : 'Drag the handle, or hold B to swing it fully to the base.'

  const save = () => {
    if (!pair) return
    const stem = screenPairFileStem(pair)
    // ONE side-by-side sheet, not two files: the pair is the unit of evidence,
    // and two downloads make the reader reassemble what they were just shown.
    void saveSideBySide(before, after, `${stem}-before-after.png`)
  }

  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onClose} hideHeader>
      <div
        className="flex h-full min-h-0 w-full flex-col gap-3 p-4"
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          setZoom((z) => zoomByWheel(z, e.deltaY))
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0 truncate text-sm font-semibold text-(--text-primary)">
            {pair ? `${String(pair.index).padStart(2, '0')} · ${pair.title}` : ''}
          </div>
          <SegmentedControl
            size="sm"
            ariaLabel="Comparison mode"
            value={effectiveMode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'mirror', label: 'Mirror' },
              { value: 'slide', label: 'Slide' },
            ]}
          />
          <div className="flex items-center justify-end gap-1.5">
            <Tooltip
              content={
                <span className="text-xs">
                  Both frames as one side-by-side image, named{' '}
                  <code className="font-mono">{`${pair ? screenPairFileStem(pair) : 'NN-screen'}-before-after.png`}</code>
                  .
                </span>
              }
              placement="bottom"
            >
              <Button variant="secondary" size="icon" aria-label="Save this pair" onClick={save}>
                <IconDownload className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Button variant="secondary" size="icon" aria-label="Close" onClick={onClose}>
              <IconClose className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= IMAGE_ZOOM_MIN + 1e-9}
              onClick={() => setZoom(zoomOut)}
            >
              <IconZoomOut className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-(--text-muted)">
              {zoomLabel(zoom)}
            </span>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= IMAGE_ZOOM_MAX - 1e-9}
              onClick={() => setZoom(zoomIn)}
            >
              <IconZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Reset zoom"
              title="Reset zoom"
              onClick={() => setZoom(1)}
            >
              <IconRefresh className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-[11px] text-(--text-muted)">
            Hold Ctrl/⌘ + scroll to zoom; drag to pan.
          </span>
        </div>

        <div
          className="flex min-h-0 flex-1 items-start justify-center gap-6 overflow-auto p-2"
          style={{ cursor: dragRef.current ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
          onPointerDown={(e) => {
            // Pan only once the frame is bigger than its stage — below that the
            // drag belongs to the slide handle, not to the image.
            if (zoom <= 1) return
            const el = e.currentTarget
            el.setPointerCapture(e.pointerId)
            dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current
            if (!drag) return
            const el = e.currentTarget
            el.scrollLeft = drag.left - (e.clientX - drag.x)
            el.scrollTop = drag.top - (e.clientY - drag.y)
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          {effectiveMode === 'mirror' ? (
            <>
              {pair?.before || !pair?.after ? (
                <figure className="flex flex-col items-center gap-2">
                  <Frame src={before} alt={`${pair?.title ?? ''} — before`} width={width} />
                  <Caption word="Before" sha={baseSha} />
                </figure>
              ) : null}
              {pair?.after ? (
                <figure className="flex flex-col items-center gap-2">
                  <Frame src={after} alt={`${pair.title} — after`} width={width} />
                  <Caption word="After" sha={headSha} />
                </figure>
              ) : null}
            </>
          ) : (
            <figure className="flex flex-col items-center gap-2">
              <span className="relative block" style={{ width }}>
                <Frame src={before} alt={`${pair?.title ?? ''} — before`} width={width} />
                <span
                  className="absolute inset-0 block"
                  style={{ clipPath: `inset(0 0 0 ${cut}%)` }}
                >
                  <Frame src={after} alt={`${pair?.title ?? ''} — after`} width={width} />
                </span>
                <span
                  className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-(--color-pink-600)"
                  style={{ left: `${cut}%` }}
                />
              </span>
              <figcaption className="flex items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
                <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">
                  Before
                </span>
                {baseSha ? <RefChip kind="commit" value={baseSha} /> : null}
                <span className="text-(--text-muted)">drag</span>
                <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">
                  After
                </span>
                {headSha ? <RefChip kind="commit" value={headSha} /> : null}
              </figcaption>
              <input
                type="range"
                min={0}
                max={100}
                value={slidePct}
                onChange={(e) => setSlidePct(Number(e.target.value))}
                aria-label="Reveal the branch"
                style={{ width }}
              />
            </figure>
          )}
        </div>

        <div className="text-center text-xs text-(--text-muted)">
          {/* What this pair IS comes first — the mode hint is secondary. */}
          <div>{pairFact}</div>
          <div>
            {hint} <b className="text-(--text-secondary)">← →</b> to page.
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous screen"
            onClick={() => setPosition((p) => (p - 1 + pairs.length) % pairs.length)}
            disabled={pairs.length < 2}
          >
            <IconChevronLeft className="w-4 h-4" />
          </Button>
          <span className="min-w-16 text-center text-xs tabular-nums text-(--text-secondary)">
            {pairs.length ? `${position + 1} of ${pairs.length}` : ''}
          </span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next screen"
            onClick={() => setPosition((p) => (p + 1) % pairs.length)}
            disabled={pairs.length < 2}
          >
            <IconChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </FullScreenOverlay>
  )
}
