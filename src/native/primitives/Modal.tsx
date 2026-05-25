import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  nativeMotion,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from './Button'
import { OverlayPortal } from './Overlay'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: ModalSize
  hideCloseButton?: boolean
  closeOnOverlayClick?: boolean
  headerActions?: ReactNode
  hideHeader?: boolean
  /** No-op on RN — back-button dismissal is handled by the OS. */
  closeOnEsc?: boolean
  panelStyle?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  /**
   * When true, the panel pins to its `maxHeight` (90% screen) and the inner
   * column gets `flex: 1` so a `flex-1` ScrollView in `children` actually
   * stretches. Use for modals that host a long list (e.g. Manage Projects).
   * Default `false` — the panel hugs its content like a normal dialog.
   */
  fillHeight?: boolean
  className?: string
}

const MAX_WIDTH: Record<ModalSize, number> = {
  sm: 360,
  md: 480,
  lg: 600,
  xl: 720,
}

/**
 * Centred modal dialog. Renders through the app overlay host (not RN's
 * `<Modal>`), so it can open from inside a `BottomSheet` or another `Modal`
 * without the iOS double-presentation crash. Enters with a fade + slide-up +
 * scale and reverses on close.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  headerActions,
  hideHeader = false,
  panelStyle,
  contentStyle,
  fillHeight = false,
  className,
}: ModalProps) {
  const { theme } = useNativeTheme()
  const showHeader = !hideHeader && (title || headerActions || !hideCloseButton)
  // Two-step mount so the close animation is visible.
  const [rendered, setRendered] = useState(isOpen)
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current

  useEffect(() => {
    if (isOpen) setRendered(true)
  }, [isOpen])

  useEffect(() => {
    if (!rendered) return
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? nativeMotion.normal : nativeMotion.fast,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) setRendered(false)
    })
  }, [isOpen, rendered, progress])

  if (!rendered) return null

  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] })
  const panelTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] })
  const panelScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] })

  return (
    <OverlayPortal>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: nativeSpace[6],
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeOnOverlayClick ? 'Dismiss modal' : undefined}
          onPress={closeOnOverlayClick ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            {
              width: '100%',
              maxWidth: MAX_WIDTH[size],
              maxHeight: '90%',
              borderRadius: nativeRadii[3],
              backgroundColor: theme.surface.overlay,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              ...nativeShadows[4],
              opacity: progress,
              transform: [{ translateY: panelTranslateY }, { scale: panelScale }],
            },
            // When `fillHeight`, the panel pins to its maxHeight so the inner
            // `flex: 1` column has something to fill.
            fillHeight ? { height: '90%' } : null,
            panelStyle,
          ]}
        >
          <View
            className={className}
            accessibilityViewIsModal
            // Default: column hugs content (`flexShrink: 1` only) — matches
            // dialog/compact modal sizing. `fillHeight` opts in to `flex: 1`
            // for modals hosting a long internal scroll region.
            style={fillHeight ? { flex: 1 } : { flexShrink: 1 }}
          >
            {showHeader && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: nativeSpace[6],
                  paddingHorizontal: nativeSpace[8],
                  paddingVertical: nativeSpace[5],
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border.subtle,
                }}
              >
                {title && (
                  <Text
                    accessibilityRole="header"
                    numberOfLines={2}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '600',
                      color: theme.text.primary,
                    }}
                  >
                    {title}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}>
                  {headerActions}
                  {!hideCloseButton && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      onPress={onClose}
                      style={({ pressed }) => ({
                        height: 32,
                        width: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: nativeRadii[2],
                        opacity: pressed ? 0.6 : 0.85,
                      })}
                    >
                      <Text style={{ fontSize: 18, color: theme.text.secondary }}>
                        ×
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
            <View style={[{ flexShrink: 1, padding: nativeSpace[8] }, contentStyle]}>
              {children}
            </View>
            {footer && (
              <View
                style={{
                  padding: nativeSpace[6],
                  borderTopWidth: 1,
                  borderTopColor: theme.border.subtle,
                }}
              >
                {footer}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </OverlayPortal>
  )
}

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  closeOnOverlayClick?: boolean
  /**
   * Hide the secondary "Cancel" button. Use when closing the dialog via X /
   * overlay / back gesture IS the cancel action — the dialog then shows
   * only the primary (confirm / discard) button.
   */
  hideCancel?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  closeOnOverlayClick = true,
  hideCancel = false,
}: ConfirmDialogProps) {
  const { theme } = useNativeTheme()
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={closeOnOverlayClick}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[4] }}>
          {!hideCancel && (
            <Button variant="secondary" onPress={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onPress={async () => {
              await onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </View>
      }
    >
      {description && (
        <Text style={{ fontSize: 14, color: theme.text.secondary }}>{description}</Text>
      )}
    </Modal>
  )
}
