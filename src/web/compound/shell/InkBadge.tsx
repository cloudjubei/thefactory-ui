import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { inkBadgeLayout, inkChannelColors } from '../../../headless/utils/inkBadge'
import {
  INK_BADGE_METRICS as M,
  INK_MIXED_TEXT_COLOR,
  INK_MIXED_TEXT_SHADOW,
} from '../../../headless/utils/inkBadgeConstants'
import type { InkBadgeLook, InkBadgeState } from '../../../headless/utils/inkBadgeTypes'
import Spinner from '../../primitives/Spinner'
import {
  inkDropAnimation,
  inkFillBackground,
  inkLayerAnimation,
  inkPx,
  inkStopsGradient,
} from './inkBadgeStyle'

export type InkBadgeProps = {
  badge: InkBadgeState
  /** The person's badge look (`inkBadgeLook(settings.userPreferences)`). */
  look: InkBadgeLook
  /** The person's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  /** 1 = real sidebar size. */
  scale?: number
  /** What the badge holds, in words — its accessible name. */
  label?: string
  className?: string
}

/**
 * The ink badge — one number of everything waiting, its ink mixed from the
 * channels it is made of, droplets moving while something runs. Draws the
 * headless `inkBadgeLayout` verbatim; the native `InkBadge` draws the same
 * layout. With reduced motion on, moving droplets fade instead.
 */
export default function InkBadge({
  badge,
  look,
  badgeColors,
  scale = 1,
  label,
  className = '',
}: InkBadgeProps) {
  const layout = useMemo(() => inkBadgeLayout(badge, look), [badge, look])
  const colors = useMemo(() => inkChannelColors(badgeColors), [badgeColors])
  const px = (v: number) => inkPx(v, scale)
  const { core } = layout
  const moving = layout.motion !== 'still'
  const number = (text: string, style: CSSProperties) => (
    <span
      className="inline-flex items-center justify-center box-border rounded-full font-extrabold leading-none"
      style={{
        minWidth: px(M.minWidth),
        height: px(M.height),
        padding: `0 ${px(M.padX)}`,
        fontSize: px(M.fontSize),
        ...style,
      }}
    >
      {text}
    </span>
  )
  return (
    <span
      role="img"
      aria-label={label}
      className={`relative inline-flex items-center shrink-0 ${className}`}
      style={{ gap: px(M.gap), margin: `${px(M.marginY)} ${px(M.marginX)}` }}
    >
      {layout.spinner && <Spinner size={M.spinner * scale} color={colors[layout.spinner].bg} />}
      {core.kind !== 'none' && (
        <span className="relative inline-flex">
          {core.kind === 'number' &&
            number(core.text, {
              background: inkFillBackground(core.fill, colors, scale),
              color:
                core.fill.kind === 'solid' ? colors[core.fill.channel].fg : INK_MIXED_TEXT_COLOR,
              textShadow: core.mixed ? `0 ${px(0.6)} ${px(1.4)} ${INK_MIXED_TEXT_SHADOW}` : 'none',
            })}
          {core.kind === 'ring' && (
            <span
              className="inline-flex rounded-full"
              style={{ padding: px(M.ringPad), background: inkStopsGradient(core.stops, colors) }}
            >
              <span
                className="inline-flex items-center justify-center box-border rounded-full font-extrabold leading-none bg-(--surface-raised) text-(--text-primary)"
                style={{
                  minWidth: px(M.ringInner),
                  height: px(M.ringInner),
                  padding: `0 ${px(M.ringInnerPadX)}`,
                  fontSize: px(M.fontSize),
                }}
              >
                {core.text}
              </span>
            </span>
          )}
          {core.kind === 'segments' && (
            <span
              className="inline-flex overflow-hidden rounded-full font-extrabold"
              style={{ height: px(M.height), lineHeight: px(M.height), fontSize: px(M.fontSize) }}
            >
              {core.segments.map((s) => (
                <span
                  key={s.channel}
                  style={{
                    padding: `0 ${px(M.padX)}`,
                    background: colors[s.channel].bg,
                    color: colors[s.channel].fg,
                  }}
                >
                  {s.text}
                </span>
              ))}
            </span>
          )}
          {core.kind === 'blob' && (
            <span
              className="inline-block"
              style={{
                width: px(M.blob),
                height: px(M.blob),
                borderRadius: '46% 54% 52% 48%',
                background: colors[core.channel].bg,
              }}
            />
          )}
          {layout.drops.length > 0 && (
            <span
              aria-hidden
              className="tf-ink-badge__layer"
              data-ink-moving={moving ? 'yes' : 'no'}
              style={{ animation: inkLayerAnimation(layout) }}
            >
              {layout.drops.map((d, i) => (
                <span
                  key={i}
                  className="tf-ink-badge__drop"
                  data-ink-moving={moving ? 'yes' : 'no'}
                  style={
                    {
                      left: `${d.x}%`,
                      top: `${d.y}%`,
                      width: px(d.size),
                      height: px(d.size),
                      margin: `${px(-d.size / 2)} 0 0 ${px(-d.size / 2)}`,
                      background: colors[d.channel].bg,
                      opacity: d.opacity,
                      '--tf-ink-dx': px(d.dx),
                      '--tf-ink-dy': px(d.dy),
                      animation: inkDropAnimation(layout.motion, layout.duration, d),
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          )}
        </span>
      )}
      {layout.tail.length > 0 && (
        <span className="inline-flex" style={{ gap: px(M.tailGap) }}>
          {layout.tail.map((c) => (
            <span
              key={c}
              className="inline-block rounded-full"
              style={{ width: px(M.tailDot), height: px(M.tailDot), background: colors[c].bg }}
            />
          ))}
        </span>
      )}
    </span>
  )
}
