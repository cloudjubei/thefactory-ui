import { describe, expect, it } from 'vitest'
import { inkChannelColors } from '../../../headless/utils/inkBadge'
import { DEFAULT_NOTIFICATION_PREFS } from '../../../headless/types/settings'
import type { InkBadgeLayout, InkDrop } from '../../../headless/utils/inkBadgeTypes'
import {
  inkDropAnimation,
  inkFillBackground,
  inkLayerAnimation,
  inkPx,
  inkStopsGradient,
} from './inkBadgeStyle'

const COLORS = inkChannelColors(DEFAULT_NOTIFICATION_PREFS.badgeColors)
const GREEN = COLORS.processes.bg
const BLUE = COLORS.chat.bg
const ORANGE = COLORS.git.bg

const STOPS = [
  { channel: 'git' as const, from: 0, to: 0.5 },
  { channel: 'processes' as const, from: 0.5, to: 0.875 },
  { channel: 'chat' as const, from: 0.875, to: 1 },
]

function drop(over: Partial<InkDrop> = {}): InkDrop {
  return { channel: 'chat', x: 0, y: 0, size: 3, opacity: 1, dx: 0, dy: 0, delay: 0, ...over }
}

function layout(over: Partial<InkBadgeLayout>): InkBadgeLayout {
  return {
    core: { kind: 'none' },
    tail: [],
    drops: [],
    motion: 'still',
    duration: 1,
    rotates: false,
    ...over,
  }
}

describe('inkPx', () => {
  it('scales a size and rounds it to hundredths', () => {
    expect(inkPx(20, 1)).toBe('20px')
    expect(inkPx(2.6, 1.4)).toBe('3.64px')
    expect(inkPx(10, 0.7)).toBe('7px')
  })
})

describe('inkFillBackground', () => {
  it('paints a solid fill in the channel colour', () => {
    expect(inkFillBackground({ kind: 'solid', channel: 'git' }, COLORS, 1)).toBe(ORANGE)
  })

  it('layers splatter blobs top first, hard-edged, over the base colour', () => {
    expect(
      inkFillBackground(
        {
          kind: 'blobs',
          style: 'splatter',
          base: 'git',
          blobs: [
            { channel: 'git', x: 30, y: 38, radius: 12 },
            { channel: 'chat', x: 74, y: 34, radius: 6.04 },
          ],
        },
        COLORS,
        2,
      ),
    ).toBe(
      `radial-gradient(circle 12.1px at 74% 34%, ${BLUE} 0 92%, transparent 100%), ` +
        `radial-gradient(circle 24.0px at 30% 38%, ${ORANGE} 0 92%, transparent 100%), ${ORANGE}`,
    )
  })

  it('washes watercolour blobs softly', () => {
    expect(
      inkFillBackground(
        {
          kind: 'blobs',
          style: 'watercolour',
          base: 'processes',
          blobs: [{ channel: 'processes', x: 30, y: 38, radius: 10 }],
        },
        COLORS,
        1,
      ),
    ).toBe(
      `radial-gradient(circle 10.0px at 30% 38%, ${GREEN} 0%, ${GREEN}cc 45%, transparent 100%), ${GREEN}`,
    )
  })

  it('draws stripes as a slanted band per channel', () => {
    expect(inkFillBackground({ kind: 'bands', style: 'stripes', stops: STOPS }, COLORS, 1)).toBe(
      `linear-gradient(100deg, ${ORANGE} 0.0% 50.0%, ${GREEN} 50.0% 87.5%, ${BLUE} 87.5% 100.0%)`,
    )
  })

  it('draws a pie as a conic band per channel', () => {
    expect(inkFillBackground({ kind: 'bands', style: 'pie', stops: STOPS }, COLORS, 1)).toBe(
      inkStopsGradient(STOPS, COLORS),
    )
  })
})

describe('inkStopsGradient', () => {
  it('turns stops into a conic gradient starting at the left', () => {
    expect(inkStopsGradient(STOPS, COLORS)).toBe(
      `conic-gradient(from -90deg, ${ORANGE} 0.0% 50.0%, ${GREEN} 50.0% 87.5%, ${BLUE} 87.5% 100.0%)`,
    )
  })
})

describe('inkDropAnimation', () => {
  it('splashes with ease-out, floats and pulses with ease-in-out, each at its own delay', () => {
    expect(inkDropAnimation('splash', 1.6, drop({ delay: -0.32 }))).toBe(
      'tf-ink-splash 1.6s ease-out -0.32s infinite',
    )
    expect(inkDropAnimation('float', 1.8, drop({ delay: 0 }))).toBe(
      'tf-ink-float 1.8s ease-in-out 0s infinite',
    )
    expect(inkDropAnimation('pulse', 1.5, drop({ delay: -0.6000000000000001 }))).toBe(
      'tf-ink-pulse 1.5s ease-in-out -0.6s infinite',
    )
  })

  it.each(['orbit', 'comet', 'still'] as const)('leaves a droplet still on its own in %s', (m) => {
    expect(inkDropAnimation(m, 2, drop())).toBe('none')
  })
})

describe('inkLayerAnimation', () => {
  it('turns the droplet layer while it orbits', () => {
    expect(inkLayerAnimation(layout({ motion: 'orbit', duration: 2.6, rotates: true }))).toBe(
      'tf-ink-orbit 2.6s linear infinite',
    )
  })

  it('keeps the layer still otherwise', () => {
    expect(inkLayerAnimation(layout({ motion: 'float', duration: 1.8 }))).toBe('none')
  })
})
