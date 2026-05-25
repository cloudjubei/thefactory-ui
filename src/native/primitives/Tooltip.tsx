import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { useTooltipState } from '../../headless/hooks/useTooltipState'
import {
  nativeMotion,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { OverlayPortal } from './Overlay'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TooltipSideAlign = 'center' | 'start' | 'end'
export type TooltipVariant = 'default' | 'bare'

export interface TooltipProps {
  children: ReactNode
  content: ReactNode
  disabled?: boolean
  variant?: TooltipVariant
  className?: string
  anchorClassName?: string
  /** Accepted for API parity with web; long-press fires immediately on RN. */
  delayMs?: number
  closeDelayMs?: number
  /** Accepted for API parity with web; RN renders the tooltip as a centred
   * overlay regardless of these hints. */
  placement?: TooltipPlacement
  allowedPlacements?: TooltipPlacement[]
  sideAlign?: TooltipSideAlign
  /** Accepted for API parity with web; RN has no click-toggle, only long-press. */
  disableClickToggle?: boolean
  /** Accepted for API parity with web; the overlay host owns z-ordering. */
  zIndex?: number
  anchorStyle?: StyleProp<ViewStyle>
}

export default function Tooltip({
  children,
  content,
  disabled = false,
  variant = 'default',
  className,
  anchorClassName,
  anchorStyle,
}: TooltipProps) {
  const { theme } = useNativeTheme()
  const { open, show, hide } = useTooltipState({ delayMs: 0, closeDelayMs: 0, disabled })
  const bare = variant === 'bare'
  // Two-step mount so the fade-out is visible.
  const [rendered, setRendered] = useState(open)
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  useEffect(() => {
    if (!rendered) return
    Animated.timing(opacity, {
      toValue: open ? 1 : 0,
      duration: nativeMotion.fast,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setRendered(false)
    })
  }, [open, rendered, opacity])

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onLongPress={() => show(true)}
        delayLongPress={350}
        disabled={disabled}
        className={anchorClassName}
        style={anchorStyle}
      >
        {children}
      </Pressable>
      {rendered && (
        <OverlayPortal>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss tooltip"
              onPress={() => hide(true)}
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: nativeSpace[8],
              }}
            >
              <View
                accessibilityRole="text"
                className={className}
                style={{
                  maxWidth: 320,
                  paddingHorizontal: bare ? 0 : nativeSpace[8],
                  paddingVertical: bare ? 0 : nativeSpace[5],
                  borderRadius: nativeRadii[2],
                  backgroundColor: bare ? 'transparent' : theme.surface.overlay,
                  borderWidth: bare ? 0 : 1,
                  borderColor: theme.border.subtle,
                  ...(!bare ? nativeShadows[2] : null),
                }}
              >
                {typeof content === 'string' ? (
                  <Text style={{ fontSize: 13, color: theme.text.primary }}>
                    {content}
                  </Text>
                ) : (
                  content
                )}
              </View>
            </Pressable>
          </Animated.View>
        </OverlayPortal>
      )}
    </>
  )
}
