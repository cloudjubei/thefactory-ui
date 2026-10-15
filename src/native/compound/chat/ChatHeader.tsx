import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, Text, View, type LayoutChangeEvent } from 'react-native'

import type { ChatHeaderView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron, IconMaximize } from '../../icons'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'
import StepsStrip from '../process/StepsStrip'
import ChatKindTile from './ChatKindTile'

export interface ChatHeaderProps {
  /** What the header shows — from `useChatHeaderView`. */
  view: ChatHeaderView
  /** The "i" button that opens what the chat is about. */
  contextInfoSlot?: ReactNode
  modelChip?: ReactNode
  /** The settings gear and its menu — usually `<ChatSettingsMenu>`. */
  settingsMenu?: ReactNode
  /** A panel the header hosts — the turn limit and tools sheet. */
  settingsPanel?: ReactNode
  onCollapse?: () => void
  onMaximize?: () => void
  /** Mobile-only: a back chevron leads the header on a pushed chat screen. */
  onBack?: () => void
  /** Leaves the title to the surrounding chrome — a screen's own header. */
  hideTitle?: boolean
  /**
   * A narrow host: the steps strip folds, and the model chip joins the pill and
   * meta line under the title, so the title keeps its row. Web's rule too.
   */
  narrow?: boolean
  extraRight?: ReactNode
  /**
   * Auto-hide on scroll: slides the header its full height off the top over
   * 200ms. The space it took is kept, so the list does not reflow.
   */
  hidden?: boolean
  /**
   * The chat is shown beside what it is about — a run's chat beside its run —
   * so the header is one slim row: collapse, this label, the model chip and
   * maximize, with no kind tile, title, status, meta or steps. Web's rule too.
   */
  dockedLabel?: string
}

function IconBtn({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.hover : theme.surface.overlay,
      })}
    >
      {children}
    </Pressable>
  )
}

/**
 * Native peer of [web's `ChatHeader`](../../../web/compound/chat/ChatHeader.tsx):
 * the kind tile and title with the status pill, the line saying where the chat
 * sits with its time and cost, the model chip and the settings gear — and under
 * it, for a run, story or feature chat, the steps strip.
 */
export default function ChatHeader({
  view,
  contextInfoSlot,
  modelChip,
  settingsMenu,
  settingsPanel,
  onCollapse,
  onMaximize,
  onBack,
  hideTitle = false,
  narrow = false,
  extraRight,
  hidden = false,
  dockedLabel,
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
  const pill = view.pill ? <ToneBadge tone={view.pill.tone} label={view.pill.label} /> : null
  const rowStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nativeSpace[2],
    paddingHorizontal: nativeSpace[3],
    paddingVertical: nativeSpace[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  } as const
  const collapse = onCollapse ? (
    <IconBtn label="Collapse chat" onPress={onCollapse}>
      <View style={{ transform: [{ rotate: '90deg' }] }}>
        <IconChevron size={16} color={iconColor} />
      </View>
    </IconBtn>
  ) : null
  const maximize = onMaximize ? (
    <IconBtn label="Open chat in its own view" onPress={onMaximize}>
      <IconMaximize size={16} color={iconColor} />
    </IconBtn>
  ) : null

  if (dockedLabel !== undefined) {
    return (
      <View style={[rowStyle, { backgroundColor: theme.surface.raised }]}>
        {collapse}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {dockedLabel}
        </Text>
        {modelChip}
        {maximize}
      </View>
    )
  }

  return (
    <Animated.View
      onLayout={onLayout}
      style={{ transform: [{ translateY }], backgroundColor: theme.surface.raised }}
    >
      <View style={rowStyle}>
        {onBack ? (
          <IconBtn label="Back" onPress={onBack}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <IconChevron size={16} color={iconColor} />
            </View>
          </IconBtn>
        ) : null}
        {collapse}
        {contextInfoSlot}
        <ChatKindTile kind={view.kind} label={view.kindLabel} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {hideTitle ? null : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontSize: 15,
                  fontWeight: '600',
                  color: theme.text.primary,
                }}
              >
                {view.title}
              </Text>
              {pill}
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            {hideTitle ? pill : null}
            {view.context ? (
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}
              >
                {view.context}
              </Text>
            ) : null}
            {view.duration ? (
              <DurationChip
                label={view.duration.label}
                details={view.duration.details}
                title={view.duration.title}
              />
            ) : null}
            {view.cost ? (
              <CostChip label={view.cost.label} cost={view.cost.cost} title={view.cost.title} />
            ) : null}
            {narrow ? modelChip : null}
          </View>
        </View>
        {maximize}
        {narrow ? null : modelChip}
        {settingsMenu}
        {extraRight}
      </View>
      {view.strip ? <StepsStrip model={view.strip} narrow={narrow} /> : null}
      {settingsPanel}
    </Animated.View>
  )
}
