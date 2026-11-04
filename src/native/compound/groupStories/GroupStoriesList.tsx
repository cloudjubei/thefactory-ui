import { Fragment, useMemo, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  filterGroupStories,
  GROUP_STORY_ACTION_LABELS,
  GROUP_STORY_ALL_PROJECTS,
  GROUP_STORY_RUN_FILTER_OPTIONS,
  GROUP_STORY_SORT_OPTIONS,
  groupStoryListCount,
  groupStoryListProjects,
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryStepColumns,
  groupStoryTicketChip,
  isLiveGroupStoryRun,
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_ORDER,
  statusKey,
  type GroupStoryListFilter,
  type GroupStoryRunFilter,
  type GroupStorySorting,
  type GroupStoryView,
  type StatusPickerValue,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconArrowDown, IconArrowUp, IconBoard, IconList } from '../../icons'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import IdChip from '../chat/signoff/IdChip'
import TicketChip from '../chips/TicketChip'
import StatusControl, { STATUS_DOT_COLOR } from '../StatusControl'
import { GroupStoryChip, GroupStoryRunStatus } from './GroupStoryBits'

export type GroupStoriesListProps = {
  stories: readonly GroupStoryView[]
  /** What the tab shows — search, filters, order and layout — and how it changes. */
  filter: GroupStoryListFilter
  onFilterChange: (change: Partial<GroupStoryListFilter>) => void
  onOpenStory: (groupStoryId: string) => void
  onRun: (groupStoryId: string) => void
  onOpenRun: (groupRunId: string) => void
  onNew?: () => void
  loading?: boolean
  /** Each sprint ticket's status by key, for a row's ticket chip. */
  ticketStatuses?: Readonly<Record<string, string>>
  /** Shown under the tab's heading, above the filters: Take next ticket. */
  ticketPanel?: ReactNode
}

type RowActions = {
  onOpen: () => void
  onRun: () => void
  onOpenRun: (groupRunId: string) => void
  ticketStatuses: Readonly<Record<string, string>>
}

const NO_TICKET_STATUSES: Readonly<Record<string, string>> = {}

/**
 * Native peer of
 * [web's `GroupStoriesList`](../../../web/compound/groupStories/GroupStoriesList.tsx):
 * a group's group stories the way a project's Home lists its stories — search,
 * status, project and run filters, the order, how many show of how many, and
 * List or Board (sections by status). A row has its place in the group's
 * order, status, features done, title, its parts in the order they run, and
 * Run or its live run.
 */
export default function GroupStoriesList({
  stories,
  filter,
  onFilterChange,
  onOpenStory,
  onRun,
  onOpenRun,
  onNew,
  loading = false,
  ticketStatuses = NO_TICKET_STATUSES,
  ticketPanel,
}: GroupStoriesListProps) {
  const { theme } = useNativeTheme()
  const shown = useMemo(() => filterGroupStories(stories, filter), [stories, filter])
  const position = useMemo(() => new Map(stories.map((s, i) => [s.id, i + 1])), [stories])
  const actions = (story: GroupStoryView): RowActions => ({
    onOpen: () => onOpenStory(story.id),
    onRun: () => onRun(story.id),
    onOpenRun,
    ticketStatuses,
  })
  const note = { padding: nativeSpace[4], fontSize: 13, color: theme.text.secondary }
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>Stories</Text>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <SegmentedControl
            size="sm"
            ariaLabel="Toggle between list and board views"
            options={[
              {
                value: 'list',
                label: 'List',
                icon: <IconList size={14} color={theme.text.secondary} />,
              },
              {
                value: 'board',
                label: 'Board',
                icon: <IconBoard size={14} color={theme.text.secondary} />,
              },
            ]}
            value={filter.layout}
            onChange={(v) => onFilterChange({ layout: v === 'board' ? 'board' : 'list' })}
          />
        </View>
        {onNew ? (
          <Button size="sm" variant="primary" onPress={onNew}>
            New
          </Button>
        ) : null}
      </View>
      {ticketPanel}
      <GroupStoriesToolbar
        stories={stories}
        shown={loading ? undefined : shown.length}
        filter={filter}
        onFilterChange={onFilterChange}
      />
      {loading ? (
        <Text style={note}>Loading…</Text>
      ) : stories.length === 0 ? (
        <Text style={note}>
          No group stories yet. A group story keeps one feature’s stories across this group’s
          projects together, so they run as one.
        </Text>
      ) : shown.length === 0 ? (
        <Text style={note}>No group stories match these filters.</Text>
      ) : filter.layout === 'board' ? (
        <GroupStoriesBoard stories={shown} position={position} actions={actions} />
      ) : (
        shown.map((story) => (
          <Row key={story.id} story={story} position={position.get(story.id)} {...actions(story)} />
        ))
      )}
    </View>
  )
}

function StatusFilterRow({ color, label }: { color: string; label: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text numberOfLines={1} style={{ fontSize: 14, color: theme.text.primary }}>
        {label}
      </Text>
    </View>
  )
}

function SortOptionRow({ value, label }: { value: GroupStorySorting; label: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      {value.endsWith('_asc') ? (
        <IconArrowUp size={14} color={theme.text.secondary} />
      ) : (
        <IconArrowDown size={14} color={theme.text.secondary} />
      )}
      <Text numberOfLines={1} style={{ fontSize: 14, color: theme.text.primary }}>
        {label}
      </Text>
    </View>
  )
}

function GroupStoriesToolbar({
  stories,
  shown,
  filter,
  onFilterChange,
}: {
  stories: readonly GroupStoryView[]
  shown: number | undefined
  filter: GroupStoryListFilter
  onFilterChange: (change: Partial<GroupStoryListFilter>) => void
}) {
  const { theme } = useNativeTheme()
  const projects = useMemo(() => groupStoryListProjects(stories), [stories])
  return (
    <View
      style={{
        gap: nativeSpace[2],
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      <Input
        size="sm"
        value={filter.query}
        onChangeText={(query) => onFilterChange({ query })}
        placeholder="Search by number, title, project or story"
        accessibilityLabel="Search group stories"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
        <View style={{ flex: 1 }}>
          <Select
            value={filter.status}
            onValueChange={(v) => onFilterChange({ status: v as StatusPickerValue })}
          >
            <SelectTrigger size="sm" accessibilityLabel="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <StatusFilterRow color={STATUS_DOT_COLOR.queued} label="All" />
              </SelectItem>
              <SelectItem value="not-done">
                <StatusFilterRow color={STATUS_DOT_COLOR.queued} label="Not done" />
              </SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <StatusFilterRow
                    color={STATUS_DOT_COLOR[statusKey(o.value)]}
                    label={STATUS_LABELS[o.value]}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <View style={{ flex: 1 }}>
          <Select
            value={filter.projectId ?? ''}
            onValueChange={(v) => onFilterChange({ projectId: v === '' ? undefined : v })}
          >
            <SelectTrigger size="sm" accessibilityLabel="Filter by project">
              <SelectValue placeholder={GROUP_STORY_ALL_PROJECTS} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{GROUP_STORY_ALL_PROJECTS}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
        <View style={{ flex: 1 }}>
          <Select
            value={filter.run}
            onValueChange={(v) => onFilterChange({ run: v as GroupStoryRunFilter })}
          >
            <SelectTrigger size="sm" accessibilityLabel="Filter by run">
              <SelectValue placeholder="Run" />
            </SelectTrigger>
            <SelectContent>
              {GROUP_STORY_RUN_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <View style={{ flex: 1 }}>
          <Select
            value={filter.sortBy}
            onValueChange={(v) => onFilterChange({ sortBy: v as GroupStorySorting })}
          >
            <SelectTrigger size="sm" accessibilityLabel="Sort by">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {GROUP_STORY_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <SortOptionRow value={o.value} label={o.label} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={{ paddingTop: 2, fontSize: 12, color: theme.text.muted }}
      >
        {shown === undefined ? '' : groupStoryListCount(shown, stories.length)}
      </Text>
    </View>
  )
}

function GroupStoryParts({
  story,
  ticketStatuses,
}: {
  story: GroupStoryView
  ticketStatuses: Readonly<Record<string, string>>
}) {
  const { theme } = useNativeTheme()
  const { columns, looping } = groupStoryStepColumns(story)
  const ticket = groupStoryTicketChip(story, ticketStatuses)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {ticket ? <TicketChip view={ticket} /> : null}
      {columns.map((column, i) => (
        <Fragment key={column.step}>
          {i > 0 ? <Text style={{ fontSize: 11, color: theme.text.muted }}>→</Text> : null}
          {column.parts.map((part) => (
            <GroupStoryChip key={part.projectId} label={part.projectTitle} />
          ))}
        </Fragment>
      ))}
      {looping.map((part) => (
        <GroupStoryChip key={part.projectId} label={part.projectTitle} tone="missing" />
      ))}
    </View>
  )
}

function GroupStoryRunAction({
  story,
  onRun,
  onOpenRun,
}: { story: GroupStoryView } & Pick<RowActions, 'onRun' | 'onOpenRun'>) {
  const blocked = groupStoryRunBlockedReason(story)
  if (isLiveGroupStoryRun(story.latestRun) && story.latestRun) {
    return <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
  }
  return (
    <Button
      size="sm"
      variant="run"
      disabled={blocked !== undefined}
      accessibilityLabel={blocked ?? GROUP_STORY_ACTION_LABELS.run}
      onPress={onRun}
    >
      Run
    </Button>
  )
}

function Row({
  story,
  position,
  onOpen,
  onRun,
  onOpenRun,
  ticketStatuses,
}: { story: GroupStoryView; position: number | undefined } & RowActions) {
  const { theme } = useNativeTheme()
  const progress = groupStoryProgress(story)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${progress.text}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[3],
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.hover : 'transparent',
      })}
    >
      <View style={{ alignItems: 'center', gap: 6 }}>
        {position !== undefined ? <IdChip kind="story">{position}</IdChip> : null}
        <StatusControl status={story.status ?? 'pending'} />
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{progress.text}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: nativeSpace[2] }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
        >
          {story.title}
        </Text>
        <GroupStoryParts story={story} ticketStatuses={ticketStatuses} />
      </View>
      <GroupStoryRunAction story={story} onRun={onRun} onOpenRun={onOpenRun} />
    </Pressable>
  )
}

function GroupStoriesBoard({
  stories,
  position,
  actions,
}: {
  stories: readonly GroupStoryView[]
  position: ReadonlyMap<string, number>
  actions: (story: GroupStoryView) => RowActions
}) {
  const { theme } = useNativeTheme()
  const sections = STATUS_ORDER.map((status) => ({
    status,
    stories: stories.filter((s) => (s.status ?? 'pending') === status),
  }))
  return (
    <View style={{ gap: nativeSpace[3], padding: nativeSpace[3] }}>
      {sections.map((section) => (
        <View
          key={section.status}
          accessibilityLabel={`${STATUS_LABELS[section.status]} section`}
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[3],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[2],
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            <StatusControl status={section.status} />
            <Text style={{ fontSize: 12, color: theme.text.muted, fontVariant: ['tabular-nums'] }}>
              {section.stories.length}
            </Text>
          </View>
          {section.stories.length === 0 ? (
            <Text style={{ padding: nativeSpace[2], fontSize: 12, color: theme.text.muted }}>
              No group stories
            </Text>
          ) : (
            <View style={{ gap: 6, padding: nativeSpace[2] }}>
              {section.stories.map((story) => (
                <Card
                  key={story.id}
                  story={story}
                  position={position.get(story.id)}
                  {...actions(story)}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

function Card({
  story,
  position,
  onOpen,
  onRun,
  onOpenRun,
  ticketStatuses,
}: { story: GroupStoryView; position: number | undefined } & RowActions) {
  const { theme } = useNativeTheme()
  const progress = groupStoryProgress(story)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${progress.text}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}>
        {position !== undefined ? <IdChip kind="story">{position}</IdChip> : null}
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {story.title}
        </Text>
      </View>
      <GroupStoryParts story={story} ticketStatuses={ticketStatuses} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[2],
        }}
      >
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{progress.text}</Text>
        <GroupStoryRunAction story={story} onRun={onRun} onOpenRun={onOpenRun} />
      </View>
    </Pressable>
  )
}
