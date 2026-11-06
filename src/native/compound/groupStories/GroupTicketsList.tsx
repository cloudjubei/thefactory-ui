import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  GROUP_TICKETS_DEFAULT_LAYOUT,
  GROUP_TICKETS_TEXT,
  type GroupTicketListName,
  type GroupTicketRow,
  type GroupTicketSectionView,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import TicketChip from '../chips/TicketChip'
import { GroupStoryChip, GroupStoryStoryChip } from './GroupStoryBits'

type TicketActions = {
  onDiscuss: (ticketKey: string) => void
  onPlan: (ticketKey: string) => void
  onOpenStory: (groupStoryId: string) => void
}

export type GroupTicketsListProps = TicketActions & {
  view: GroupTicketsView
  query: string
  onQueryChange: (query: string) => void
  onOpenSettings: () => void
  onRetry: () => void
  onLoadMore: (name: GroupTicketListName) => void
  layout?: GroupTicketsLayout
  shownFirst?: GroupTicketsShown
}

type Listed = Extract<GroupTicketsView, { kind: 'tickets' }>

const ROW_MIN_HEIGHT = 44

/**
 * Native peer of
 * [web's `GroupTicketsList`](../../../web/compound/groupStories/GroupTicketsList.tsx):
 * the person's tickets first, the next one on top of them, the rest of the sprint,
 * and a search. Pressing a row opens its discussion; only a ticket that can be taken
 * offers Take ticket. A phone has no room for two columns, so Side by side stacks.
 */
export default function GroupTicketsList({
  view,
  query,
  onQueryChange,
  onOpenSettings,
  onRetry,
  onLoadMore,
  layout = GROUP_TICKETS_DEFAULT_LAYOUT,
  shownFirst = 'mine',
  ...actions
}: GroupTicketsListProps) {
  const { theme } = useNativeTheme()
  const [shown, setShown] = useState(shownFirst)
  const note = { fontSize: 13, color: theme.text.secondary }

  if (view.kind === 'loading') {
    return <Text style={[note, { padding: nativeSpace[3] }]}>{GROUP_TICKETS_TEXT.loading}</Text>
  }
  if (view.kind === 'no-jira') {
    return (
      <View style={{ gap: nativeSpace[2], padding: nativeSpace[3], alignItems: 'flex-start' }}>
        <Text style={note}>{GROUP_TICKETS_TEXT.noJira}</Text>
        <Button size="sm" variant="link" onPress={onOpenSettings}>
          {GROUP_TICKETS_TEXT.connectJira}
        </Button>
      </View>
    )
  }

  const segmented = layout === 'segmented'
  const list = { starting: view.starting, onRetry, ...actions }
  const yours = (
    <TicketSection
      {...list}
      heading={segmented ? undefined : GROUP_TICKETS_TEXT.yours}
      section={view.mine}
      top={view.next ? <NextTicket row={view.next} starting={view.starting} {...actions} /> : null}
      onLoadMore={() => onLoadMore('mine')}
    />
  )
  const others = (
    <TicketSection
      {...list}
      heading={segmented ? undefined : GROUP_TICKETS_TEXT.others}
      section={view.others}
      onLoadMore={() => onLoadMore('sprint')}
    />
  )

  return (
    <View style={{ gap: nativeSpace[3], padding: nativeSpace[3] }}>
      <Input
        accessibilityLabel={GROUP_TICKETS_TEXT.search}
        placeholder={GROUP_TICKETS_TEXT.searchHint}
        value={query}
        onChangeText={onQueryChange}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {view.readError ? <ReadFailed error={view.readError} onRetry={onRetry} /> : null}
      {view.startError ? <Alert variant="error">{view.startError}</Alert> : null}
      {view.search ? (
        <TicketSection
          {...list}
          heading={GROUP_TICKETS_TEXT.results}
          section={view.search}
          loadingLine={GROUP_TICKETS_TEXT.searching}
          onLoadMore={() => onLoadMore('search')}
        />
      ) : segmented ? (
        <>
          <SegmentedControl
            ariaLabel={GROUP_TICKETS_TEXT.heading}
            size="sm"
            value={shown}
            onChange={(next) => setShown(next === 'others' ? 'others' : 'mine')}
            options={[
              {
                value: 'mine',
                label: GROUP_TICKETS_TEXT.yours,
                badge: <Count of={view} shown="mine" selected={shown === 'mine'} />,
              },
              {
                value: 'others',
                label: GROUP_TICKETS_TEXT.othersShort,
                badge: <Count of={view} shown="others" selected={shown === 'others'} />,
              },
            ]}
          />
          {shown === 'mine' ? yours : others}
        </>
      ) : (
        <>
          {yours}
          {others}
        </>
      )}
    </View>
  )
}

function Count({
  of: view,
  shown,
  selected,
}: {
  of: Listed
  shown: GroupTicketsShown
  selected: boolean
}) {
  const { theme } = useNativeTheme()
  const total =
    shown === 'mine' ? view.mine.rows.length + (view.next ? 1 : 0) : view.others.rows.length
  if (total === 0) return null
  return (
    <Text style={{ fontSize: 12, color: selected ? theme.text.inverted : theme.text.muted }}>
      {total}
    </Text>
  )
}

function ReadFailed({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Alert variant="error">{error}</Alert>
      <View style={{ alignItems: 'flex-start' }}>
        <Button size="sm" variant="secondary" onPress={onRetry}>
          {GROUP_TICKETS_TEXT.tryAgain}
        </Button>
      </View>
    </View>
  )
}

function TicketSection({
  heading,
  section,
  top,
  loadingLine = GROUP_TICKETS_TEXT.loading,
  starting,
  onRetry,
  onLoadMore,
  ...actions
}: TicketActions & {
  heading?: string | undefined
  section: GroupTicketSectionView
  top?: ReactNode
  loadingLine?: string
  starting: boolean
  onRetry: () => void
  onLoadMore: () => void
}) {
  const { theme } = useNativeTheme()
  const note = { fontSize: 13, color: theme.text.secondary }
  const hasCard = Boolean(top) || section.rows.length > 0
  const hasWords = section.loading || section.emptyLine || section.readError
  if (!hasCard && !hasWords) return null
  return (
    <View accessibilityLabel={heading} style={{ gap: nativeSpace[2] }}>
      {heading ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
            {heading}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{section.line}</Text>
        </View>
      ) : null}
      {section.readError ? <ReadFailed error={section.readError} onRetry={onRetry} /> : null}
      {hasCard ? (
        <View
          style={{
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            overflow: 'hidden',
          }}
        >
          {top}
          {section.rows.map((row, index) => (
            <TicketRow
              key={row.key}
              row={row}
              starting={starting}
              divided={index > 0 || Boolean(top)}
              {...actions}
            />
          ))}
          {section.canLoadMore ? (
            <View
              style={{
                alignItems: 'flex-start',
                padding: nativeSpace[2],
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
              }}
            >
              <Button size="sm" variant="ghost" loading={section.loadingMore} onPress={onLoadMore}>
                {GROUP_TICKETS_TEXT.showMore}
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}
      {section.loading ? <Text style={note}>{loadingLine}</Text> : null}
      {section.emptyLine ? <Text style={note}>{section.emptyLine}</Text> : null}
    </View>
  )
}

function RowButtons({
  row,
  starting,
  onDiscuss,
  onPlan,
}: Pick<TicketActions, 'onDiscuss' | 'onPlan'> & {
  row: GroupTicketRow
  starting: boolean
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        marginLeft: 'auto',
      }}
    >
      <Button
        size="sm"
        variant="secondary"
        loading={row.starting === 'discuss'}
        disabled={starting}
        onPress={() => onDiscuss(row.key)}
      >
        {row.starting === 'discuss' ? GROUP_TICKETS_TEXT.opening : GROUP_TICKETS_TEXT.discuss}
      </Button>
      {row.canTake ? (
        <Button
          size="sm"
          variant="primary"
          loading={row.starting === 'plan'}
          disabled={starting}
          onPress={() => onPlan(row.key)}
        >
          {row.starting === 'plan' ? GROUP_TICKETS_TEXT.starting : GROUP_TICKETS_TEXT.take}
        </Button>
      ) : null}
    </View>
  )
}

function NextTicket({
  row,
  starting,
  onDiscuss,
  onPlan,
}: Omit<TicketActions, 'onOpenStory'> & { row: GroupTicketRow; starting: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.key}, ${row.summary}. ${row.hint}`}
      accessibilityState={{ disabled: starting }}
      disabled={starting}
      onPress={() => onDiscuss(row.key)}
      style={({ pressed }) => ({
        gap: nativeSpace[2],
        padding: nativeSpace[3],
        backgroundColor: pressed ? theme.surface.hover : theme.accent.softBg,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {GROUP_TICKETS_TEXT.next}
        </Text>
        <TicketChip view={row.chip} />
        {row.priority ? <GroupStoryChip label={row.priority} /> : null}
        {row.chatOpen ? <GroupStoryChip label={GROUP_TICKETS_TEXT.chatOpen} /> : null}
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
        {row.summary}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{GROUP_TICKETS_TEXT.explain}</Text>
      <RowButtons row={row} starting={starting} onDiscuss={onDiscuss} onPlan={onPlan} />
    </Pressable>
  )
}

function TicketRow({
  row,
  starting,
  divided,
  onDiscuss,
  onPlan,
  onOpenStory,
}: TicketActions & { row: GroupTicketRow; starting: boolean; divided: boolean }) {
  const { theme } = useNativeTheme()
  const { work } = row
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.key}, ${row.summary}. ${row.hint}`}
      accessibilityState={{ disabled: starting }}
      disabled={starting}
      onPress={() => onDiscuss(row.key)}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        gap: 6,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        ...(divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
        opacity: starting ? 0.7 : 1,
        backgroundColor: pressed ? theme.surface.hover : 'transparent',
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        <TicketChip view={row.chip} />
        {row.priority ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.priority}</Text>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.primary }}>
        {row.summary}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        {work ? (
          <GroupStoryStoryChip title={work.title} onOpen={() => onOpenStory(work.id)} />
        ) : null}
        {row.chatOpen ? <GroupStoryChip label={GROUP_TICKETS_TEXT.chatOpen} /> : null}
        {!work && !row.chatOpen ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{GROUP_TICKETS_TEXT.noWork}</Text>
        ) : null}
        <RowButtons row={row} starting={starting} onDiscuss={onDiscuss} onPlan={onPlan} />
      </View>
    </Pressable>
  )
}
