import { IMAGE_ZOOM_MAX, IMAGE_ZOOM_MIN, IMAGE_ZOOM_STEP } from './imageZoom'
import { PAIR_VIEWER_MAX_FIT_UPSCALE, PAIR_VIEWER_MIN_SCALE } from './pairViewerFitConstants'
import type {
  PairViewerFitInput,
  PairViewerPairFitInput,
  PairViewerPaneLayout,
  PairViewerSize,
} from './pairViewerFitTypes'

function isUsable(size: PairViewerSize | undefined): size is PairViewerSize {
  return (
    size !== undefined &&
    Number.isFinite(size.w) &&
    Number.isFinite(size.h) &&
    size.w > 0 &&
    size.h > 0
  )
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * The largest scale (layout px per natural pixel) at which `natural` fits both the
 * width and the height of `pane`. Upscaling stops at the pixel ratio (never below
 * 1×) and at `cap`. `undefined` while either size is unknown or empty.
 */
export function fitScale({
  natural,
  pane,
  pixelRatio,
  cap,
}: PairViewerFitInput): number | undefined {
  if (!isUsable(natural) || !isUsable(pane)) return undefined
  const ceiling = Math.min(
    Math.max(1, positiveOr(pixelRatio, 1)),
    positiveOr(cap, PAIR_VIEWER_MAX_FIT_UPSCALE),
  )
  const scale = Math.min(pane.w / natural.w, pane.h / natural.h, ceiling)
  return Math.max(PAIR_VIEWER_MIN_SCALE, scale)
}

/**
 * One scale for frames shown together: the smallest of their fits, so every one of
 * them fits. Frames not yet decoded are skipped; `undefined` when none has.
 */
export function pairFitScale({ naturals, ...rest }: PairViewerPairFitInput): number | undefined {
  let best: number | undefined
  for (const natural of naturals) {
    const scale = fitScale({ ...rest, natural })
    if (scale !== undefined && (best === undefined || scale < best)) best = scale
  }
  return best
}

/** The box ONE frame gets out of a measured stage, or `undefined` when nothing is left. */
export function framePane(
  stage: PairViewerSize | undefined,
  { columns, gap, reserveHeight }: PairViewerPaneLayout,
): PairViewerSize | undefined {
  if (!isUsable(stage)) return undefined
  const cols = Math.max(1, Math.floor(columns))
  const pane = {
    w: (stage.w - gap * (cols - 1)) / cols,
    h: stage.h - reserveHeight,
  }
  return isUsable(pane) ? pane : undefined
}

/** The scale on screen: the reader's own zoom, else the fit, else 1× until anything is known. */
export function resolveViewerScale(manual: number | undefined, fit: number | undefined): number {
  if (manual !== undefined && Number.isFinite(manual) && manual > 0) return manual
  return fit ?? 1
}

/** `scale` as a whole percentage of the natural size. */
export function effectivePercent(scale: number): number {
  return Number.isFinite(scale) && scale > 0 ? Math.round(scale * 100) : 100
}

/** The zoom readout: `0.875 → "88%"`, always relative to the natural size. */
export function pairViewerZoomLabel(scale: number): string {
  return `${effectivePercent(scale)}%`
}

/**
 * How far zooming out may go: the shared minimum, or lower when the fit itself is
 * lower so a huge capture can still be zoomed back to its fit.
 */
export function pairViewerZoomFloor(fit: number | undefined): number {
  if (fit === undefined || !(fit > 0)) return IMAGE_ZOOM_MIN
  return Math.max(PAIR_VIEWER_MIN_SCALE, Math.min(IMAGE_ZOOM_MIN, fit))
}

function clampScale(scale: number, floor: number): number {
  if (!Number.isFinite(scale)) return 1
  return Math.min(IMAGE_ZOOM_MAX, Math.max(floor, scale))
}

/** One step in from the CURRENT scale (fit or manual), capped at the shared maximum. */
export function pairViewerZoomIn(scale: number, floor = IMAGE_ZOOM_MIN): number {
  return clampScale(scale * IMAGE_ZOOM_STEP, floor)
}

/** One step out from the CURRENT scale, never below `floor`. */
export function pairViewerZoomOut(scale: number, floor = IMAGE_ZOOM_MIN): number {
  return clampScale(scale / IMAGE_ZOOM_STEP, floor)
}

/** A wheel delta becomes one step in (scrolling up) or out. */
export function pairViewerZoomByWheel(
  scale: number,
  deltaY: number,
  floor = IMAGE_ZOOM_MIN,
): number {
  return deltaY < 0 ? pairViewerZoomIn(scale, floor) : pairViewerZoomOut(scale, floor)
}

export function canPairViewerZoomIn(scale: number): boolean {
  return scale < IMAGE_ZOOM_MAX - 1e-9
}

export function canPairViewerZoomOut(scale: number, floor = IMAGE_ZOOM_MIN): boolean {
  return scale > floor + 1e-9
}

/** The frame's on-screen size at `scale`, rounded to whole layout px. */
export function scaledSize(
  natural: PairViewerSize | undefined,
  scale: number,
): PairViewerSize | undefined {
  if (!isUsable(natural) || !(scale > 0)) return undefined
  return { w: Math.round(natural.w * scale), h: Math.round(natural.h * scale) }
}

/** The frame outgrows its pane — dragging pans rather than belonging to the slide handle. */
export function isPannable(scale: number, fit: number | undefined): boolean {
  return scale > (fit ?? 1) + 1e-9
}
