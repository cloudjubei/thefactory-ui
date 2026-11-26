import { Pressable, Text, View } from 'react-native'
import { GROUP_STATUS_COPY, type GroupRunRow, type GroupSharedRunRow } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ProjectChip from '../chips/ProjectChip'
import ToneBadge from '../chips/ToneBadge'

export interface GroupRunsListProps {
  runs: readonly GroupRunRow[]
  /** The runs that belong to the group itself or to several of its members. */
  shared?: readonly GroupSharedRunRow[]
  nameOf: (projectId: string) => string
  onSelect?: (groupRunId: string) => void
  /** A shared run was selected: it opens as its home project's run. */
  onSelectRun?: (runId: string, projectId: string) => void
}

/** What runs for the group as a whole, once each. Native peer of web's `GroupRunsList`. */
export default function GroupRunsList({
  runs,
  shared = [],
  nameOf,
  onSelect,
  onSelectRun,
}: GroupRunsListProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
        {GROUP_STATUS_COPY.groupRuns}
      </Text>
      {runs.map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          accessibilityLabel={`${run.title} · ${run.label}`}
          onPress={() => onSelect?.(run.id)}
          style={({ pressed }) => ({
            gap: nativeSpace[1],
            padding: nativeSpace[4],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
            >
              {run.title}
            </Text>
            <ToneBadge tone={run.tone} label={run.label} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.muted }}>
            {run.projectIds.map(nameOf).join(' · ')}
          </Text>
        </Pressable>
      ))}
      {shared.map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          accessibilityLabel={`${run.title} · ${run.line}`}
          onPress={() => onSelectRun?.(run.id, run.projectId)}
          style={({ pressed }) => ({
            gap: nativeSpace[2],
            padding: nativeSpace[4],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
            >
              {run.title}
            </Text>
            <ToneBadge tone={run.tone} label={run.label} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.secondary }}>
            {run.line}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {run.projectIds.map((projectId) => (
              <ProjectChip key={projectId} label={nameOf(projectId)} nonActionable />
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  )
}
