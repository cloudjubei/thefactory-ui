import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, Text, View, type LayoutChangeEvent } from 'react-native'
import {
  IconBug,
  IconCalculator,
  IconChevron,
  IconCode,
  IconMaximize,
  IconRefreshChat,
  IconScroll,
  IconSettings,
} from '../../icons'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { red } from '../../../tokens/colors'

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
  /** When set, shows a bug button beside the dynamic-context one that opens
   *  the chat's rendering diagnostic (`ChatDebugModal`). */
  onOpenDebug?: () => void
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
  children,
  label,
  onPress,
  variant = 'ghost',
}: {
  children: ReactNode
  label: string
  onPress?: () => void
  variant?: 'ghost' | 'danger'
}) {
  const { theme } = useNativeTheme()
  const isDanger = variant === 'danger'
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
        borderWidth: 1,
        borderColor: isDanger ? red[500] : theme.border.subtle,
        backgroundColor: isDanger
          ? pressed
            ? `${red[500]}33`
            : `${red[500]}1a`
          : pressed
            ? theme.surface.hover
            : theme.surface.overlay,
        opacity: onPress ? 1 : 0.4,
      })}
    >
      {children}
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
  onOpenDebug,
  onRefresh,
  onOpenSettings,
  isRunningAgent,
  modelChip,
  settingsDropdown,
  extraRight,
  hidden = false,
}: ChatHeaderProps) {
  const { theme } = useNativeTheme()
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

  const iconColor = theme.text.secondary

  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        transform: [{ translateY }],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          gap: nativeSpace[2],
        }}
      >
        {onBack && (
          <IconBtn label="Back" onPress={onBack}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <IconChevron size={16} color={iconColor} />
            </View>
          </IconBtn>
        )}
        {isCollapsible && (
          <IconBtn label="Collapse chat" onPress={onCollapse}>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <IconChevron size={16} color={iconColor} />
            </View>
          </IconBtn>
        )}
        {contextInfoSlot}
        {title ? (
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: '600',
              color: theme.text.primary,
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {title}
          </Text>
        ) : null}
        <IconBtn label="View System Prompt" onPress={onOpenPrompt}>
          <IconScroll size={16} color={iconColor} />
        </IconBtn>
        <IconBtn
          label={
            typeof totalCostUSD === 'number' && totalCostUSD > 0
              ? `Usage costs — ${formatUSD(totalCostUSD)}`
              : 'Usage costs'
          }
          onPress={onOpenCosts}
        >
          <IconCalculator size={16} color={iconColor} />
        </IconBtn>
        {onOpenDynamicContext && (
          <IconBtn label="Dynamic context" onPress={onOpenDynamicContext}>
            <IconCode size={16} color={iconColor} />
          </IconBtn>
        )}
        {onOpenDebug && (
          <IconBtn label="Chat debug dump" onPress={onOpenDebug}>
            <IconBug size={16} color={iconColor} />
          </IconBtn>
        )}
        {!title && <View style={{ flex: 1 }} />}
        {!isRunningAgent && (
          <>
            {onMaximize && (
              <IconBtn label="Open chat in its own view" onPress={onMaximize}>
                <IconMaximize size={16} color={iconColor} />
              </IconBtn>
            )}
            {onRefresh && (
              <IconBtn label="Clear chat" onPress={onRefresh} variant="danger">
                <IconRefreshChat size={16} color={red[600]} />
              </IconBtn>
            )}
            {modelChip}
            <IconBtn label="Chat settings" onPress={onOpenSettings}>
              <IconSettings size={16} color={iconColor} />
            </IconBtn>
            {extraRight}
          </>
        )}
      </View>
      {settingsDropdown}
    </Animated.View>
  )
}
