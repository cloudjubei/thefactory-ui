import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, Text, View, type LayoutChangeEvent } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface ChatHeaderProps {
  isCollapsible?: boolean
  onCollapse?: () => void
  /** Web's "open chat in own route" affordance — keep on RN too (deep-links). */
  onMaximize?: () => void

  /** Mobile-only: when set, a back chevron renders on the far left. Web's
   *  chat header sits inside a routed shell that owns navigation; on a phone
   *  the chat screen is pushed, so the header carries its own back affordance. */
  onBack?: () => void
  /** Mobile-only: a centred title between the left + right icon clusters. */
  title?: string

  totalCostUSD?: number

  /** Caller-rendered context info button (typically a connected `i` icon). */
  contextInfoSlot?: ReactNode

  onOpenPrompt: () => void
  onOpenCosts: () => void
  onOpenDynamicContext?: () => void
  onRefresh?: () => void
  onOpenSettings: () => void

  isSettingsOpen?: boolean
  /** When the chat is an agent run, the right-side action buttons collapse. */
  isRunningAgent?: boolean

  modelChip?: ReactNode
  /** Slot rendered immediately below the row. Hosts thread a bottom-sheet
   *  trigger here on RN — the sheet itself is rendered as a sibling of the
   *  `<ChatHeader>`, not inside it. */
  settingsDropdown?: ReactNode
  /** Optional slot rendered to the far right (after settings). */
  extraRight?: ReactNode

  /** Auto-hide on scroll. When `true`, the compound slides its full height
   *  off the top of the viewport over 200ms via `translateY`. Consumers
   *  toggle this from their scroll handler — see the mobile chat session
   *  view for the canonical wiring. The space the header would occupy is
   *  preserved (the underlying wrapper keeps `height`), so list content
   *  doesn't reflow when the header hides. */
  hidden?: boolean
}

function formatUSD(n?: number): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toFixed(4)}`
}

function IconBtn({
  glyph,
  label,
  onPress,
  tint,
}: {
  glyph: string
  label: string
  onPress?: () => void
  tint?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[2],
        backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
        opacity: onPress ? 1 : 0.4,
      })}
    >
      <Text style={{ fontSize: 16, color: tint ?? nativeLightTheme.text.secondary }}>{glyph}</Text>
    </Pressable>
  )
}

/**
 * Native peer of [web's `ChatHeader`](../../../web/compound/chat/ChatHeader.tsx).
 * Same prop surface plus a mobile-only `hidden` flag for auto-hide on
 * scroll — the typical wiring is to detect downward scrolling in the
 * consumer's `onScroll` and flip the flag.
 *
 * Bottom-sheet dropdowns: on RN, dropdown menus are awkward to anchor
 * accurately, so the convention here is that consumers render the
 * `settingsDropdown` slot as a `<ChatSettingsDropdown>` bottom sheet
 * (controlled by `isSettingsOpen`); the slot mounts at the bottom of the
 * header but the sheet itself overlays the whole screen.
 */
export default function ChatHeader({
  isCollapsible,
  onCollapse,
  onMaximize,
  onBack,
  title,
  totalCostUSD,
  contextInfoSlot,
  onOpenPrompt,
  onOpenCosts,
  onOpenDynamicContext,
  onRefresh,
  onOpenSettings,
  isRunningAgent,
  modelChip,
  settingsDropdown,
  extraRight,
  hidden = false,
}: ChatHeaderProps) {
  const [measuredHeight, setMeasuredHeight] = useState(0)
  const translateY = useRef(new Animated.Value(0)).current
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height
    if (h > 0 && Math.abs(h - measuredHeight) > 0.5) setMeasuredHeight(h)
  }
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: hidden ? -measuredHeight : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [hidden, measuredHeight, translateY])

  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        transform: [{ translateY }],
        borderBottomWidth: 1,
        borderBottomColor: nativeLightTheme.border.subtle,
        backgroundColor: nativeLightTheme.surface.raised,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: nativeSpace[5],
          paddingVertical: nativeSpace[3],
          gap: nativeSpace[2],
        }}
      >
        {onBack && <IconBtn glyph="‹" label="Back" onPress={onBack} />}
        {isCollapsible && <IconBtn glyph="‹" label="Collapse chat" onPress={onCollapse} />}
        {contextInfoSlot}
        {title ? (
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: '600',
              color: nativeLightTheme.text.primary,
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {title}
          </Text>
        ) : null}
        <IconBtn glyph="📝" label="System prompt" onPress={onOpenPrompt} />
        <IconBtn glyph={`💲${formatUSD(totalCostUSD)}`} label="Costs" onPress={onOpenCosts} />
        {onOpenDynamicContext && (
          <IconBtn glyph="📜" label="Dynamic context" onPress={onOpenDynamicContext} />
        )}
        {!title && <View style={{ flex: 1 }} />}
        {!isRunningAgent && (
          <>
            {onMaximize && <IconBtn glyph="⤢" label="Open chat" onPress={onMaximize} />}
            {onRefresh && (
              <IconBtn
                glyph="↻"
                label="Clear chat"
                onPress={onRefresh}
                tint={nativeLightTheme.accent.primary}
              />
            )}
            {modelChip}
            <IconBtn glyph="⚙" label="Chat settings" onPress={onOpenSettings} />
            {extraRight}
          </>
        )}
      </View>
      {settingsDropdown}
    </Animated.View>
  )
}
