import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

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
  /** Slot rendered beneath the project list (e.g. a group-level chat preview). */
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
  footer,
  emptyLabel = 'This group has no projects yet.',
  missingLabel = 'Group not found.',
  isMissing = false,
  renderProjectIcon,
  className,
}: GroupHomeProps) {
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
        <Text style={{ fontSize: 14, color: nativeLightTheme.text.secondary }}>{missingLabel}</Text>
      </View>
    )
  }

  const subtitleText =
    subtitle ?? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`

  return (
    <ScrollView
      className={className}
      contentContainerStyle={{ padding: nativeSpace[8], gap: nativeSpace[6] }}
      style={{ flex: 1, backgroundColor: nativeLightTheme.surface.base }}
    >
      <View>
        {typeTag && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: nativeLightTheme.text.muted,
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
            color: nativeLightTheme.text.primary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: nativeSpace[2],
            fontSize: 14,
            color: nativeLightTheme.text.secondary,
          }}
        >
          {subtitleText}
        </Text>
      </View>

      {projects.length === 0 ? (
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>{emptyLabel}</Text>
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
                borderColor: nativeLightTheme.border.subtle,
                backgroundColor: pressed
                  ? nativeLightTheme.surface.muted
                  : nativeLightTheme.surface.raised,
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
                  style={{ fontSize: 14, fontWeight: '500', color: nativeLightTheme.text.primary }}
                >
                  {p.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: nativeLightTheme.text.muted }}
                >
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
