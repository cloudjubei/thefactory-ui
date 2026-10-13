import type { BadgeColor, BadgeColorCategory, UserPreferences } from '../types/settings'
import { formatBadgeCount } from './badgeAggregation'
import {
  INK_BADGE_COLORS,
  INK_BADGE_METRICS,
  INK_BLOB_SPOTS,
  INK_CHANNEL_ORDER,
  INK_COMET_DROPS,
  INK_COMET_RADIUS_X,
  INK_COMET_RADIUS_Y,
  INK_COMET_STEP_DEGREES,
  INK_DROP_SPOTS,
  INK_DROP_TRAVEL,
  INK_FAILED_COLOR,
  INK_FAILED_MIN_SHARE,
  INK_MOTION_SECONDS,
  INK_PULSE_STAGGER,
  INK_SPLATTER_RADIUS,
  INK_WATERCOLOUR_RADIUS,
} from './inkBadgeConstants'
import type {
  InkBadgeState,
  InkBadgeLayout,
  InkBadgeLook,
  InkChannel,
  InkColor,
  InkCore,
  InkDrop,
  InkFill,
  InkMotion,
  InkPart,
  InkShare,
  InkStop,
} from './inkBadgeTypes'

/** The person's badge look, from their preferences. Pure. */
export function inkBadgeLook(
  prefs: Pick<UserPreferences, 'badgeMode' | 'badgeStyle' | 'badgeMotion'>,
): InkBadgeLook {
  return { mode: prefs.badgeMode, style: prefs.badgeStyle, motion: prefs.badgeMotion }
}

/** Every channel's ink from the person's badge colours; `failed` is always red. Pure. */
export function inkChannelColors(
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>,
): Record<InkChannel, InkColor> {
  const out = { failed: INK_FAILED_COLOR } as Record<InkChannel, InkColor>
  for (const [category, color] of Object.entries(badgeColors) as [
    BadgeColorCategory,
    BadgeColor,
  ][]) {
    out[category] = INK_BADGE_COLORS[color]
  }
  return out
}

/** The parts that count, in channel order. Pure. */
export function inkBadgeParts(parts: readonly InkPart[]): InkPart[] {
  return parts
    .filter((p) => p.count > 0)
    .sort((a, b) => INK_CHANNEL_ORDER.indexOf(a.channel) - INK_CHANNEL_ORDER.indexOf(b.channel))
}

/**
 * Each channel's share of a mixed badge: what broke first and never under two
 * fifths, then the biggest count first (ties in channel order). Pure.
 */
export function inkBadgeShares(parts: readonly InkPart[]): InkShare[] {
  const counted = inkBadgeParts(parts)
  const total = counted.reduce((sum, p) => sum + p.count, 0)
  const weighted = counted.map((p, order) => ({
    channel: p.channel,
    order,
    weight: p.channel === 'failed' ? Math.max(p.count, total * INK_FAILED_MIN_SHARE) : p.count,
  }))
  const failed = weighted.filter((w) => w.channel === 'failed')
  const rest = weighted
    .filter((w) => w.channel !== 'failed')
    .sort((a, b) => b.weight - a.weight || a.order - b.order)
  const ordered = [...failed, ...rest]
  const sum = ordered.reduce((s, w) => s + w.weight, 0)
  return ordered.map((w) => ({ channel: w.channel, share: w.weight / sum }))
}

function inkStops(shares: readonly InkShare[]): InkStop[] {
  let from = 0
  return shares.map((s) => {
    const stop = { channel: s.channel, from, to: from + s.share }
    from = stop.to
    return stop
  })
}

function inkBlobFill(shares: readonly InkShare[], style: 'splatter' | 'watercolour'): InkFill {
  const factor = style === 'splatter' ? INK_SPLATTER_RADIUS : INK_WATERCOLOUR_RADIUS
  const blobs = shares.map((s, i) => {
    const [x, y] = INK_BLOB_SPOTS[i % INK_BLOB_SPOTS.length]
    return {
      channel: s.channel,
      x,
      y,
      radius: Math.sqrt(s.share) * INK_BADGE_METRICS.height * factor,
    }
  })
  return {
    kind: 'blobs',
    style,
    base: shares[0].channel,
    blobs: style === 'splatter' ? blobs : blobs.reverse(),
  }
}

function inkTotalCore(parts: readonly InkPart[], look: InkBadgeLook): InkCore {
  const text = formatBadgeCount(parts.reduce((sum, p) => sum + p.count, 0))
  if (parts.length === 1) {
    return {
      kind: 'number',
      text,
      fill: { kind: 'solid', channel: parts[0].channel },
      mixed: false,
    }
  }
  const shares = inkBadgeShares(parts)
  switch (look.style) {
    case 'ring':
      return { kind: 'ring', text, stops: inkStops(shares) }
    case 'stripes':
    case 'pie':
      return {
        kind: 'number',
        text,
        fill: { kind: 'bands', style: look.style, stops: inkStops(shares) },
        mixed: true,
      }
    case 'splatter':
    case 'watercolour':
      return { kind: 'number', text, fill: inkBlobFill(shares, look.style), mixed: true }
  }
}

function negated(v: number): number {
  return v === 0 ? 0 : -v
}

function inkDrops(motion: InkMotion, colour: (i: number) => InkChannel): InkDrop[] {
  const min = INK_BADGE_METRICS.minDrop
  const seconds = INK_MOTION_SECONDS[motion]
  if (motion === 'comet') {
    return Array.from({ length: INK_COMET_DROPS }, (_, i) => {
      const angle = ((-90 - i * INK_COMET_STEP_DEGREES) * Math.PI) / 180
      return {
        channel: colour(0),
        x: 50 + INK_COMET_RADIUS_X * Math.cos(angle),
        y: 50 + INK_COMET_RADIUS_Y * Math.sin(angle),
        size: Math.max(3.6 - i * 0.6, min),
        opacity: 1 - i * 0.22,
        dx: 0,
        dy: 0,
        delay: 0,
      }
    })
  }
  return INK_DROP_SPOTS.map(([x, y, size, dx, dy], i) => {
    let delay = 0
    if (motion === 'splash' || motion === 'float')
      delay = negated((i * seconds) / INK_DROP_SPOTS.length)
    if (motion === 'pulse') delay = negated(i * INK_PULSE_STAGGER)
    return {
      channel: colour(i),
      x,
      y,
      size: Math.max(size, min),
      opacity: 1,
      dx: dx * INK_DROP_TRAVEL,
      dy: dy * INK_DROP_TRAVEL,
      delay,
    }
  })
}

/**
 * Lay a badge out in the person's look — the one reference both renderers draw.
 * A row adds its parts up by the person's mode; a tab always shows one total.
 * While something runs, the droplets move in the colour of what runs (or a
 * spinner stands beside the badge); while nothing runs, only a mixed ink
 * splatter has droplets, still, in its own colours. Pure.
 */
export function inkBadgeLayout(badge: InkBadgeState, look: InkBadgeLook): InkBadgeLayout {
  const parts = inkBadgeParts(badge.parts)
  const mode = badge.rollup ? look.mode : 'total'
  const running = badge.running
  const droplets = look.motion !== 'spinner'
  let core: InkCore = { kind: 'none' }
  let tail: InkChannel[] = []
  let dropBase: InkChannel[] = []
  if (parts.length > 0) {
    switch (mode) {
      case 'total': {
        core = inkTotalCore(parts, look)
        dropBase =
          parts.length === 1 ? [parts[0].channel] : inkBadgeShares(parts).map((s) => s.channel)
        break
      }
      case 'stacked':
        core = {
          kind: 'segments',
          segments: parts.map((p) => ({ channel: p.channel, text: formatBadgeCount(p.count) })),
        }
        dropBase = parts.map((p) => p.channel)
        break
      case 'top':
        core = {
          kind: 'number',
          text: formatBadgeCount(parts[0].count),
          fill: { kind: 'solid', channel: parts[0].channel },
          mixed: false,
        }
        tail = parts.slice(1).map((p) => p.channel)
        dropBase = [parts[0].channel]
        break
      case 'dots':
        tail = parts.map((p) => p.channel)
        break
    }
  }
  if (running && droplets && core.kind === 'none') {
    core = { kind: 'blob', channel: running }
    dropBase = [running]
  }
  const moving = !!running && droplets
  const still =
    !moving && mode === 'total' && look.style === 'splatter' && core.kind === 'number' && core.mixed
  const motion: InkMotion = moving && look.motion !== 'spinner' ? look.motion : 'still'
  const drops =
    core.kind !== 'none' && (moving || still)
      ? inkDrops(motion, (i) => (moving && running ? running : dropBase[i % dropBase.length]))
      : []
  const layout: InkBadgeLayout = {
    core,
    tail,
    drops,
    motion,
    duration: INK_MOTION_SECONDS[motion],
    rotates: motion === 'orbit' || motion === 'comet',
  }
  if (running && !droplets) layout.spinner = running
  return layout
}
