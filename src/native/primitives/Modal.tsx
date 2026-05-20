import type { ReactNode } from 'react'
import { Modal as RNModal, Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeShadows, nativeSpace } from '../../tokens/native'
import { Button } from './Button'

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
  /** No-op on RN — back-button dismissal is handled by `onRequestClose`. */
  closeOnEsc?: boolean
  panelStyle?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  className?: string
}

const MAX_WIDTH: Record<ModalSize, number> = {
  sm: 360,
  md: 480,
  lg: 600,
  xl: 720,
}

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
  className,
}: ModalProps) {
  const showHeader = !hideHeader && (title || headerActions || !hideCloseButton)

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeOnOverlayClick ? 'Dismiss modal' : undefined}
        onPress={closeOnOverlayClick ? onClose : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: nativeSpace[6],
        }}
      >
        {/* Inner Pressable absorbs taps so they don't bubble to the backdrop. */}
        <Pressable
          accessible={false}
          onPress={() => {}}
          style={[
            {
              width: '100%',
              maxWidth: MAX_WIDTH[size],
              maxHeight: '90%',
              borderRadius: nativeRadii[3],
              backgroundColor: nativeLightTheme.surface.overlay,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              ...nativeShadows[4],
            },
            panelStyle,
          ]}
        >
          <View className={className} accessibilityViewIsModal>
            {showHeader && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: nativeSpace[6],
                  paddingHorizontal: nativeSpace[8],
                  paddingVertical: nativeSpace[5],
                  borderBottomWidth: 1,
                  borderBottomColor: nativeLightTheme.border.subtle,
                }}
              >
                {title && (
                  <Text
                    accessibilityRole="header"
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '600',
                      color: nativeLightTheme.text.primary,
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
                      <Text style={{ fontSize: 18, color: nativeLightTheme.text.secondary }}>
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
                  borderTopColor: nativeLightTheme.border.subtle,
                }}
              >
                {footer}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
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
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={closeOnOverlayClick}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[4] }}>
          <Button variant="secondary" onPress={onClose}>
            {cancelLabel}
          </Button>
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
        <Text style={{ fontSize: 14, color: nativeLightTheme.text.secondary }}>{description}</Text>
      )}
    </Modal>
  )
}
