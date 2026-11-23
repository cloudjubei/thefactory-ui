import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { workQueueEntryKey } from 'thefactory-tools/utils'

import type { UseWorkQueue } from '../../../headless/hooks/useWorkQueue'
import { WORK_QUEUE_COPY } from '../../../headless/utils/workQueueConstants'
import type { WorkQueueCandidate, WorkQueueRowView } from '../../../headless/utils/workQueueTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconArrowDown, IconArrowUp, IconClose, IconPlus } from '../../icons'

export type QueuePanelProps = {
  queue: Pick<UseWorkQueue, 'view' | 'loading' | 'error' | 'moveUp' | 'moveDown' | 'remove' | 'add'>
  candidates?: readonly WorkQueueCandidate[]
  onOpen?: (row: WorkQueueRowView) => void
}

/** Native peer of the web `QueuePanel`. */
export default function QueuePanel({ queue, candidates = [], onOpen }: QueuePanelProps) {
  const { theme, status } = useNativeTheme()
  const [adding, setAdding] = useState(false)
  const view = queue.view
  const queued = new Set(view?.rows.map((r) => r.key) ?? [])
  const addable = candidates.filter((c) => !queued.has(workQueueEntryKey(c.entry)))
  const caption = {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: theme.text.secondary,
  }
  const small = { fontSize: 12, color: theme.text.secondary }
  const iconButton = (
    label: string,
    disabled: boolean,
    onPress: () => void,
    icon: React.ReactNode,
  ) => (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{ padding: 6, opacity: disabled ? 0.35 : 1 }}
    >
      {icon}
    </Pressable>
  )
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={caption}>{WORK_QUEUE_COPY.title}</Text>
        {view?.capLine ? <Text style={small}>{view.capLine}</Text> : null}
        {view?.waitingLine ? <Text style={small}>· {view.waitingLine}</Text> : null}
        {candidates.length > 0 ? (
          <Pressable
            accessibilityLabel={WORK_QUEUE_COPY.add}
            accessibilityRole="button"
            accessibilityState={{ expanded: adding }}
            onPress={() => setAdding((open) => !open)}
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <IconPlus size={14} color={theme.text.primary} />
            <Text style={{ fontSize: 12, color: theme.text.primary }}>{WORK_QUEUE_COPY.add}</Text>
          </Pressable>
        ) : null}
      </View>
      {view?.capReached ? (
        <Text style={{ fontSize: 12, color: status.on_hold.softFg }}>
          {WORK_QUEUE_COPY.capReached}
        </Text>
      ) : null}
      {queue.error ? (
        <Text style={{ fontSize: 12, color: status.stuck.fg }}>{queue.error}</Text>
      ) : null}
      {adding ? (
        <View
          style={{ borderWidth: 1, borderColor: theme.border.subtle, borderRadius: 8 }}
          accessibilityLabel={WORK_QUEUE_COPY.addPick}
        >
          {addable.map((candidate) => (
            <Pressable
              key={workQueueEntryKey(candidate.entry)}
              accessibilityLabel={`Queue ${candidate.title}`}
              accessibilityRole="button"
              onPress={() => {
                queue.add(candidate.entry)
                setAdding(false)
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 14, color: theme.text.primary }}>{candidate.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {view && view.rows.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{WORK_QUEUE_COPY.empty}</Text>
      ) : null}
      {view && view.rows.length > 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {view.rows.map((row, i) => {
            const tone = status[row.tone]
            return (
              <View
                key={row.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: theme.surface.raised,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border.subtle,
                }}
              >
                <Pressable
                  accessibilityLabel={`Open ${row.title}`}
                  accessibilityRole="button"
                  disabled={!onOpen}
                  onPress={() => onOpen?.(row)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text
                    style={{ width: 18, textAlign: 'right', fontSize: 12, color: theme.text.muted }}
                  >
                    {row.index + 1}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                    >
                      {row.title}
                    </Text>
                    <Text numberOfLines={1} style={small}>
                      {row.where}
                      {row.skipsPlanning ? ` · ${WORK_QUEUE_COPY.skipsPlanning}` : ''}
                    </Text>
                    {row.detail ? (
                      <Text numberOfLines={1} style={small}>
                        {row.detail}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={{
                      borderWidth: 1,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      backgroundColor: tone.softBg,
                      borderColor: tone.softBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        lineHeight: 18,
                        color: tone.softFg,
                      }}
                    >
                      {row.stateLabel}
                    </Text>
                  </View>
                </Pressable>
                {iconButton(
                  WORK_QUEUE_COPY.moveUp,
                  !row.canMoveUp,
                  () => queue.moveUp(row.entry),
                  <IconArrowUp size={14} color={theme.text.secondary} />,
                )}
                {iconButton(
                  WORK_QUEUE_COPY.moveDown,
                  !row.canMoveDown,
                  () => queue.moveDown(row.entry),
                  <IconArrowDown size={14} color={theme.text.secondary} />,
                )}
                {iconButton(
                  WORK_QUEUE_COPY.remove,
                  false,
                  () => queue.remove(row.entry),
                  <IconClose size={14} color={theme.text.secondary} />,
                )}
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
