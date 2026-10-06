import { useEffect, useMemo, useRef, useState } from 'react'

import {
  CAPTURE_SAME_CODE_LABEL,
  captureBuildCaption,
  capturedOnLabel,
  comparisonPairFacts,
  useEvidenceDiff,
  canPairViewerZoomIn,
  canPairViewerZoomOut,
  framePane,
  isPannable,
  pairFitScale,
  pairViewerZoomByWheel,
  pairViewerZoomFloor,
  pairViewerZoomIn,
  pairViewerZoomLabel,
  pairViewerZoomOut,
  resolveViewerScale,
  screenPairFileStem,
  type CaptureBuildCaption,
  type PairViewerSize,
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
import {
  PAIR_CAPTION_RESERVE,
  PAIR_LOADING_FRAME,
  PAIR_SLIDE_RESERVE,
  PAIR_STAGE_GAP,
  PAIR_STAGE_PADDING,
} from './comparisonOverlayConstants'
import { saveSideBySide } from './download'
import { useElementSize } from './useElementSize'
import { useImageNaturalSize } from './useImageNaturalSize'

export type ComparisonOverlayProps = {
  pairs: readonly ScreenPair[]
  /** Key of the pair to show; `undefined` keeps the overlay closed. */
  openKey: string | undefined
  onClose: () => void
  /** The commit befores should be built from — the expectation, never a capture's caption. */
  baseSha: string | undefined
  /** The commit afters should be built from — the expectation, never a capture's caption. */
  headSha: string | undefined
  /** Ask the evidence store to decode the open pair's frames. */
  onRequestImage: (id: string, mediaType: string) => void
  /** Whose evidence store to compute the pixel comparison against. */
  projectId: string
}

type Mode = 'mirror' | 'slide' | 'diff'

/**
 * A side's build, as its own record states it — the commit it was built from,
 * whether the tree was dirty — and, apart, the commit it was expected to be.
 */
function BuildMarks({ build }: { build: CaptureBuildCaption }) {
  return (
    <>
      {build.builtSha ? <RefChip kind="commit" value={build.builtSha} /> : null}
      {build.sameCodeAsExpected ? (
        <span className="text-(--text-muted)">{CAPTURE_SAME_CODE_LABEL}</span>
      ) : null}
      {build.dirty ? (
        <span className="text-(--status-stuck-soft-fg)">uncommitted changes</span>
      ) : null}
      {build.expectedSha ? (
        <>
          <span className="text-(--text-muted)">expected</span>
          <RefChip kind="commit" value={build.expectedSha} />
        </>
      ) : null}
    </>
  )
}

function Caption({ word, build }: { word: 'Before' | 'After'; build: CaptureBuildCaption }) {
  return (
    <figcaption className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
      <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">{word}</span>
      <BuildMarks build={build} />
    </figcaption>
  )
}

/** A frame at `width`, its height from its own natural aspect; the loading box until that is known. */
function Frame({
  src,
  alt,
  width,
  natural,
  loading,
}: {
  src: string | undefined
  alt: string
  width: number
  natural: PairViewerSize | undefined
  loading: PairViewerSize
}) {
  const box = natural
    ? { width, height: Math.round((width * natural.h) / natural.w) }
    : { width: loading.w, height: loading.h }
  return src ? (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{ ...box, maxWidth: 'none', objectFit: 'contain' }}
      className="block select-none rounded-md border border-(--border-default) bg-white"
    />
  ) : (
    <div
      style={box}
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
  onRequestImage,
  projectId,
}: ComparisonOverlayProps) {
  const [mode, setMode] = useState<Mode>('slide')
  const [manualScale, setManualScale] = useState<number | undefined>(undefined)
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
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
  useEffect(() => {
    setManualScale(undefined)
  }, [openKey, position])
  // Decode the open pair's frames on demand — the strip only decoded thumbnails,
  // and the overlay is where the full-size bytes are actually needed.
  useEffect(() => {
    if (!isOpen || !pair) return
    if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
    if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
  }, [isOpen, pair, onRequestImage])
  const capturedOn = pair ? capturedOnLabel(pair) : undefined
  const before = pair?.before?.dataUri
  const after = pair?.after?.dataUri
  const canSlide = Boolean(pair?.before && pair?.after)
  // Diff and Slide both need two captures; with one there is nothing to compare.
  const effectiveMode: Mode = canSlide ? mode : 'mirror'
  const diff = useEvidenceDiff(
    projectId,
    pair?.before?.ref.id,
    pair?.after?.ref.id,
    effectiveMode === 'diff',
  )
  const cut = holdBase ? 100 : slidePct

  const beforeNatural = useImageNaturalSize(before)
  const afterNatural = useImageNaturalSize(after)
  const diffNatural = useImageNaturalSize(effectiveMode === 'diff' ? diff.dataUri : undefined)
  const showBefore = Boolean(pair?.before || !pair?.after)
  const showAfter = Boolean(pair?.after)
  const stage = useElementSize(stageEl)
  const pane = framePane(
    stage && { w: stage.w - PAIR_STAGE_PADDING, h: stage.h - PAIR_STAGE_PADDING },
    {
      columns: effectiveMode === 'mirror' && showBefore && showAfter ? 2 : 1,
      gap: PAIR_STAGE_GAP,
      reserveHeight: effectiveMode === 'slide' ? PAIR_SLIDE_RESERVE : PAIR_CAPTION_RESERVE,
    },
  )
  const naturals =
    effectiveMode === 'diff'
      ? [diffNatural]
      : effectiveMode === 'slide'
        ? [beforeNatural, afterNatural]
        : [showBefore ? beforeNatural : undefined, showAfter ? afterNatural : undefined]
  // The fit is the default: the whole frame in view, upscaled at most to the
  // screen's pixel density — never a fixed CSS width that "100%" was relative to.
  const fit = pairFitScale({ naturals, pane, pixelRatio: window.devicePixelRatio })
  const scale = resolveViewerScale(manualScale, fit)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const floor = pairViewerZoomFloor(fit)
  const pannable = isPannable(scale, fit)
  const loading: PairViewerSize = {
    w: Math.min(PAIR_LOADING_FRAME.w, pane?.w ?? PAIR_LOADING_FRAME.w),
    h: Math.min(PAIR_LOADING_FRAME.h, pane?.h ?? PAIR_LOADING_FRAME.h),
  }
  const widthOf = (natural: PairViewerSize | undefined) =>
    natural ? Math.round(natural.w * scale) : loading.w
  const slideNatural = beforeNatural ?? afterNatural
  const slideWidth = widthOf(slideNatural)
  const zoomTo = (next: (current: number) => number) =>
    setManualScale((m) => next(m ?? scaleRef.current))

  const pairFacts = pair ? comparisonPairFacts(pair) : []
  const beforeBuild = captureBuildCaption(pair?.before, pair?.expectedBaseSha ?? baseSha, {
    counted: pair?.counted === true,
  })
  const afterBuild = captureBuildCaption(pair?.after, pair?.expectedHeadSha ?? headSha, {
    counted: pair?.counted === true,
  })

  const hint =
    effectiveMode === 'mirror'
      ? 'Both frames are on screen, so there is nothing to flip.'
      : effectiveMode === 'diff'
        ? 'Every pixel that changed, marked. The unchanged screen shows through faintly for context.'
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
          zoomTo((s) => pairViewerZoomByWheel(s, e.deltaY, floor))
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-(--text-primary)">
              {pair ? `${String(pair.index).padStart(2, '0')} · ${pair.title}` : ''}
            </div>
            {/* WHERE it was captured. A screenshot offered as proof has to say
                what it is a screenshot of. */}
            {capturedOn ? (
              <div className="truncate text-[11px] text-(--text-secondary)">{capturedOn}</div>
            ) : null}
          </div>
          <SegmentedControl
            size="sm"
            ariaLabel="Comparison mode"
            value={effectiveMode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'mirror', label: 'Mirror' },
              { value: 'diff', label: 'Diff' },
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
              disabled={!canPairViewerZoomOut(scale, floor)}
              onClick={() => zoomTo((s) => pairViewerZoomOut(s, floor))}
            >
              <IconZoomOut className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-(--text-muted)">
              {pairViewerZoomLabel(scale)}
            </span>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={!canPairViewerZoomIn(scale)}
              onClick={() => zoomTo((s) => pairViewerZoomIn(s, floor))}
            >
              <IconZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Fit to screen"
              title="Fit to screen"
              onClick={() => setManualScale(undefined)}
            >
              <IconRefresh className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-[11px] text-(--text-muted)">
            Hold Ctrl/⌘ + scroll to zoom; drag to pan.
          </span>
        </div>

        {/* Measured from a wrapper that never scrolls, so a scrollbar appearing
            under a zoom cannot shrink the pane and re-fit in a loop. */}
        <div ref={setStageEl} className="relative min-h-0 flex-1">
          <div
            className="absolute inset-0 flex items-start justify-center gap-6 overflow-auto p-2"
            style={{ cursor: dragRef.current ? 'grabbing' : pannable ? 'grab' : 'default' }}
            onPointerDown={(e) => {
              // Pan only once the frame is bigger than its stage — below that the
              // drag belongs to the slide handle, not to the image.
              if (!pannable) return
              const el = e.currentTarget
              el.setPointerCapture(e.pointerId)
              dragRef.current = {
                x: e.clientX,
                y: e.clientY,
                left: el.scrollLeft,
                top: el.scrollTop,
              }
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
            {effectiveMode === 'diff' ? (
              <figure className="flex flex-col items-center gap-2">
                {diff.dataUri ? (
                  <Frame
                    src={diff.dataUri}
                    alt={`${pair?.title ?? ''} — changed pixels`}
                    width={widthOf(diffNatural)}
                    natural={diffNatural}
                    loading={loading}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-md border border-dashed border-(--border-default) p-6 text-center text-xs text-(--text-secondary)"
                    style={{ width: loading.w, minHeight: 160 }}
                  >
                    {/* A refusal always says WHY — an unreadable capture, no
                      overlapping area, a size past the ceiling. A blank pane
                      with no reason is the failure this surface exists to fix. */}
                    {diff.loading ? 'Comparing…' : (diff.error ?? 'No comparison available.')}
                  </div>
                )}
                <figcaption className="flex items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
                  <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">
                    Changed pixels
                  </span>
                </figcaption>
              </figure>
            ) : effectiveMode === 'mirror' ? (
              <>
                {showBefore ? (
                  <figure className="flex flex-col items-center gap-2">
                    <Frame
                      src={before}
                      alt={`${pair?.title ?? ''} — before`}
                      width={widthOf(beforeNatural)}
                      natural={beforeNatural}
                      loading={loading}
                    />
                    <Caption word="Before" build={beforeBuild} />
                  </figure>
                ) : null}
                {pair?.after ? (
                  <figure className="flex flex-col items-center gap-2">
                    <Frame
                      src={after}
                      alt={`${pair.title} — after`}
                      width={widthOf(afterNatural)}
                      natural={afterNatural}
                      loading={loading}
                    />
                    <Caption word="After" build={afterBuild} />
                  </figure>
                ) : null}
              </>
            ) : (
              <figure className="flex flex-col items-center gap-2">
                <span className="relative block" style={{ width: slideWidth }}>
                  <Frame
                    src={before}
                    alt={`${pair?.title ?? ''} — before`}
                    width={slideWidth}
                    natural={beforeNatural}
                    loading={loading}
                  />
                  <span
                    className="absolute inset-0 block"
                    style={{ clipPath: `inset(0 0 0 ${cut}%)` }}
                  >
                    <Frame
                      src={after}
                      alt={`${pair?.title ?? ''} — after`}
                      width={slideWidth}
                      natural={afterNatural}
                      loading={loading}
                    />
                  </span>
                  <span
                    className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-(--color-pink-600)"
                    style={{ left: `${cut}%` }}
                  />
                </span>
                <figcaption className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
                  <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">
                    Before
                  </span>
                  <BuildMarks build={beforeBuild} />
                  <span className="text-(--text-muted)">drag</span>
                  <span className="chip-pill chip-pill--sm chip-pill--neutral font-medium">
                    After
                  </span>
                  <BuildMarks build={afterBuild} />
                </figcaption>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slidePct}
                  onChange={(e) => setSlidePct(Number(e.target.value))}
                  aria-label="Reveal the branch"
                  style={{ width: slideWidth }}
                />
              </figure>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-(--text-muted)">
          {/* What this pair IS comes first — the mode hint is secondary. */}
          {pairFacts.map((fact) => (
            <div key={fact} className="mx-auto max-w-[72ch]">
              {fact}
            </div>
          ))}
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
