import { describe, expect, it } from 'vitest'

import { IMAGE_ZOOM_MAX, IMAGE_ZOOM_MIN, IMAGE_ZOOM_STEP } from './imageZoom'
import {
  canPairViewerZoomIn,
  canPairViewerZoomOut,
  effectivePercent,
  fitScale,
  framePane,
  isPannable,
  pairFitScale,
  pairViewerZoomByWheel,
  pairViewerZoomFloor,
  pairViewerZoomIn,
  pairViewerZoomLabel,
  pairViewerZoomOut,
  resolveViewerScale,
  scaledSize,
} from './pairViewerFit'
import { PAIR_VIEWER_MAX_FIT_UPSCALE, PAIR_VIEWER_MIN_SCALE } from './pairViewerFitConstants'

const PHONE_PORTRAIT = { w: 1179, h: 2556 }
const WEB_LANDSCAPE = { w: 1440, h: 900 }
const WIDE_PANE = { w: 1600, h: 800 }
const TALL_PANE = { w: 600, h: 1400 }

describe('fitScale', () => {
  it('fits a portrait phone screenshot in a wide pane by its HEIGHT', () => {
    const scale = fitScale({ natural: PHONE_PORTRAIT, pane: WIDE_PANE, pixelRatio: 2 })
    expect(scale).toBeCloseTo(800 / 2556)
    expect(PHONE_PORTRAIT.w * scale!).toBeLessThanOrEqual(WIDE_PANE.w)
    expect(PHONE_PORTRAIT.h * scale!).toBeCloseTo(WIDE_PANE.h)
  })

  it('fits a landscape web capture in a tall pane by its WIDTH', () => {
    const scale = fitScale({ natural: WEB_LANDSCAPE, pane: TALL_PANE, pixelRatio: 1 })
    expect(scale).toBeCloseTo(600 / 1440)
    expect(WEB_LANDSCAPE.h * scale!).toBeLessThanOrEqual(TALL_PANE.h)
  })

  it('renders the reported capture far wider than the old fixed 240px at open', () => {
    const scale = fitScale({
      natural: { w: 1145, h: 760 },
      pane: { w: 1500, h: 900 },
      pixelRatio: 2,
    })
    expect(1145 * scale!).toBeGreaterThan(1000)
  })

  it('upscales a tiny image only up to the pixel ratio', () => {
    expect(fitScale({ natural: { w: 100, h: 50 }, pane: WIDE_PANE, pixelRatio: 1.5 })).toBe(1.5)
  })

  it('never upscales past 1x on a 1x screen, nor with a missing or bogus pixel ratio', () => {
    const tiny = { w: 64, h: 64 }
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 1 })).toBe(1)
    expect(fitScale({ natural: tiny, pane: WIDE_PANE })).toBe(1)
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 0 })).toBe(1)
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: Number.NaN })).toBe(1)
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 0.5 })).toBe(1)
  })

  it('stops upscaling at the cap on a very dense screen', () => {
    const tiny = { w: 10, h: 10 }
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 4 })).toBe(
      PAIR_VIEWER_MAX_FIT_UPSCALE,
    )
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 4, cap: 3 })).toBe(3)
    expect(fitScale({ natural: tiny, pane: WIDE_PANE, pixelRatio: 4, cap: -1 })).toBe(
      PAIR_VIEWER_MAX_FIT_UPSCALE,
    )
  })

  it('shrinks a huge full-page capture below the shared zoom minimum, down to the floor', () => {
    const fullPage = { w: 1440, h: 12000 }
    expect(fitScale({ natural: fullPage, pane: WIDE_PANE, pixelRatio: 2 })).toBeCloseTo(800 / 12000)
    const absurd = { w: 100, h: 1_000_000 }
    expect(fitScale({ natural: absurd, pane: WIDE_PANE })).toBe(PAIR_VIEWER_MIN_SCALE)
  })

  it('is undefined while the image has not loaded', () => {
    expect(fitScale({ natural: undefined, pane: WIDE_PANE, pixelRatio: 2 })).toBeUndefined()
    expect(fitScale({ natural: { w: 0, h: 0 }, pane: WIDE_PANE })).toBeUndefined()
  })

  it('is undefined while the pane is unmeasured or collapsed to nothing', () => {
    expect(fitScale({ natural: PHONE_PORTRAIT, pane: undefined })).toBeUndefined()
    expect(fitScale({ natural: PHONE_PORTRAIT, pane: { w: 0, h: 0 } })).toBeUndefined()
    expect(fitScale({ natural: PHONE_PORTRAIT, pane: { w: 800, h: -4 } })).toBeUndefined()
    expect(fitScale({ natural: PHONE_PORTRAIT, pane: { w: Infinity, h: 800 } })).toBeUndefined()
  })
})

describe('pairFitScale', () => {
  it('takes the smaller fit so mismatched before/after captures both fit at one scale', () => {
    const scale = pairFitScale({ naturals: [PHONE_PORTRAIT, WEB_LANDSCAPE], pane: TALL_PANE })
    expect(scale).toBeCloseTo(Math.min(1400 / 2556, 600 / 1440))
  })

  it('fits on whichever side has decoded while the other is still loading', () => {
    expect(pairFitScale({ naturals: [undefined, WEB_LANDSCAPE], pane: TALL_PANE })).toBeCloseTo(
      600 / 1440,
    )
  })

  it('re-fits down when the later frame to decode is the larger one, whichever side it is', () => {
    const pane = { w: 1600, h: 800 }
    const early = pairFitScale({ naturals: [WEB_LANDSCAPE, undefined], pane })
    const both = pairFitScale({ naturals: [WEB_LANDSCAPE, PHONE_PORTRAIT], pane })
    const swapped = pairFitScale({ naturals: [PHONE_PORTRAIT, WEB_LANDSCAPE], pane })
    expect(both).toBeCloseTo(800 / 2556)
    expect(both).toBeLessThan(early!)
    expect(swapped).toBe(both)
    expect(scaledSize(PHONE_PORTRAIT, both!)).toEqual({ w: 369, h: 800 })
  })

  it('is undefined when no frame has decoded, or there are none', () => {
    expect(pairFitScale({ naturals: [undefined, undefined], pane: WIDE_PANE })).toBeUndefined()
    expect(pairFitScale({ naturals: [], pane: WIDE_PANE })).toBeUndefined()
  })
})

describe('framePane', () => {
  it('splits a stage into two Mirror columns around the gap, keeping caption room', () => {
    expect(framePane({ w: 1224, h: 800 }, { columns: 2, gap: 24, reserveHeight: 40 })).toEqual({
      w: 600,
      h: 760,
    })
  })

  it('gives a single frame the whole width', () => {
    expect(framePane({ w: 900, h: 700 }, { columns: 1, gap: 24, reserveHeight: 72 })).toEqual({
      w: 900,
      h: 628,
    })
  })

  it('treats a bogus column count as one column', () => {
    expect(framePane({ w: 500, h: 500 }, { columns: 0, gap: 24, reserveHeight: 0 })).toEqual({
      w: 500,
      h: 500,
    })
  })

  it('is undefined for an unmeasured stage, or one too small to hold anything', () => {
    const layout = { columns: 2, gap: 24, reserveHeight: 40 }
    expect(framePane(undefined, layout)).toBeUndefined()
    expect(framePane({ w: 0, h: 0 }, layout)).toBeUndefined()
    expect(framePane({ w: 20, h: 600 }, layout)).toBeUndefined()
    expect(framePane({ w: 900, h: 30 }, layout)).toBeUndefined()
  })
})

describe('resolveViewerScale', () => {
  it("prefers the reader's own zoom over the fit", () => {
    expect(resolveViewerScale(2.5, 0.4)).toBe(2.5)
  })

  it('falls back to the fit, then to 1x before anything is known', () => {
    expect(resolveViewerScale(undefined, 0.4)).toBe(0.4)
    expect(resolveViewerScale(undefined, undefined)).toBe(1)
    expect(resolveViewerScale(Number.NaN, 0.4)).toBe(0.4)
    expect(resolveViewerScale(0, undefined)).toBe(1)
  })
})

describe('effective percent', () => {
  it('reads the scale relative to the natural size', () => {
    expect(effectivePercent(1)).toBe(100)
    expect(effectivePercent(0.3129)).toBe(31)
    expect(effectivePercent(4.77)).toBe(477)
    expect(pairViewerZoomLabel(0.875)).toBe('88%')
  })

  it('shows 100% rather than a broken figure for a non-scale', () => {
    expect(effectivePercent(Number.NaN)).toBe(100)
    expect(effectivePercent(0)).toBe(100)
  })
})

describe('zoom steps', () => {
  it('step in and out from the current (fit) scale, not from 100%', () => {
    const fit = 0.3129
    expect(pairViewerZoomIn(fit)).toBeCloseTo(fit * IMAGE_ZOOM_STEP)
    expect(pairViewerZoomOut(fit)).toBeCloseTo(fit / IMAGE_ZOOM_STEP)
  })

  it('cap zooming in at the shared maximum', () => {
    expect(pairViewerZoomIn(IMAGE_ZOOM_MAX)).toBe(IMAGE_ZOOM_MAX)
    expect(canPairViewerZoomIn(IMAGE_ZOOM_MAX)).toBe(false)
    expect(canPairViewerZoomIn(1)).toBe(true)
  })

  it('stop zooming out at the floor', () => {
    expect(pairViewerZoomOut(IMAGE_ZOOM_MIN)).toBe(IMAGE_ZOOM_MIN)
    expect(canPairViewerZoomOut(IMAGE_ZOOM_MIN)).toBe(false)
    expect(pairViewerZoomOut(0.05, 0.04)).toBe(0.04)
    expect(canPairViewerZoomOut(0.05, 0.04)).toBe(true)
  })

  it('turn a wheel delta into one step in or out', () => {
    expect(pairViewerZoomByWheel(1, -3)).toBeCloseTo(IMAGE_ZOOM_STEP)
    expect(pairViewerZoomByWheel(1, 3)).toBeCloseTo(1 / IMAGE_ZOOM_STEP)
  })

  it('recover from a non-finite scale', () => {
    expect(pairViewerZoomIn(Number.NaN)).toBe(1)
  })
})

describe('pairViewerZoomFloor', () => {
  it('drops below the shared minimum when a huge capture fits lower', () => {
    expect(pairViewerZoomFloor(0.05)).toBe(0.05)
    expect(pairViewerZoomFloor(0.001)).toBe(PAIR_VIEWER_MIN_SCALE)
  })

  it('stays at the shared minimum for an ordinary fit or none', () => {
    expect(pairViewerZoomFloor(0.6)).toBe(IMAGE_ZOOM_MIN)
    expect(pairViewerZoomFloor(undefined)).toBe(IMAGE_ZOOM_MIN)
  })
})

describe('scaledSize', () => {
  it('rounds the on-screen size of portrait and landscape captures', () => {
    expect(scaledSize(PHONE_PORTRAIT, 0.5)).toEqual({ w: 590, h: 1278 })
    expect(scaledSize(WEB_LANDSCAPE, 1 / 3)).toEqual({ w: 480, h: 300 })
  })

  it('is undefined for an unloaded image or a non-scale', () => {
    expect(scaledSize(undefined, 1)).toBeUndefined()
    expect(scaledSize(WEB_LANDSCAPE, 0)).toBeUndefined()
  })
})

describe('isPannable', () => {
  it('pans only once zoomed past the fit', () => {
    expect(isPannable(0.4, 0.4)).toBe(false)
    expect(isPannable(0.5, 0.4)).toBe(true)
  })

  it('compares against 1x while the fit is unknown', () => {
    expect(isPannable(1, undefined)).toBe(false)
    expect(isPannable(1.25, undefined)).toBe(true)
  })
})
