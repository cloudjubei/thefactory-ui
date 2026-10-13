import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { inkBadgeLayout, inkChannelColors } from '../../../headless/utils/inkBadge'
import {
  INK_BADGE_METRICS as M,
  INK_FADE_SECONDS,
  INK_MIXED_TEXT_COLOR,
  INK_MIXED_TEXT_SHADOW,
} from '../../../headless/utils/inkBadgeConstants'
import type {
  InkBadgeLayout,
  InkBadgeLook,
  InkBadgeState,
  InkChannel,
  InkColor,
  InkDrop,
  InkFill,
  InkStop,
} from '../../../headless/utils/inkBadgeTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Spinner from '../../primitives/Spinner'
import { inkDropFrames } from './inkDropFrames'

type InkColors = Readonly<Record<InkChannel, InkColor>>

export interface InkBadgeProps {
  badge: InkBadgeState
  /** The person's badge look (`inkBadgeLook(settings.userPreferences)`). */
  look: InkBadgeLook
  /** The person's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  /** 1 = real drawer size. */
  scale?: number
  /** What the badge holds, in words — its accessible name. */
  label?: string
}

const BLOB_CORNERS = [0.46, 0.54, 0.52, 0.48] as const

/**
 * The native ink badge — the peer of the web `InkBadge`, drawing the same
 * headless `inkBadgeLayout`: SVG for mixed ink, Animated droplets for what
 * runs. With reduced motion on, moving droplets fade instead.
 */
export default function InkBadge({ badge, look, badgeColors, scale = 1, label }: InkBadgeProps) {
  const layout = useMemo(() => inkBadgeLayout(badge, look), [badge, look])
  const colors = useMemo(() => inkChannelColors(badgeColors), [badgeColors])
  const reduced = useReducedMotion()
  const moving = layout.motion !== 'still'
  const clock = useLoop(moving && !reduced, layout.duration)
  const fade = useLoop(moving && reduced, INK_FADE_SECONDS)
  const s = (v: number) => v * scale
  const { core } = layout
  return (
    <View
      accessible={!!label}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(M.gap),
        marginVertical: s(M.marginY),
        marginHorizontal: s(M.marginX),
      }}
    >
      {layout.spinner ? <Spinner size={s(M.spinner)} color={colors[layout.spinner].bg} /> : null}
      {core.kind !== 'none' ? (
        <View style={{ position: 'relative' }}>
          {core.kind === 'number' ? (
            <Pill
              fill={core.fill}
              colors={colors}
              scale={scale}
              text={core.text}
              mixed={core.mixed}
            />
          ) : null}
          {core.kind === 'ring' ? (
            <Ring stops={core.stops} colors={colors} scale={scale} text={core.text} />
          ) : null}
          {core.kind === 'segments' ? (
            <View
              style={{
                flexDirection: 'row',
                height: s(M.height),
                borderRadius: s(M.height) / 2,
                overflow: 'hidden',
              }}
            >
              {core.segments.map((seg) => (
                <View
                  key={seg.channel}
                  style={{
                    paddingHorizontal: s(M.padX),
                    justifyContent: 'center',
                    backgroundColor: colors[seg.channel].bg,
                  }}
                >
                  <BadgeText size={s(M.fontSize)} color={colors[seg.channel].fg}>
                    {seg.text}
                  </BadgeText>
                </View>
              ))}
            </View>
          ) : null}
          {core.kind === 'blob' ? (
            <View
              style={{
                width: s(M.blob),
                height: s(M.blob),
                borderTopLeftRadius: s(M.blob) * BLOB_CORNERS[0],
                borderTopRightRadius: s(M.blob) * BLOB_CORNERS[1],
                borderBottomRightRadius: s(M.blob) * BLOB_CORNERS[2],
                borderBottomLeftRadius: s(M.blob) * BLOB_CORNERS[3],
                backgroundColor: colors[core.channel].bg,
              }}
            />
          ) : null}
          {layout.drops.length > 0 ? (
            <Drops
              layout={layout}
              colors={colors}
              scale={scale}
              clock={clock}
              fade={moving && reduced ? fade : undefined}
              turning={layout.rotates && !reduced}
            />
          ) : null}
        </View>
      ) : null}
      {layout.tail.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: s(M.tailGap) }}>
          {layout.tail.map((c) => (
            <View
              key={c}
              style={{
                width: s(M.tailDot),
                height: s(M.tailDot),
                borderRadius: s(M.tailDot) / 2,
                backgroundColor: colors[c].bg,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let live = true
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (live) setReduced(v)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  return reduced
}

function useLoop(on: boolean, seconds: number): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!on) return
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: seconds * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => {
      loop.stop()
      value.setValue(0)
    }
  }, [on, seconds, value])
  return value
}

function BadgeText({
  size,
  color,
  shadow,
  children,
}: {
  size: number
  color: string
  shadow?: number
  children: ReactNode
}) {
  return (
    <Text
      style={{
        fontSize: size,
        fontWeight: '800',
        color,
        includeFontPadding: false,
        textShadowColor: shadow ? INK_MIXED_TEXT_SHADOW : undefined,
        textShadowOffset: shadow ? { width: 0, height: 0.6 * shadow } : undefined,
        textShadowRadius: shadow ? 1.4 * shadow : undefined,
      }}
    >
      {children}
    </Text>
  )
}

function Pill({
  fill,
  colors,
  scale,
  text,
  mixed,
}: {
  fill: InkFill
  colors: InkColors
  scale: number
  text: string
  mixed: boolean
}) {
  const [width, setWidth] = useState(0)
  const height = M.height * scale
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        minWidth: M.minWidth * scale,
        height,
        paddingHorizontal: M.padX * scale,
        borderRadius: height / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fill.kind === 'solid' ? colors[fill.channel].bg : undefined,
      }}
    >
      {fill.kind !== 'solid' && width > 0 ? (
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <FillArt fill={fill} colors={colors} width={width} height={height} scale={scale} />
        </View>
      ) : null}
      <BadgeText
        size={M.fontSize * scale}
        color={fill.kind === 'solid' ? colors[fill.channel].fg : INK_MIXED_TEXT_COLOR}
        shadow={mixed ? scale : undefined}
      >
        {text}
      </BadgeText>
    </View>
  )
}

function Ring({
  stops,
  colors,
  scale,
  text,
}: {
  stops: InkStop[]
  colors: InkColors
  scale: number
  text: string
}) {
  const { theme } = useNativeTheme()
  const [size, setSize] = useState({ width: 0, height: 0 })
  const inner = M.ringInner * scale
  return (
    <View
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
      style={{ padding: M.ringPad * scale, borderRadius: 999, overflow: 'hidden' }}
    >
      {size.width > 0 ? (
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Svg width={size.width} height={size.height}>
            <Wedges stops={stops} colors={colors} width={size.width} height={size.height} />
          </Svg>
        </View>
      ) : null}
      <View
        style={{
          minWidth: inner,
          height: inner,
          paddingHorizontal: M.ringInnerPadX * scale,
          borderRadius: inner / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surface.raised,
        }}
      >
        <BadgeText size={M.fontSize * scale} color={theme.text.primary}>
          {text}
        </BadgeText>
      </View>
    </View>
  )
}

function FillArt({
  fill,
  colors,
  width,
  height,
  scale,
}: {
  fill: Exclude<InkFill, { kind: 'solid' }>
  colors: InkColors
  width: number
  height: number
  scale: number
}) {
  const id = useId().replace(/:/g, '')
  if (fill.kind === 'bands' && fill.style === 'pie') {
    return (
      <Svg width={width} height={height}>
        <Wedges stops={fill.stops} colors={colors} width={width} height={height} />
      </Svg>
    )
  }
  if (fill.kind === 'bands') {
    return (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${id}-bands`} x1="0" y1="0" x2="1" y2="0.18">
            {fill.stops.flatMap((st) => [
              <Stop key={`${st.channel}-a`} offset={st.from} stopColor={colors[st.channel].bg} />,
              <Stop key={`${st.channel}-b`} offset={st.to} stopColor={colors[st.channel].bg} />,
            ])}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}-bands)`} />
      </Svg>
    )
  }
  const soft = fill.style === 'watercolour'
  return (
    <Svg width={width} height={height}>
      {soft ? (
        <Defs>
          {fill.blobs.map((b, i) => (
            <RadialGradient key={i} id={`${id}-blob-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor={colors[b.channel].bg} stopOpacity={1} />
              <Stop offset={0.45} stopColor={colors[b.channel].bg} stopOpacity={0.8} />
              <Stop offset={1} stopColor={colors[b.channel].bg} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
      ) : null}
      <Rect x={0} y={0} width={width} height={height} fill={colors[fill.base].bg} />
      {fill.blobs.map((b, i) => (
        <Circle
          key={i}
          cx={(b.x / 100) * width}
          cy={(b.y / 100) * height}
          r={b.radius * scale}
          fill={soft ? `url(#${id}-blob-${i})` : colors[b.channel].bg}
        />
      ))}
    </Svg>
  )
}

function Wedges({
  stops,
  colors,
  width,
  height,
}: {
  stops: InkStop[]
  colors: InkColors
  width: number
  height: number
}) {
  const cx = width / 2
  const cy = height / 2
  const r = Math.hypot(width, height)
  const point = (f: number) => {
    const a = ((-180 + f * 360) * Math.PI) / 180
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  }
  return (
    <>
      {stops.map((st) => (
        <Path
          key={st.channel}
          d={`M ${cx} ${cy} L ${point(st.from)} A ${r} ${r} 0 ${st.to - st.from > 0.5 ? 1 : 0} 1 ${point(st.to)} Z`}
          fill={colors[st.channel].bg}
        />
      ))}
    </>
  )
}

function Drops({
  layout,
  colors,
  scale,
  clock,
  fade,
  turning,
}: {
  layout: InkBadgeLayout
  colors: InkColors
  scale: number
  clock: Animated.Value
  fade?: Animated.Value
  turning: boolean
}) {
  const rotate = clock.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: turning ? [{ rotate }] : [],
      }}
    >
      {layout.drops.map((d, i) => (
        <Drop
          key={i}
          drop={d}
          layout={layout}
          color={colors[d.channel].bg}
          scale={scale}
          clock={clock}
          fade={fade}
        />
      ))}
    </Animated.View>
  )
}

function Drop({
  drop,
  layout,
  color,
  scale,
  clock,
  fade,
}: {
  drop: InkDrop
  layout: InkBadgeLayout
  color: string
  scale: number
  clock: Animated.Value
  fade?: Animated.Value
}) {
  const size = drop.size * scale
  const frames = useMemo(
    () => (fade ? undefined : inkDropFrames(layout.motion, layout.duration, drop)),
    [fade, layout.motion, layout.duration, drop],
  )
  const motion = frames
    ? {
        opacity: clock.interpolate({ inputRange: frames.input, outputRange: frames.opacity }),
        transform: [
          {
            translateX: clock.interpolate({
              inputRange: frames.input,
              outputRange: frames.translateX.map((v) => v * scale),
            }),
          },
          {
            translateY: clock.interpolate({
              inputRange: frames.input,
              outputRange: frames.translateY.map((v) => v * scale),
            }),
          },
          { scale: clock.interpolate({ inputRange: frames.input, outputRange: frames.scale }) },
        ],
      }
    : fade
      ? {
          opacity: fade.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 1, 0.25] }),
        }
      : { opacity: drop.opacity }
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${drop.x}%`,
          top: `${drop.y}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        motion,
      ]}
    />
  )
}
