import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Button } from '../../primitives/Button'
import StatusChip, { type ChipState } from '../chips/StatusChip'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface AgentRunRowCardData {
  runId?: string
  state?: ChipState
  messageCount?: number
  totalCostUSD?: number
  /** Optional rating score; -1 = down, 0/undefined = none, 1 = up. */
  ratingScore?: number
  /** Subtype label rendered as monospaced `<type> · <runId>` suffix. */
  type?: 'feature' | 'story' | string
}

export interface AgentRunRowCardProps {
  /** Resolved title shown as the row's primary label. */
  target: ReactNode
  run: AgentRunRowCardData
  onOpen: () => void
  onCancel?: () => void
  onDelete?: () => void
  /** Caller decides the toggle semantics: clicking the same direction twice
   *  should call back with `0` to clear. */
  onRate?: (score: number) => void
  className?: string
}

function RatingButton({
  glyph,
  label,
  active,
  onPress,
}: {
  glyph: string
  label: string
  active: boolean
  onPress: () => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        padding: nativeSpace[2],
        borderRadius: nativeRadii[1],
        opacity: pressed ? 0.6 : active ? 1 : 0.4,
      })}
    >
      <Text style={{ fontSize: 16, color: theme.text.primary }}>{glyph}</Text>
    </Pressable>
  )
}

export default function AgentRunRowCard({
  target,
  run,
  onOpen,
  onCancel,
  onDelete,
  onRate,
  className,
}: AgentRunRowCardProps) {
  const { theme } = useNativeTheme()
  const state = run.state ?? 'created'
  const messageCount = run.messageCount ?? 0
  const totalCostUSD = run.totalCostUSD ?? 0
  const score = run.ratingScore ?? 0

  return (
    <View
      className={className}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[5],
        paddingHorizontal: nativeSpace[6],
        paddingVertical: nativeSpace[4],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={typeof target === 'string' ? target : 'Open run'}
        onPress={onOpen}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
      >
        {typeof target === 'string' ? (
          <Text numberOfLines={1} style={{ fontSize: 14, color: theme.text.primary }}>
            {target}
          </Text>
        ) : (
          target
        )}
        <Text
          numberOfLines={1}
          style={{
            marginTop: 2,
            fontSize: 11,
            fontFamily: 'Menlo',
            color: theme.text.muted,
          }}
        >
          {(run.type ?? 'run') + ' · ' + (run.runId?.slice(0, 8) ?? '?')}
        </Text>
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[5],
          flexShrink: 0,
        }}
      >
        <StatusChip state={state} label={state} />
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {messageCount} msgs
        </Text>
        {totalCostUSD > 0 && (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            ${totalCostUSD.toFixed(4)}
          </Text>
        )}
        {onRate && (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Rate this run"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <RatingButton
              glyph="👍"
              label="Thumbs up"
              active={score > 0}
              onPress={() => onRate(score > 0 ? 0 : 1)}
            />
            <RatingButton
              glyph="👎"
              label="Thumbs down"
              active={score < 0}
              onPress={() => onRate(score < 0 ? 0 : -1)}
            />
          </View>
        )}
        {onCancel && (
          <Button size="sm" variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" onPress={onDelete}>
            <Text style={{ fontSize: 16, color: theme.text.secondary }}>🗑</Text>
          </Button>
        )}
      </View>
    </View>
  )
}
