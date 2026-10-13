import type {
  InkBadgeLayout,
  InkChannel,
  InkColor,
  InkDrop,
  InkFill,
  InkMotion,
  InkStop,
} from '../../../headless/utils/inkBadgeTypes'

type InkColors = Readonly<Record<InkChannel, InkColor>>

/** A size in px at the badge's scale. Pure. */
export function inkPx(value: number, scale: number): string {
  return `${Number((value * scale).toFixed(2))}px`
}

function bandList(stops: readonly InkStop[], colors: InkColors): string {
  return stops
    .map((s) => `${colors[s.channel].bg} ${(s.from * 100).toFixed(1)}% ${(s.to * 100).toFixed(1)}%`)
    .join(', ')
}

/** A conic gradient of the stops, starting at the left — the ring and the pie. Pure. */
export function inkStopsGradient(stops: readonly InkStop[], colors: InkColors): string {
  return `conic-gradient(from -90deg, ${bandList(stops, colors)})`
}

/** The CSS background of a badge's pill. Pure. */
export function inkFillBackground(fill: InkFill, colors: InkColors, scale: number): string {
  switch (fill.kind) {
    case 'solid':
      return colors[fill.channel].bg
    case 'bands':
      return fill.style === 'pie'
        ? inkStopsGradient(fill.stops, colors)
        : `linear-gradient(100deg, ${bandList(fill.stops, colors)})`
    case 'blobs': {
      const layers = fill.blobs
        .map((b) => {
          const c = colors[b.channel].bg
          const at = `circle ${(b.radius * scale).toFixed(1)}px at ${b.x}% ${b.y}%`
          return fill.style === 'splatter'
            ? `radial-gradient(${at}, ${c} 0 92%, transparent 100%)`
            : `radial-gradient(${at}, ${c} 0%, ${c}cc 45%, transparent 100%)`
        })
        .reverse()
      return [...layers, colors[fill.base].bg].join(', ')
    }
  }
}

const DROP_KEYFRAMES: Partial<Record<InkMotion, [string, string]>> = {
  splash: ['tf-ink-splash', 'ease-out'],
  float: ['tf-ink-float', 'ease-in-out'],
  pulse: ['tf-ink-pulse', 'ease-in-out'],
}

/** A droplet's own animation; orbiting droplets ride their layer instead. Pure. */
export function inkDropAnimation(motion: InkMotion, duration: number, drop: InkDrop): string {
  const frames = DROP_KEYFRAMES[motion]
  if (!frames) return 'none'
  return `${frames[0]} ${duration}s ${frames[1]} ${Number(drop.delay.toFixed(2))}s infinite`
}

/** The droplet layer's animation: it turns while the droplets orbit or race. Pure. */
export function inkLayerAnimation(layout: InkBadgeLayout): string {
  return layout.rotates ? `tf-ink-orbit ${layout.duration}s linear infinite` : 'none'
}
