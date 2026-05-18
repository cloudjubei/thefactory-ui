import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  nativeLightTheme,
  nativeRadii,
  nativeSpace,
} from '../../../tokens/native'

export interface ChatHeaderProps {
  isCollapsible?: boolean
  onCollapse?: () => void
  /** Web's "open chat in own route" affordance — keep on RN too (deep-links). */
  onMaximize?: () => void

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
  /** Settings dropdown rendered beneath the icon row; host owns its state. */
  settingsDropdown?: ReactNode
  /** Optional slot rendered to the far right (after settings). */
  extraRight?: ReactNode
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
      <Text style={{ fontSize: 16, color: tint ?? nativeLightTheme.text.secondary }}>
        {glyph}
      </Text>
    </Pressable>
  )
}

export default function ChatHeader({
  isCollapsible,
  onCollapse,
  onMaximize,
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
}: ChatHeaderProps) {
  return (
    <View
      style={{
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
        {isCollapsible && (
          <IconBtn glyph="‹" label="Collapse chat" onPress={onCollapse} />
        )}
        {contextInfoSlot}
        <IconBtn glyph="📝" label="System prompt" onPress={onOpenPrompt} />
        <IconBtn
          glyph={`💲${formatUSD(totalCostUSD)}`}
          label="Costs"
          onPress={onOpenCosts}
        />
        {onOpenDynamicContext && (
          <IconBtn glyph="📜" label="Dynamic context" onPress={onOpenDynamicContext} />
        )}
        <View style={{ flex: 1 }} />
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
    </View>
  )
}
