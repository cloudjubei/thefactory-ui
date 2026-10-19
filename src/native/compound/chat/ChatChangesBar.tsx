import { Pressable, Text, View } from 'react-native'

import { CHAT_CHANGES_DOCK_COPY } from '../../../headless/utils/chatChangesDockConstants'
import type { ChatChangesBarView } from '../../../headless/utils/chatChangesDockTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { toneText } from './signoff'

export type ChatChangesBarProps = {
  view: ChatChangesBarView
  /** One line, under a question or an approval that holds the message box. */
  compact?: boolean
  onReview: () => void
}

/**
 * Native peer of web's `ChatChangesBar`, as a phone's one row above the
 * message box: what waits and what the checks said on the left, Review on the
 * right. The whole row opens the review; Discard lives in the review itself.
 */
export function ChatChangesBar({ view, compact = false, onReview }: ChatChangesBarProps) {
  const { theme, status } = useNativeTheme()
  const rest = [view.waited, view.unfit].filter((part): part is string => part !== undefined)
  const label = [view.shortTitle, view.verdict?.label, ...rest].filter(Boolean).join(' · ')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onReview}
      style={({ pressed }) => ({
        marginHorizontal: 10,
        marginTop: 6,
        marginBottom: compact ? 4 : 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: compact ? 40 : 52,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: compact ? 4 : 8,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: compact ? 13 : 13.5, fontWeight: '600', color: theme.text.primary }}
        >
          {view.shortTitle}
          {compact && view.verdict ? (
            <Text style={{ fontWeight: '400', color: toneText(view.verdict.tone, theme) }}>
              {` · ${view.verdict.label}`}
            </Text>
          ) : null}
        </Text>
        {!compact && (view.verdict || rest.length > 0) ? (
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.text.secondary }}>
            {view.verdict ? (
              <Text style={{ color: toneText(view.verdict.tone, theme) }}>
                {view.verdict.label}
              </Text>
            ) : null}
            {rest.length > 0 ? (
              <Text
                style={view.overdue || view.unfit ? { color: status.on_hold.softFg } : undefined}
              >
                {`${view.verdict ? ' · ' : ''}${rest.join(' · ')}`}
              </Text>
            ) : null}
          </Text>
        ) : null}
      </View>
      <Button size="sm" onPress={onReview}>
        {CHAT_CHANGES_DOCK_COPY.review}
      </Button>
    </Pressable>
  )
}
