import { Pressable, Text, View } from 'react-native'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import type { CrossProjectWaitingView } from '../../headless/utils/crossProjectWaiting'

const AMBER = '#d97706'

export interface CrossProjectWaitingBarProps {
  /** The waiting view-model (`useCrossProjectRequests().waitingViewForChat(context)`). */
  view: CrossProjectWaitingView
  /** Open the background-tasks screen — renders a "View" affordance when provided. */
  onView?: () => void
}

/**
 * Native peer of web's `CrossProjectWaitingBar` — the read-only bar shown in place of the chat
 * composer while the chat is blocked on another project's feature request. A flagged deadlock
 * cycle (D.5) escalates it to an amber tone. Purely presentational.
 */
export function CrossProjectWaitingBar({ view, onView }: CrossProjectWaitingBarProps) {
  const { theme } = useNativeTheme()
  const cycle = view.tone === 'cycle'
  const accent = cycle ? AMBER : theme.accent.primary

  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: nativeSpace[2],
        borderTopWidth: 1,
        borderColor: cycle ? AMBER : theme.border.subtle,
        backgroundColor: cycle ? 'rgba(217,119,6,0.1)' : theme.surface.muted,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2], flexShrink: 1 }}
      >
        <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: accent }} />
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, color: cycle ? AMBER : theme.text.secondary }}
        >
          {cycle ? '⚠ ' : ''}
          {view.title}
        </Text>
      </View>
      {onView ? (
        <Pressable onPress={onView} hitSlop={6}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent.primary }}>View</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
