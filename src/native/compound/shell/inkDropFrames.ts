import type { InkDrop, InkMotion } from '../../../headless/utils/inkBadgeTypes'

/**
 * One cycle of a droplet's own motion, sampled for `Animated.interpolate` on a
 * clock that runs 0→1 per cycle: the native twin of the web `tf-ink-*`
 * keyframes. Orbit and comet droplets ride their turning layer instead.
 */
export type InkDropFrames = {
  input: number[]
  translateX: number[]
  translateY: number[]
  scale: number[]
  opacity: number[]
}

type Pose = { travel: number; scale: number; opacity: number }

const DEFAULT_SAMPLES = 24

function easeOut(x: number): number {
  return 1 - (1 - x) ** 2
}

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
}

function there(p: number): number {
  return p <= 0.5 ? easeInOut(p / 0.5) : easeInOut((1 - p) / 0.5)
}

const POSES: Partial<Record<InkMotion, (p: number) => Pose>> = {
  splash: (p) => ({
    travel: easeOut(p),
    scale: 0.3 + 0.7 * easeOut(p),
    opacity: p <= 0.25 ? easeOut(p / 0.25) : 1 - easeOut((p - 0.25) / 0.75),
  }),
  float: (p) => ({ travel: there(p), scale: 1, opacity: 1 }),
  pulse: (p) => ({ travel: 0, scale: 0.5 + 0.85 * there(p), opacity: 0.4 + 0.6 * there(p) }),
}

/** A droplet's frames, or `undefined` when it has no motion of its own. Pure. */
export function inkDropFrames(
  motion: InkMotion,
  duration: number,
  drop: InkDrop,
  samples = DEFAULT_SAMPLES,
): InkDropFrames | undefined {
  const pose = POSES[motion]
  if (!pose) return undefined
  const phase = -drop.delay / duration
  const out: InkDropFrames = { input: [], translateX: [], translateY: [], scale: [], opacity: [] }
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const at = pose((((t + phase) % 1) + 1) % 1)
    out.input.push(t)
    out.translateX.push(drop.dx * at.travel)
    out.translateY.push(drop.dy * at.travel)
    out.scale.push(at.scale)
    out.opacity.push(at.opacity)
  }
  return out
}
