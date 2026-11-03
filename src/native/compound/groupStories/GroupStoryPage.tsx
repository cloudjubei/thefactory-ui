import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  GROUP_STORY_ACTION_LABELS,
  GROUP_STORY_PAGE_LABELS,
  groupStoryNeedTitles,
  groupStoryPartsText,
  groupStoryRunButton,
  groupStoryStepColumns,
  markdownSectionKeys,
  markdownSections,
  markdownSummaryLine,
  statusKey,
  statusLabel,
  useGroupStoryFolds,
  type GroupStoryFolds,
  type GroupStoryPartView,
  type GroupStoryView,
  type MarkdownSection,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight, IconDelete, IconEdit } from '../../icons'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import Markdown from '../Markdown'
import RunAgentButton from '../RunAgentButton'
import StatusControl, { STATUS_DOT_COLOR } from '../StatusControl'
import { GroupStoryChip, GroupStoryRunStatus, GroupStoryStoryChip } from './GroupStoryBits'

export type GroupStoryPageProps = {
  story: GroupStoryView
  onRun: () => void
  onOpenRun: (groupRunId: string) => void
  onEdit: () => void
  onDelete: () => Promise<void>
  onOpenPartStory: (projectId: string, storyId: string) => void
  /** What is open the first time this group story is shown; later visits find it as it was left. */
  initialFolds?: Partial<GroupStoryFolds>
}

const ROW_MIN_HEIGHT = 44

/**
 * Native peer of
 * [web's `GroupStoryPage`](../../../web/compound/groupStories/GroupStoryPage.tsx):
 * the title on its own lines, then its status and Run, Edit and Delete as the
 * icon buttons of a story (the Parts heading counts the parts); then its Parts by step and its Overview, the
 * description folded at its headings — edge-to-edge sections that fold to one
 * line, every heading a full-width touch row. Back is the screen header's.
 */
export default function GroupStoryPage({
  story,
  onRun,
  onOpenRun,
  onEdit,
  onDelete,
  onOpenPartStory,
  initialFolds,
}: GroupStoryPageProps) {
  const { theme, status } = useNativeTheme()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { folds, toggleParts, toggleOverview, toggleSection, setSections } = useGroupStoryFolds(
    story.id,
    initialFolds,
  )
  const { columns, looping } = groupStoryStepColumns(story)
  const partsText = groupStoryPartsText(story)
  const runButton = groupStoryRunButton(story)
  const description = story.description ?? ''
  const doc = useMemo(() => markdownSections(description), [description])
  const sectionKeys = markdownSectionKeys(doc.sections)
  const allOpen = sectionKeys.length > 0 && sectionKeys.every((k) => folds.sections.includes(k))

  const step = (key: string, label: string, parts: GroupStoryPartView[], stuck = false) => (
    <View key={key} style={{ gap: nativeSpace[2] }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: stuck ? status.stuck.softFg : theme.text.muted,
        }}
      >
        {label}
      </Text>
      {parts.map((part) => (
        <PartCard
          key={part.projectId}
          part={part}
          story={story}
          onOpenPartStory={onOpenPartStory}
        />
      ))}
    </View>
  )

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[6] }}>
      <View
        style={{
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <Text
          accessibilityRole="header"
          numberOfLines={3}
          style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}
        >
          {story.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <StatusControl status={story.status ?? 'pending'} />
          <View style={{ flex: 1 }} />
          {story.latestRun ? (
            <GroupStoryRunStatus run={story.latestRun} onOpen={onOpenRun} />
          ) : null}
          {runButton ? (
            <RunAgentButton
              onSelect={onRun}
              disabled={runButton.disabled}
              accessibilityLabel={runButton.label}
            />
          ) : null}
          <Button
            variant="secondary"
            size="icon"
            onPress={onEdit}
            accessibilityLabel={GROUP_STORY_ACTION_LABELS.edit}
          >
            <IconEdit size={18} />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onPress={() => setConfirmDelete(true)}
            accessibilityLabel={GROUP_STORY_ACTION_LABELS.delete}
          >
            <IconDelete size={16} />
          </Button>
        </View>
        {runButton?.disabled ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{runButton.label}</Text>
        ) : null}
      </View>

      {story.problems.length > 0 ? (
        <View
          accessibilityRole="alert"
          style={{
            gap: 4,
            margin: nativeSpace[3],
            padding: nativeSpace[3],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            backgroundColor: status.stuck.softBg,
            borderColor: status.stuck.softBorder,
          }}
        >
          {story.problems.map((p) => (
            <Text key={p} style={{ fontSize: 12.5, color: status.stuck.softFg }}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}

      <FoldPanel
        title={GROUP_STORY_PAGE_LABELS.parts}
        meta={partsText}
        open={folds.parts}
        onToggle={toggleParts}
        folded={<PartsLine columns={columns} looping={looping} />}
      >
        <View style={{ gap: nativeSpace[4] }}>
          {columns.map((column) =>
            step(
              String(column.step),
              column.parts.length > 1
                ? `Step ${column.step} · side by side`
                : `Step ${column.step}`,
              column.parts,
            ),
          )}
          {looping.length > 0 ? step('looping', 'Cannot start', looping, true) : null}
        </View>
      </FoldPanel>

      {description.trim() ? (
        <FoldPanel
          title={GROUP_STORY_PAGE_LABELS.overview}
          open={folds.overview}
          onToggle={toggleOverview}
          folded={
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: theme.text.muted }}>
              {markdownSummaryLine(description)}
            </Text>
          }
          actions={
            folds.overview && sectionKeys.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setSections(allOpen ? [] : sectionKeys)}
              >
                {allOpen ? GROUP_STORY_PAGE_LABELS.collapseAll : GROUP_STORY_PAGE_LABELS.expandAll}
              </Button>
            ) : null
          }
        >
          {doc.intro ? <Markdown text={doc.intro} /> : null}
          {doc.sections.length > 0 ? (
            <View style={{ marginTop: doc.intro ? nativeSpace[2] : 0 }}>
              {doc.sections.map((section) => (
                <FoldSection
                  key={section.key}
                  section={section}
                  openKeys={folds.sections}
                  onToggle={toggleSection}
                  nested={false}
                />
              ))}
            </View>
          ) : null}
        </FoldPanel>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await onDelete()
          setConfirmDelete(false)
        }}
        title="Delete this group story?"
        description="Its part stories stay in their projects, as they are."
        confirmLabel="Delete"
        destructive
      />
    </ScrollView>
  )
}

function Chevron({ open, size = 16 }: { open: boolean; size?: number }) {
  const { theme } = useNativeTheme()
  return open ? (
    <IconChevronDown size={size} color={theme.text.muted} />
  ) : (
    <IconChevronRight size={size} color={theme.text.muted} />
  )
}

/** An edge-to-edge section that folds to its heading and one line saying what it holds. */
function FoldPanel({
  title,
  meta,
  open,
  onToggle,
  folded,
  actions,
  children,
}: {
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  folded: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        paddingHorizontal: nativeSpace[4],
        paddingBottom: nativeSpace[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={title}
          style={{
            flex: 1,
            minHeight: ROW_MIN_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[2],
          }}
        >
          <Chevron open={open} />
          <Text
            accessibilityRole="header"
            style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}
          >
            {title}
          </Text>
          {meta ? (
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}
            >
              {meta}
            </Text>
          ) : null}
        </Pressable>
        {actions}
      </View>
      {open ? children : <View style={{ paddingLeft: 24 }}>{folded}</View>}
    </View>
  )
}

/** A folded description section — a full-width touch row — opening to its text and subsections. */
function FoldSection({
  section,
  openKeys,
  onToggle,
  nested,
}: {
  section: MarkdownSection
  openKeys: readonly string[]
  onToggle: (key: string) => void
  nested: boolean
}) {
  const { theme } = useNativeTheme()
  const open = openKeys.includes(section.key)
  const summary = section.meta ? `${section.meta} · ${section.summary}` : section.summary
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        ...(nested ? { borderStyle: 'dashed' as const } : {}),
      }}
    >
      <Pressable
        onPress={() => onToggle(section.key)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          minHeight: ROW_MIN_HEIGHT,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: nativeSpace[2],
          paddingVertical: nativeSpace[2],
          backgroundColor: pressed ? theme.surface.muted : 'transparent',
        })}
      >
        <View style={{ paddingTop: 2 }}>
          <Chevron open={open} size={nested ? 14 : 16} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: nested ? 13.5 : 14.5,
              fontWeight: '600',
              color: theme.text.primary,
            }}
          >
            {section.title}
          </Text>
          {open ? null : (
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: theme.text.muted }}>
              {summary}
            </Text>
          )}
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingLeft: nested ? 18 : 22, paddingBottom: nativeSpace[3] }}>
          {section.body ? <Markdown text={section.body} /> : null}
          {section.subsections.map((sub) => (
            <FoldSection
              key={sub.key}
              section={sub}
              openKeys={openKeys}
              onToggle={onToggle}
              nested
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** The parts in the order they run: a status dot and project each, → between steps. */
function PartsLine({
  columns,
  looping,
}: {
  columns: ReturnType<typeof groupStoryStepColumns>['columns']
  looping: GroupStoryPartView[]
}) {
  const { theme, status } = useNativeTheme()
  const dot = (part: GroupStoryPartView) => (
    <View
      key={part.projectId}
      accessibilityLabel={
        part.status ? `${part.projectTitle}, ${statusLabel(part.status)}` : part.projectTitle
      }
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: part.status
            ? STATUS_DOT_COLOR[statusKey(part.status)]
            : theme.border.default,
        }}
      />
      <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{part.projectTitle}</Text>
    </View>
  )
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 10,
        rowGap: 4,
      }}
    >
      {columns.flatMap((column, i) => [
        ...(i > 0
          ? [
              <Text key={`to-${column.step}`} style={{ fontSize: 12.5, color: theme.text.muted }}>
                →
              </Text>,
            ]
          : []),
        ...column.parts.map(dot),
      ])}
      {looping.length > 0 ? (
        <Text style={{ fontSize: 12.5, color: status.stuck.softFg }}>Cannot start:</Text>
      ) : null}
      {looping.map(dot)}
    </View>
  )
}

function PartCard({
  part,
  story,
  onOpenPartStory,
}: {
  part: GroupStoryPartView
  story: GroupStoryView
  onOpenPartStory: (projectId: string, storyId: string) => void
}) {
  const { theme } = useNativeTheme()
  const needs = groupStoryNeedTitles(part, story)
  return (
    <View
      style={{
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary }}
        >
          {part.projectTitle}
        </Text>
        {part.status ? <StatusControl status={part.status} /> : null}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <GroupStoryStoryChip
          title={part.storyTitle}
          onOpen={() => onOpenPartStory(part.projectId, part.storyId)}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {part.featuresTotal === 0
            ? 'No features yet'
            : `${part.featuresDone}/${part.featuresTotal} done`}
        </Text>
        {needs.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>· Needs</Text>
            {needs.map((title) => (
              <GroupStoryChip key={title} label={title} tone="blocks" />
            ))}
          </>
        ) : null}
      </View>
    </View>
  )
}
