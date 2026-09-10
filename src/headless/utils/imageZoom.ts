/**
 * The one zoom model every image surface shares — the file pane's viewer and the
 * review comparison alike — so a before/after pair can be held at the SAME scale
 * and "100%" means the same thing everywhere.
 */

export const IMAGE_ZOOM_MIN = 0.1
export const IMAGE_ZOOM_MAX = 8
export const IMAGE_ZOOM_STEP = 1.25

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, zoom))
}

export function zoomIn(zoom: number): number {
  return clampZoom(zoom * IMAGE_ZOOM_STEP)
}

export function zoomOut(zoom: number): number {
  return clampZoom(zoom / IMAGE_ZOOM_STEP)
}

/** `1 → "100%"`, rounded the way the viewer's readout has always rounded. */
export function zoomLabel(zoom: number): string {
  return `${Math.round(clampZoom(zoom) * 100)}%`
}

/** A wheel delta becomes one step in, or one step out. */
export function zoomByWheel(zoom: number, deltaY: number): number {
  return deltaY < 0 ? zoomIn(zoom) : zoomOut(zoom)
}
