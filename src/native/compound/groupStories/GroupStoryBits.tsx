import { Pressable, Text, View } from 'react-native'

import {
  processGroupBadge,
  type GroupStoryRunSummary,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** The tones a group story chip takes: a plain part, a story, a need, something gone. */
export type GroupStoryChipTone = 'neutral' | 'ok' | 'blocks' | 'missing'

/**
 * The chip recipe — 24 px pill, 12 px text — as web's `.chip`, `.chip--ok`,
 * `.chip--blocks` and `.chip--missing` draw it.
 */
export function GroupStoryChip({
  label,
  tone = 'neutral',
  onPress,
  accessibilityLabel,
}: {
  label: string
  tone?: GroupStoryChipTone
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const { theme, status } = useNativeTheme()
  const colors =
    tone === 'ok'
      ? { bg: theme.accent.softBg, border: theme.accent.softBorder, fg: theme.text.primary }
      : tone === 'blocks'
        ? { bg: status.working.softBg, border: status.working.softBorder, fg: theme.text.primary }
        : tone === 'missing'
          ? { bg: status.stuck.softBg, border: status.stuck.softBorder, fg: theme.text.primary }
          : { bg: theme.surface.base, border: theme.border.default, fg: theme.text.secondary }
  const body = (
    <View
      style={{
        minHeight: 24,
        justifyContent: 'center',
        paddingHorizontal: nativeSpace[2],
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        maxWidth: '100%',
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 12, color: colors.fg }}>
        {label}
      </Text>
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={8}
    >
      {body}
    </Pressable>
  )
}

/** A group run's state as a soft status pill. */
export function GroupStoryToneBadge({ tone, label }: { tone: ProcessStatusTone; label: string }) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii.round,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 11, color: variant.softFg }}>{label}</Text>
    </View>
  )
}

/** A group story's latest run, as a pill that opens it. */
export function GroupStoryRunStatus({
  run,
  onOpen,
}: {
  run: GroupStoryRunSummary
  onOpen: (groupRunId: string) => void
}) {
  const badge = processGroupBadge({ status: run.status, legs: [] })
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${badge.label} — open its group run`}
      onPress={() => onOpen(run.groupRunId)}
      hitSlop={10}
    >
      <GroupStoryToneBadge tone={badge.tone} label={badge.label} />
    </Pressable>
  )
}

/** A part's story as a story chip, opening it; a story that is gone says so. */
export function GroupStoryStoryChip({
  title,
  onOpen,
}: {
  title: string | undefined
  onOpen?: () => void
}) {
  if (title === undefined) return <GroupStoryChip label="Story gone" tone="missing" />
  return <GroupStoryChip label={title} tone="ok" {...(onOpen ? { onPress: onOpen } : {})} />
}
