import { describe, expect, it } from 'vitest'
import { DEFAULT_NOTIFICATION_PREFS, type BadgeMotion } from '../types/settings'
import { inkBadgeLayout, inkBadgeLook, inkBadgeShares, inkChannelColors } from './inkBadge'
import { INK_BADGE_COLORS } from './inkBadgeConstants'
import type { InkBadgeState, InkBadgeLook, InkPart } from './inkBadgeTypes'

const TOTAL: InkBadgeLook = { mode: 'total', style: 'splatter', motion: 'orbit' }

const MIXED: InkPart[] = [
  { channel: 'processes', count: 3 },
  { channel: 'chat', count: 1 },
  { channel: 'git', count: 4 },
]

function row(parts: InkPart[], running?: InkBadgeState['running']): InkBadgeState {
  return running ? { parts, running, rollup: true } : { parts, rollup: true }
}

function look(over: Partial<InkBadgeLook>): InkBadgeLook {
  return { ...TOTAL, ...over }
}

describe('inkBadgeShares', () => {
  it('lists the biggest share first and adds up to one', () => {
    const shares = inkBadgeShares(MIXED)
    expect(shares.map((s) => s.channel)).toEqual(['git', 'processes', 'chat'])
    expect(shares.map((s) => s.share)).toEqual([0.5, 0.375, 0.125])
  })

  it('puts what broke first and gives it at least two fifths of the ink', () => {
    const shares = inkBadgeShares([
      { channel: 'git', count: 4 },
      { channel: 'chat', count: 1 },
      { channel: 'processes', count: 2 },
      { channel: 'failed', count: 1 },
    ])
    expect(shares.map((s) => s.channel)).toEqual(['failed', 'git', 'processes', 'chat'])
    expect(shares[0].share).toBeCloseTo(3.2 / 10.2, 6)
    expect(shares[1].share).toBeCloseTo(4 / 10.2, 6)
    expect(shares.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 9)
  })

  it('keeps a failed share that is already big as it is', () => {
    const shares = inkBadgeShares([
      { channel: 'failed', count: 3 },
      { channel: 'chat', count: 1 },
    ])
    expect(shares).toEqual([
      { channel: 'failed', share: 0.75 },
      { channel: 'chat', share: 0.25 },
    ])
  })

  it('breaks a tie in channel order and leaves zero counts out', () => {
    const shares = inkBadgeShares([
      { channel: 'git', count: 2 },
      { channel: 'activity', count: 0 },
      { channel: 'chat', count: 2 },
    ])
    expect(shares).toEqual([
      { channel: 'chat', share: 0.5 },
      { channel: 'git', share: 0.5 },
    ])
  })
})

describe('inkBadgeLayout — one total', () => {
  it('draws nothing at all when nothing waits and nothing runs', () => {
    expect(inkBadgeLayout(row([]), TOTAL)).toEqual({
      core: { kind: 'none' },
      tail: [],
      drops: [],
      motion: 'still',
      duration: 1,
      rotates: false,
    })
  })

  it('ignores parts that count zero', () => {
    expect(inkBadgeLayout(row([{ channel: 'chat', count: 0 }]), TOTAL).core).toEqual({
      kind: 'none',
    })
  })

  it('paints a single channel plainly, with no droplets while nothing runs', () => {
    const layout = inkBadgeLayout(row([{ channel: 'chat', count: 2 }]), TOTAL)
    expect(layout.core).toEqual({
      kind: 'number',
      text: '2',
      fill: { kind: 'solid', channel: 'chat' },
      mixed: false,
    })
    expect(layout.drops).toEqual([])
    expect(layout.tail).toEqual([])
  })

  it('caps the number at 99+', () => {
    const layout = inkBadgeLayout(row([{ channel: 'processes', count: 140 }]), TOTAL)
    expect(layout.core).toMatchObject({ text: '99+' })
  })

  it('splatters mixed channels as blobs sized by their share, biggest at the bottom', () => {
    const layout = inkBadgeLayout(row(MIXED), TOTAL)
    expect(layout.core).toMatchObject({ kind: 'number', text: '8', mixed: true })
    if (layout.core.kind !== 'number') throw new Error('expected a number')
    expect(layout.core.fill).toEqual({
      kind: 'blobs',
      style: 'splatter',
      base: 'git',
      blobs: [
        { channel: 'git', x: 30, y: 38, radius: Math.sqrt(0.5) * 20 * 0.85 },
        { channel: 'processes', x: 74, y: 34, radius: Math.sqrt(0.375) * 20 * 0.85 },
        { channel: 'chat', x: 48, y: 80, radius: Math.sqrt(0.125) * 20 * 0.85 },
      ],
    })
  })

  it('scatters still droplets in the mixed colours around a splatter while nothing runs', () => {
    const layout = inkBadgeLayout(row(MIXED), TOTAL)
    expect(layout.motion).toBe('still')
    expect(layout.rotates).toBe(false)
    expect(layout.drops.map((d) => d.channel)).toEqual([
      'git',
      'processes',
      'chat',
      'git',
      'processes',
    ])
    expect(layout.drops.every((d) => d.delay === 0)).toBe(true)
  })

  it('washes watercolour blobs with the biggest share on top and no still droplets', () => {
    const layout = inkBadgeLayout(row(MIXED), look({ style: 'watercolour' }))
    if (layout.core.kind !== 'number') throw new Error('expected a number')
    expect(layout.core.fill).toEqual({
      kind: 'blobs',
      style: 'watercolour',
      base: 'git',
      blobs: [
        { channel: 'chat', x: 48, y: 80, radius: Math.sqrt(0.125) * 20 * 1.25 },
        { channel: 'processes', x: 74, y: 34, radius: Math.sqrt(0.375) * 20 * 1.25 },
        { channel: 'git', x: 30, y: 38, radius: Math.sqrt(0.5) * 20 * 1.25 },
      ],
    })
    expect(layout.drops).toEqual([])
  })

  it.each(['stripes', 'pie'] as const)('lays %s out as bands in share order', (style) => {
    const layout = inkBadgeLayout(row(MIXED), look({ style }))
    expect(layout.core).toEqual({
      kind: 'number',
      text: '8',
      mixed: true,
      fill: {
        kind: 'bands',
        style,
        stops: [
          { channel: 'git', from: 0, to: 0.5 },
          { channel: 'processes', from: 0.5, to: 0.875 },
          { channel: 'chat', from: 0.875, to: 1 },
        ],
      },
    })
    expect(layout.drops).toEqual([])
  })

  it('draws a colour ring around a plain number', () => {
    const layout = inkBadgeLayout(row(MIXED), look({ style: 'ring' }))
    expect(layout.core).toEqual({
      kind: 'ring',
      text: '8',
      stops: [
        { channel: 'git', from: 0, to: 0.5 },
        { channel: 'processes', from: 0.5, to: 0.875 },
        { channel: 'chat', from: 0.875, to: 1 },
      ],
    })
  })

  it('keeps a single channel plain whatever the style', () => {
    for (const style of ['watercolour', 'ring', 'stripes', 'pie'] as const) {
      expect(inkBadgeLayout(row([{ channel: 'git', count: 4 }]), look({ style })).core).toEqual({
        kind: 'number',
        text: '4',
        fill: { kind: 'solid', channel: 'git' },
        mixed: false,
      })
    }
  })
})

describe('inkBadgeLayout — the other modes', () => {
  it('stacks one segment per channel, in channel order', () => {
    const layout = inkBadgeLayout(
      row([...MIXED, { channel: 'failed', count: 1 }]),
      look({ mode: 'stacked' }),
    )
    expect(layout.core).toEqual({
      kind: 'segments',
      segments: [
        { channel: 'failed', text: '1' },
        { channel: 'processes', text: '3' },
        { channel: 'chat', text: '1' },
        { channel: 'git', text: '4' },
      ],
    })
    expect(layout.tail).toEqual([])
    expect(layout.drops).toEqual([])
  })

  it('shows the top channel’s number and a dot for each of the rest', () => {
    const layout = inkBadgeLayout(row(MIXED), look({ mode: 'top' }))
    expect(layout.core).toEqual({
      kind: 'number',
      text: '3',
      fill: { kind: 'solid', channel: 'processes' },
      mixed: false,
    })
    expect(layout.tail).toEqual(['chat', 'git'])
  })

  it('makes what broke the top number', () => {
    const layout = inkBadgeLayout(
      row([...MIXED, { channel: 'failed', count: 2 }]),
      look({ mode: 'top' }),
    )
    expect(layout.core).toMatchObject({ text: '2', fill: { kind: 'solid', channel: 'failed' } })
    expect(layout.tail).toEqual(['processes', 'chat', 'git'])
  })

  it('shows only dots, with no number, in dots mode', () => {
    const layout = inkBadgeLayout(row(MIXED), look({ mode: 'dots' }))
    expect(layout.core).toEqual({ kind: 'none' })
    expect(layout.tail).toEqual(['processes', 'chat', 'git'])
  })

  it('gives dots a small running ink drop when something runs', () => {
    const layout = inkBadgeLayout(row(MIXED, 'processes'), look({ mode: 'dots' }))
    expect(layout.core).toEqual({ kind: 'blob', channel: 'processes' })
    expect(layout.tail).toEqual(['processes', 'chat', 'git'])
    expect(layout.motion).toBe('orbit')
  })

  it('keeps a tab to one total whatever the row mode', () => {
    const tab: InkBadgeState = {
      parts: [{ channel: 'chat', count: 3 }],
      running: 'chat',
      rollup: false,
    }
    for (const mode of ['stacked', 'top', 'dots'] as const) {
      expect(inkBadgeLayout(tab, look({ mode })).core).toEqual({
        kind: 'number',
        text: '3',
        fill: { kind: 'solid', channel: 'chat' },
        mixed: false,
      })
    }
  })
})

describe('inkBadgeLayout — something running', () => {
  it('orbits droplets in the colour of what runs around the number', () => {
    const layout = inkBadgeLayout(row(MIXED, 'chat'), TOTAL)
    expect(layout.motion).toBe('orbit')
    expect(layout.rotates).toBe(true)
    expect(layout.duration).toBe(2.6)
    expect(layout.drops).toHaveLength(5)
    expect(layout.drops.every((d) => d.channel === 'chat')).toBe(true)
    expect(layout.drops.every((d) => d.delay === 0)).toBe(true)
    expect(layout.spinner).toBeUndefined()
  })

  it('draws a small ink drop of what runs when nothing waits', () => {
    const layout = inkBadgeLayout(row([], 'processes'), TOTAL)
    expect(layout.core).toEqual({ kind: 'blob', channel: 'processes' })
    expect(layout.drops.every((d) => d.channel === 'processes')).toBe(true)
  })

  it('places the droplets around the badge, never smaller than the smallest drop', () => {
    const layout = inkBadgeLayout(row([], 'processes'), TOTAL)
    expect(layout.drops.map((d) => [d.x, d.y, d.size])).toEqual([
      [-8, 14, 3.6],
      [104, 0, 2.8],
      [108, 76, 3.2],
      [-10, 84, 2.6],
      [52, -22, 2.6],
    ])
    expect(layout.drops.map((d) => [d.dx, d.dy])).toEqual([
      [-4.5, -0.7 * 4.5],
      [4.5, -0.9 * 4.5],
      [4.5, 0.7 * 4.5],
      [-4.5, 0.8 * 4.5],
      [0, -4.5],
    ])
  })

  it.each([
    ['splash', 1.6],
    ['float', 1.8],
  ] as const)('staggers %s droplets evenly across one cycle', (motion, seconds) => {
    const layout = inkBadgeLayout(row(MIXED, 'processes'), look({ motion }))
    expect(layout.motion).toBe(motion)
    expect(layout.rotates).toBe(false)
    expect(layout.duration).toBe(seconds)
    expect(layout.drops.map((d) => d.delay)).toEqual(
      [0, 1, 2, 3, 4].map((i) => (i === 0 ? 0 : -(i * seconds) / 5)),
    )
  })

  it('pulses droplets one after another, a fifth of a second apart', () => {
    const layout = inkBadgeLayout(row(MIXED, 'processes'), look({ motion: 'pulse' }))
    expect(layout.duration).toBe(1.5)
    const delays = layout.drops.map((d) => d.delay)
    expect(delays[0]).toBe(0)
    ;[-0.2, -0.4, -0.6, -0.8].forEach((v, i) => expect(delays[i + 1]).toBeCloseTo(v, 9))
  })

  it('races a comet with a fading tail round the badge', () => {
    const layout = inkBadgeLayout(row(MIXED, 'chat'), look({ motion: 'comet' }))
    expect(layout.rotates).toBe(true)
    expect(layout.duration).toBe(1.4)
    ;[1, 0.78, 0.56, 0.34].forEach((v, i) => expect(layout.drops[i].opacity).toBeCloseTo(v, 9))
    expect(layout.drops.map((d) => d.size)).toEqual([3.6, 3, 2.6, 2.6])
    expect(layout.drops[0].channel).toBe('chat')
    expect(layout.drops[0].x).toBeCloseTo(50, 9)
    expect(layout.drops[0].y).toBeCloseTo(-30, 9)
    const tail = layout.drops[1]
    const a = ((-90 - 16) * Math.PI) / 180
    expect(tail.x).toBeCloseTo(50 + 62 * Math.cos(a), 9)
    expect(tail.y).toBeCloseTo(50 + 80 * Math.sin(a), 9)
  })

  it('swaps the moving droplets for a spinner in the colour of what runs', () => {
    const layout = inkBadgeLayout(row(MIXED, 'chat'), look({ motion: 'spinner' }))
    expect(layout.spinner).toBe('chat')
    expect(layout.motion).toBe('still')
    expect(layout.rotates).toBe(false)
    expect(layout.core).toMatchObject({ kind: 'number', text: '8' })
    expect(layout.drops.map((d) => d.channel)).toEqual([
      'git',
      'processes',
      'chat',
      'git',
      'processes',
    ])
  })

  it('leaves a single channel with a spinner and no droplets', () => {
    const layout = inkBadgeLayout(
      row([{ channel: 'git', count: 2 }], 'processes'),
      look({ motion: 'spinner' }),
    )
    expect(layout.spinner).toBe('processes')
    expect(layout.drops).toEqual([])
  })

  it('shows just the spinner when nothing waits', () => {
    const layout = inkBadgeLayout(row([], 'processes'), look({ motion: 'spinner' }))
    expect(layout.core).toEqual({ kind: 'none' })
    expect(layout.spinner).toBe('processes')
  })

  it('never shows a spinner while nothing runs', () => {
    expect(inkBadgeLayout(row(MIXED), look({ motion: 'spinner' })).spinner).toBeUndefined()
  })

  it.each(['orbit', 'splash', 'float', 'comet', 'pulse'] as BadgeMotion[])(
    'running %s colours every droplet with what runs, even on a mixed splatter',
    (motion) => {
      const layout = inkBadgeLayout(row(MIXED, 'processes'), look({ motion }))
      expect(layout.drops.length).toBeGreaterThan(0)
      expect(layout.drops.every((d) => d.channel === 'processes')).toBe(true)
    },
  )
})

describe('inkChannelColors', () => {
  it('reads each channel’s colour from the person’s badge colours and keeps failed red', () => {
    const colors = inkChannelColors({ ...DEFAULT_NOTIFICATION_PREFS.badgeColors, git: 'blue' })
    expect(colors.chat).toEqual(INK_BADGE_COLORS.blue)
    expect(colors.processes).toEqual(INK_BADGE_COLORS.green)
    expect(colors.git).toEqual(INK_BADGE_COLORS.blue)
    expect(colors.failed).toEqual(INK_BADGE_COLORS.red)
  })

  it('keeps failed red even when every channel is painted another colour', () => {
    const all = Object.fromEntries(
      Object.keys(DEFAULT_NOTIFICATION_PREFS.badgeColors).map((k) => [k, 'green']),
    ) as typeof DEFAULT_NOTIFICATION_PREFS.badgeColors
    expect(inkChannelColors(all).failed).toEqual(INK_BADGE_COLORS.red)
    expect(inkChannelColors(all).chat).toEqual(INK_BADGE_COLORS.green)
  })

  it('paints app activity purple by default, its own ink apart from the red of broke', () => {
    const colors = inkChannelColors(DEFAULT_NOTIFICATION_PREFS.badgeColors)
    expect(colors.activity).toEqual(INK_BADGE_COLORS.purple)
    expect(INK_BADGE_COLORS.purple.bg).not.toBe(INK_BADGE_COLORS.red.bg)
    expect(INK_BADGE_COLORS.purple.bg).not.toBe(INK_BADGE_COLORS.blue.bg)
  })
})

describe('inkBadgeLook', () => {
  it('reads the look from the person’s preferences', () => {
    expect(inkBadgeLook({ badgeMode: 'stacked', badgeStyle: 'pie', badgeMotion: 'comet' })).toEqual(
      { mode: 'stacked', style: 'pie', motion: 'comet' },
    )
  })
})
