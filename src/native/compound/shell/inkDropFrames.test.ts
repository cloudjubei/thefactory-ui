import { describe, expect, it } from 'vitest'
import type { InkDrop } from '../../../headless/utils/inkBadgeTypes'
import { inkDropFrames } from './inkDropFrames'

function drop(over: Partial<InkDrop> = {}): InkDrop {
  return { channel: 'chat', x: 0, y: 0, size: 3, opacity: 1, dx: 4, dy: -2, delay: 0, ...over }
}

describe('inkDropFrames', () => {
  it.each(['orbit', 'comet', 'still'] as const)('gives a %s droplet no frames of its own', (m) => {
    expect(inkDropFrames(m, 2, drop())).toBeUndefined()
  })

  it('samples one cycle evenly, ending where it began', () => {
    const f = inkDropFrames('float', 1.8, drop(), 4)
    expect(f?.input).toEqual([0, 0.25, 0.5, 0.75, 1])
    expect(f?.translateX[0]).toBe(f?.translateX[4])
  })

  it('floats out to its offset at half way and back', () => {
    const f = inkDropFrames('float', 1.8, drop(), 4)!
    expect(f.translateX[0]).toBeCloseTo(0, 9)
    expect(f.translateX[2]).toBeCloseTo(4, 9)
    expect(f.translateY[2]).toBeCloseTo(-2, 9)
    expect(f.translateX[1]).toBeCloseTo(2, 9)
    expect(f.scale.every((v) => v === 1)).toBe(true)
    expect(f.opacity.every((v) => v === 1)).toBe(true)
  })

  it('splashes out from small and clear, visible a quarter in, gone at the end', () => {
    const f = inkDropFrames('splash', 1.6, drop(), 4)!
    expect(f.opacity[0]).toBeCloseTo(0, 9)
    expect(f.opacity[1]).toBeCloseTo(1, 9)
    expect(f.scale[0]).toBeCloseTo(0.3, 9)
    expect(f.translateX[0]).toBeCloseTo(0, 9)
    expect(f.translateX[3]).toBeGreaterThan(f.translateX[2])
    expect(f.translateX[3]).toBeLessThan(4)
  })

  it('pulses from half size and faint to large and full at half way', () => {
    const f = inkDropFrames('pulse', 1.5, drop(), 4)!
    expect(f.scale[0]).toBeCloseTo(0.5, 9)
    expect(f.opacity[0]).toBeCloseTo(0.4, 9)
    expect(f.scale[2]).toBeCloseTo(1.35, 9)
    expect(f.opacity[2]).toBeCloseTo(1, 9)
    expect(f.translateX.every((v) => v === 0)).toBe(true)
  })

  it('starts a droplet with a negative delay that far into its cycle', () => {
    const late = inkDropFrames('float', 2, drop({ delay: -1 }), 4)!
    const early = inkDropFrames('float', 2, drop(), 4)!
    expect(late.translateX[0]).toBeCloseTo(early.translateX[2], 9)
    expect(late.translateX[2]).toBeCloseTo(early.translateX[4], 9)
  })
})
