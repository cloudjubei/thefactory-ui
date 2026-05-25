import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import {
  useToastQueue,
  type ToastItem,
  type ToastMessage,
  type ToastVariant,
} from '../../headless/hooks/useToastQueue'
import {
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type { ToastMessage, ToastVariant }

interface ToastCtx {
  toast: (msg: ToastMessage) => void
}

const Ctx = createContext<ToastCtx | null>(null)

const VARIANT_BADGE: Record<ToastVariant, { bg: string; fg: string; glyph: string }> = {
  default: { bg: nativePalette.gray[100], fg: nativePalette.gray[700], glyph: '•' },
  success: { bg: nativePalette.green[100], fg: nativePalette.green[700], glyph: '✔' },
  error: { bg: nativePalette.red[100], fg: nativePalette.red[700], glyph: '⚠' },
  warning: { bg: nativePalette.orange[100], fg: nativePalette.orange[700], glyph: '!' },
}

const ENTER_OFFSET = -12
const ANIMATION_MS = 200

function ToastView({ item, onClose }: { item: ToastItem; onClose: (id: string) => void }) {
  const { theme } = useNativeTheme()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(ENTER_OFFSET)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ANIMATION_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: ANIMATION_MS, useNativeDriver: true }),
    ]).start()
  }, [opacity, translateY])

  useEffect(() => {
    if (!item.isClosing) return
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: ANIMATION_MS, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: ENTER_OFFSET,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start()
  }, [item.isClosing, opacity, translateY])

  const badge = VARIANT_BADGE[item.variant]

  return (
    <Animated.View
      accessibilityRole={item.variant === 'error' ? 'alert' : 'text'}
      style={{
        opacity,
        transform: [{ translateY }],
        width: 340,
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: nativeSpace[5],
        padding: nativeSpace[6],
        borderRadius: nativeRadii[4],
        backgroundColor: theme.surface.overlay,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        ...nativeShadows[3],
      }}
    >
      <View
        style={{
          height: 28,
          width: 28,
          borderRadius: 14,
          backgroundColor: badge.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: badge.fg }}>{badge.glyph}</Text>
      </View>
      <View style={{ flex: 1, gap: nativeSpace[2] }}>
        {item.title ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}
          >
            {item.title}
          </Text>
        ) : null}
        {item.description ? (
          <Text numberOfLines={3} style={{ fontSize: 13, color: theme.text.secondary }}>
            {item.description}
          </Text>
        ) : null}
        {item.action.label ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              item.action.onClick()
              onClose(item.id)
            }}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              marginTop: nativeSpace[2],
              paddingHorizontal: nativeSpace[6],
              paddingVertical: nativeSpace[3],
              borderRadius: 999,
              backgroundColor: theme.surface.muted,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => onClose(item.id)}
        style={({ pressed }) => ({
          padding: nativeSpace[3],
          opacity: pressed ? 0.5 : 0.8,
        })}
      >
        <Text style={{ fontSize: 16, color: theme.text.muted }}>×</Text>
      </Pressable>
    </Animated.View>
  )
}

function ToastViewport({ items, onClose }: { items: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: nativeSpace[10],
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: nativeSpace[4],
      }}
    >
      {items.map((t) => (
        <ToastView key={t.id} item={t} onClose={onClose} />
      ))}
    </View>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { items, add, startClose } = useToastQueue()
  const api = useMemo<ToastCtx>(() => ({ toast: add }), [add])
  return (
    <Ctx.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        <ToastViewport items={items} onClose={startClose} />
      </View>
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  return useContext(Ctx) ?? { toast: () => {} }
}
