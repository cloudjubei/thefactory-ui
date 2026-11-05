import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Path, Polygon } from 'react-native-svg'
import {
  GROUP_CONSTELLATION_COPY,
  GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  GROUP_CONSTELLATION_FALLBACK_WIDTH,
  GROUP_CONSTELLATION_NODE,
  GROUP_MEMBER_ATTENTION_TONE,
  groupConstellationLinks,
  groupConstellationMap,
  type GroupConstellationLayout,
  type GroupConstellationLink,
  type GroupMemberAttention,
  type ProjectsGroupConstellation,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ProjectChip from '../chips/ProjectChip'

export interface GroupConstellationProps {
  constellation: ProjectsGroupConstellation
  layout?: GroupConstellationLayout
  nameOf: (projectId: string) => string
  /** What a project wants from the person, which its box's dot says. */
  attentionOf?: (projectId: string) => GroupMemberAttention | undefined
  onSelectProject: (projectId: string) => void
}

function Links({
  title,
  links,
  nameOf,
  onSelectProject,
}: {
  title: string
  links: readonly GroupConstellationLink[]
  nameOf: (projectId: string) => string
  onSelectProject: (projectId: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{title}</Text>
      {links.length === 0 ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {GROUP_CONSTELLATION_COPY.nothing}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        {links.map((link) => (
          <View
            key={link.projectId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}
          >
            <ProjectChip
              label={nameOf(link.projectId)}
              onPress={() => onSelectProject(link.projectId)}
            />
            <Text style={{ fontSize: 10.5, color: theme.text.muted }}>{link.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function LinksList({
  constellation,
  nameOf,
  onSelectProject,
}: Pick<GroupConstellationProps, 'constellation' | 'nameOf' | 'onSelectProject'>) {
  const { theme } = useNativeTheme()
  const rows = useMemo(() => groupConstellationLinks(constellation), [constellation])
  return (
    <View style={{ gap: nativeSpace[6] }}>
      {rows.map((row) => (
        <View key={row.projectId} style={{ gap: nativeSpace[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
              {nameOf(row.projectId)}
            </Text>
            {row.note ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.note}</Text>
            ) : null}
          </View>
          <Links
            title={GROUP_CONSTELLATION_COPY.dependsOn}
            links={row.dependsOn}
            nameOf={nameOf}
            onSelectProject={onSelectProject}
          />
          <Links
            title={GROUP_CONSTELLATION_COPY.usedBy}
            links={row.usedBy}
            nameOf={nameOf}
            onSelectProject={onSelectProject}
          />
        </View>
      ))}
    </View>
  )
}

function ConstellationMap({
  constellation,
  layout,
  nameOf,
  attentionOf,
  onSelectProject,
}: GroupConstellationProps & { layout: Exclude<GroupConstellationLayout, 'list'> }) {
  const { theme, status } = useNativeTheme()
  const [width, setWidth] = useState(GROUP_CONSTELLATION_FALLBACK_WIDTH)
  const map = useMemo(
    () => groupConstellationMap(constellation, layout, width),
    [constellation, layout, width],
  )
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: map.width, height: map.height }}>
          <Svg
            width={map.width}
            height={map.height}
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            {map.edges.map((edge) => (
              <Path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke={theme.text.muted}
                strokeWidth={1}
                {...(edge.dashed ? { strokeDasharray: '4 3' } : {})}
              />
            ))}
            {map.edges.map((edge) => (
              <Polygon
                key={`${edge.id}-arrow`}
                points={edge.arrow.map((point) => `${point.x},${point.y}`).join(' ')}
                fill={theme.text.muted}
              />
            ))}
          </Svg>
          {map.nodes.map((node) => {
            const attention = attentionOf?.(node.projectId) ?? 'quiet'
            return (
              <Pressable
                key={node.projectId}
                accessibilityRole="button"
                accessibilityLabel={nameOf(node.projectId)}
                onPress={() => onSelectProject(node.projectId)}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: GROUP_CONSTELLATION_NODE.width,
                  height: GROUP_CONSTELLATION_NODE.height,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: nativeSpace[2],
                  paddingHorizontal: nativeSpace[3],
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.surface.raised,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: status[GROUP_MEMBER_ATTENTION_TONE[attention]].bg,
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}
                  >
                    {nameOf(node.projectId)}
                  </Text>
                  {node.note ? (
                    <Text numberOfLines={1} style={{ fontSize: 10.5, color: theme.text.muted }}>
                      {node.note}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

/** The group's cross-repo dependencies. Native peer of web's `GroupConstellation`. */
export default function GroupConstellation({
  layout = GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  ...props
}: GroupConstellationProps) {
  const { theme } = useNativeTheme()
  const { constellation } = props
  if (constellation.dependencies.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: theme.text.muted }}>{GROUP_CONSTELLATION_COPY.none}</Text>
    )
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {layout === 'list' ? (
        <LinksList {...props} />
      ) : (
        <ConstellationMap {...props} layout={layout} />
      )}
      {layout === 'list' ? null : (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {GROUP_CONSTELLATION_COPY.key}
        </Text>
      )}
    </View>
  )
}
