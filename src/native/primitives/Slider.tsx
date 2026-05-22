import { useMemo, useRef, useState } from 'react'
import { PanResponder, View, type LayoutChangeEvent } from 'react-native'
import { nativeLightTheme } from '../../tokens/native'

export interface SliderProps {
  value: number
  min: number
  max: number
  /** Quantisation step. Defaults to 1. */
  step?: number
  onChange: (next: number) => void
  /** Fires once when the gesture ends — host can persist on release. */
  onCommit?: (next: number) => void
  disabled?: boolean
}

const THUMB = 20
const TRACK_HEIGHT = 4

/**
 * Native peer of web's `<input type="range">`. RN has no range primitive, so
 * this is a `PanResponder`-driven track + thumb — no gesture-handler or
 * reanimated dependency. Controlled: the host owns `value`.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  disabled = false,
}: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(0)
  const widthRef = useRef(0)

  const clampSnap = (raw: number): number => {
    const clamped = Math.max(min, Math.min(max, raw))
    const snapped = Math.round((clamped - min) / step) * step + min
    return Math.max(min, Math.min(max, snapped))
  }

  const valueFromX = (x: number): number => {
    const w = widthRef.current
    if (w <= 0) return value
    const ratio = Math.max(0, Math.min(1, x / w))
    return clampSnap(min + ratio * (max - min))
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e) => {
          if (disabled) return
          onChange(valueFromX(e.nativeEvent.locationX))
        },
        onPanResponderMove: (e) => {
          if (disabled) return
          onChange(valueFromX(e.nativeEvent.locationX))
        },
        onPanResponderRelease: (e) => {
          if (disabled) return
          onCommit?.(valueFromX(e.nativeEvent.locationX))
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, min, max, step, onChange, onCommit, value],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    widthRef.current = w
    setTrackWidth(w)
  }

  const ratio = max > min ? (Math.max(min, Math.min(max, value)) - min) / (max - min) : 0
  const fillWidth = trackWidth * ratio

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      style={{
        height: THUMB + 8,
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: nativeLightTheme.border.default,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: fillWidth,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: nativeLightTheme.accent.primary,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.max(0, Math.min(trackWidth - THUMB, fillWidth - THUMB / 2)),
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: '#ffffff',
          borderWidth: 2,
          borderColor: nativeLightTheme.accent.primary,
        }}
      />
    </View>
  )
}
