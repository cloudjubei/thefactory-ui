import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  GROUP_HOME_DEFAULT_LAYOUT,
  GROUP_STATUS_COPY,
  type GroupHomeLayout,
  type GroupMemberView,
  type GroupStatusView,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import GroupMemberCard from './groupHome/GroupMemberCard'
import GroupMemberRow from './groupHome/GroupMemberRow'
import GroupRunsList from './groupHome/GroupRunsList'
import GroupStatusBadges from './groupHome/GroupStatusBadges'

export interface GroupHomeProjectCard {
  id: string
  title: string
  description?: string
  iconKey?: string
}

export interface GroupHomeProps {
  title: string
  /** Optional subtype tag rendered above the title (e.g. `MAIN`/`SCOPE`). */
  typeTag?: string
  /** Optional one-line subtitle (defaults to `<N> projects`). */
  subtitle?: string
  projects: ReadonlyArray<GroupHomeProjectCard>
  onSelectProject: (project: GroupHomeProjectCard) => void
  /** The group's status for this render. Left out, the projects are plain cards. */
  view?: GroupStatusView
  /** How the status arranges its members. */
  layout?: GroupHomeLayout
  /** Why the status is not shown yet, or could not be read. */
  statusNote?: string
  /** A run listed on a member was selected. */
  onSelectRun?: (runId: string, projectId: string) => void
  /** A group run was selected. */
  onSelectGroupRun?: (groupRunId: string) => void
  /** Slot rendered beneath the project list (e.g. the dependency map, a group-level chat preview). */
  footer?: ReactNode
  emptyLabel?: string
  missingLabel?: string
  /** When true, render the "no group" message instead of the list. */
  isMissing?: boolean
  /** Optional renderer for the project icon. Falls back to a generic glyph. */
  renderProjectIcon?: (iconKey: string) => ReactNode
  className?: string
}

export default function GroupHome({
  title,
  typeTag,
  subtitle,
  projects,
  onSelectProject,
  view,
  layout = GROUP_HOME_DEFAULT_LAYOUT,
  statusNote,
  onSelectRun,
  onSelectGroupRun,
  footer,
  emptyLabel = 'This group has no projects yet.',
  missingLabel = 'Group not found.',
  isMissing = false,
  renderProjectIcon,
  className,
}: GroupHomeProps) {
  const { theme } = useNativeTheme()
  if (isMissing) {
    return (
      <View
        className={className}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: nativeSpace[8],
          gap: nativeSpace[3],
        }}
      >
        <Text style={{ fontSize: 24 }}>⚠</Text>
        <Text style={{ fontSize: 14, color: theme.text.secondary }}>{missingLabel}</Text>
      </View>
    )
  }

  const subtitleText =
    subtitle ?? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`

  const projectOf = (projectId: string) => projects.find((p) => p.id === projectId)
  const titleOf = (projectId: string) => projectOf(projectId)?.title ?? projectId
  const select = (projectId: string) =>
    onSelectProject(projectOf(projectId) ?? { id: projectId, title: projectId })
  const iconOf = (projectId: string) =>
    renderProjectIcon ? (
      renderProjectIcon(projectOf(projectId)?.iconKey ?? 'folder')
    ) : (
      <Text style={{ fontSize: 18 }}>📁</Text>
    )
  const memberCards = (members: readonly GroupMemberView[]) => (
    <View style={{ gap: nativeSpace[6] }}>
      {members.map((member) => (
        <GroupMemberCard
          key={member.projectId}
          title={titleOf(member.projectId)}
          icon={iconOf(member.projectId)}
          member={member}
          onSelect={() => select(member.projectId)}
          {...(onSelectRun ? { onSelectRun } : {})}
        />
      ))}
    </View>
  )

  return (
    <ScrollView
      className={className}
      contentContainerStyle={{ padding: nativeSpace[8], gap: nativeSpace[6] }}
      style={{ flex: 1, backgroundColor: theme.surface.base }}
    >
      <View>
        {typeTag && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {typeTag}
          </Text>
        )}
        <Text
          style={{
            marginTop: 4,
            fontSize: 24,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: nativeSpace[2],
            fontSize: 14,
            color: theme.text.secondary,
          }}
        >
          {subtitleText}
        </Text>
        {statusNote ? (
          <Text style={{ marginTop: nativeSpace[2], fontSize: 13, color: theme.text.muted }}>
            {statusNote}
          </Text>
        ) : null}
        {view ? (
          <View
            style={{
              marginTop: nativeSpace[3],
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: nativeSpace[2],
            }}
          >
            {view.headline.length > 0 ? (
              <GroupStatusBadges badges={view.headline} />
            ) : (
              <Text style={{ fontSize: 13, color: theme.text.muted }}>
                {GROUP_STATUS_COPY.allQuiet}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {view && view.groupRuns.length > 0 ? (
        <GroupRunsList
          runs={view.groupRuns}
          nameOf={titleOf}
          {...(onSelectGroupRun ? { onSelect: onSelectGroupRun } : {})}
        />
      ) : null}

      {projects.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.text.muted }}>{emptyLabel}</Text>
      ) : view && layout === 'table' ? (
        <View>
          {view.members.map((member) => (
            <GroupMemberRow
              key={member.projectId}
              title={titleOf(member.projectId)}
              icon={iconOf(member.projectId)}
              member={member}
              onSelect={() => select(member.projectId)}
            />
          ))}
        </View>
      ) : view && layout === 'cards' ? (
        memberCards(view.members)
      ) : view ? (
        <View style={{ gap: nativeSpace[8] }}>
          {view.sections.map((section) => (
            <View key={section.id} style={{ gap: nativeSpace[3] }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
                {section.label}
              </Text>
              {memberCards(section.members)}
            </View>
          ))}
        </View>
      ) : (
        // Card grid spacing mirrors web's `gap-4` (16px between cards), with
        // each card matching `p-4 gap-3 rounded-lg` exactly. Keep these in
        // lockstep with `src/web/compound/GroupHome.tsx` so the same
        // user-picked project icon sits in the same-sized card across clients.
        <View style={{ gap: nativeSpace[8] }}>
          {projects.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={p.title}
              onPress={() => onSelectProject(p)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: nativeSpace[6],
                padding: nativeSpace[8],
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
              })}
            >
              <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                {renderProjectIcon ? (
                  renderProjectIcon(p.iconKey ?? 'folder')
                ) : (
                  <Text style={{ fontSize: 20 }}>📁</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                >
                  {p.title}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.muted }}>
                  {p.description ?? p.id}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {footer}
    </ScrollView>
  )
}
