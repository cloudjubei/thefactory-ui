import { describe, expect, it } from 'vitest'

import {
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  clampZoom,
  zoomByWheel,
  zoomIn,
  zoomLabel,
  zoomOut,
} from './imageZoom'

describe('clampZoom', () => {
  it('leaves an in-range zoom alone', () => {
    expect(clampZoom(1.5)).toBe(1.5)
  })

  it('clamps below the minimum', () => {
    expect(clampZoom(0.01)).toBe(IMAGE_ZOOM_MIN)
  })

  it('clamps above the maximum', () => {
    expect(clampZoom(50)).toBe(IMAGE_ZOOM_MAX)
  })

  it('treats a non-finite zoom as 100%', () => {
    expect(clampZoom(Number.NaN)).toBe(1)
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('zoomIn', () => {
  it('multiplies by the step', () => {
    expect(zoomIn(1)).toBe(1.25)
  })

  it('stops at the maximum', () => {
    expect(zoomIn(IMAGE_ZOOM_MAX)).toBe(IMAGE_ZOOM_MAX)
  })
})

describe('zoomOut', () => {
  it('divides by the step', () => {
    expect(zoomOut(1.25)).toBe(1)
  })

  it('stops at the minimum', () => {
    expect(zoomOut(IMAGE_ZOOM_MIN)).toBe(IMAGE_ZOOM_MIN)
  })
})

describe('zoomLabel', () => {
  it('renders a whole percentage', () => {
    expect(zoomLabel(1)).toBe('100%')
  })

  it('rounds a stepped zoom the way the readout always did', () => {
    expect(zoomLabel(1.25 * 1.25)).toBe('156%')
  })

  it('clamps before labelling', () => {
    expect(zoomLabel(100)).toBe('800%')
  })
})

describe('zoomByWheel', () => {
  it('scrolling up zooms in', () => {
    expect(zoomByWheel(1, -1)).toBe(1.25)
  })

  it('scrolling down zooms out', () => {
    expect(zoomByWheel(1.25, 1)).toBe(1)
  })
})
