import { useState } from 'react'
import { Modal as RNModal, Pressable, Text, View } from 'react-native'
import {
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  statusLabel,
  type StatusSemanticKey,
  type StoryStatus,
} from '../../headless/utils/status'
import {
  nativeLightTheme,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'

export type { StoryStatus, StatusSemanticKey }
export { STATUS_LABELS, STATUS_ORDER, statusKey, statusLabel }

export interface StatusControlProps {
  status: StoryStatus | string
  /** When set, the badge becomes a pressable that opens a status picker. */
  onChange?: (status: StoryStatus) => void
  size?: 'sm' | 'md'
}

interface StatusColors {
  bg: string
  fg: string
  border: string
}

const SEMANTIC_COLORS: Record<StatusSemanticKey, StatusColors> = {
  queued: {
    bg: nativePalette.gray[100],
    fg: nativePalette.gray[800],
    border: nativePalette.gray[300],
  },
  working: {
    bg: nativePalette.orange[100],
    fg: nativePalette.orange[800],
    border: nativePalette.orange[300],
  },
  done: {
    bg: nativePalette.green[100],
    fg: nativePalette.green[800],
    border: nativePalette.green[300],
  },
  stuck: {
    bg: nativePalette.red[100],
    fg: nativePalette.red[800],
    border: nativePalette.red[300],
  },
  onhold: {
    bg: nativePalette.purple[100],
    fg: nativePalette.purple[800],
    border: nativePalette.purple[300],
  },
}

function resolve(status: StoryStatus | string): { colors: StatusColors; label: string } {
  const isKnown =
    status === '+' || status === '-' || status === '~' || status === '?' || status === '='
  const key: StatusSemanticKey = isKnown ? statusKey(status as StoryStatus) : 'queued'
  return { colors: SEMANTIC_COLORS[key], label: statusLabel(status) }
}

export default function StatusControl({ status, onChange, size = 'sm' }: StatusControlProps) {
  const [open, setOpen] = useState(false)
  const { colors, label } = resolve(status)
  const interactive = onChange != null
  const padX = size === 'md' ? nativeSpace[6] : nativeSpace[5]
  const padY = size === 'md' ? nativeSpace[3] : nativeSpace[2]
  const fontSize = size === 'md' ? 13 : 11

  const badge = (
    <View
      accessibilityLabel={`Status: ${label}`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: padX,
        paddingVertical: padY,
        borderRadius: nativeRadii.round,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize, fontWeight: '500', color: colors.fg }}>{label}</Text>
    </View>
  )

  if (!interactive) return badge

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change status (current: ${label})`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'flex-start' })}
      >
        {badge}
      </Pressable>
      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: nativeSpace[6],
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 280,
              padding: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor: nativeLightTheme.surface.overlay,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              ...nativeShadows[3],
            }}
          >
            {STATUS_ORDER.map((opt) => {
              const optResolved = resolve(opt)
              const selected = opt === status
              return (
                <Pressable
                  key={opt}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange?.(opt)
                    setOpen(false)
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[4],
                    paddingVertical: nativeSpace[4],
                    paddingHorizontal: nativeSpace[5],
                    borderRadius: nativeRadii[1],
                    backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
                  })}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: optResolved.colors.fg,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: selected ? '600' : '400',
                      color: nativeLightTheme.text.primary,
                    }}
                  >
                    {optResolved.label}
                  </Text>
                  {selected && (
                    <Text style={{ fontSize: 14, color: nativeLightTheme.accent.primary }}>✓</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </RNModal>
    </>
  )
}
