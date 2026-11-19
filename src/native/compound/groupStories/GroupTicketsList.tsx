import { useState, type ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  GROUP_TICKET_TAB_ACTION_LABELS,
  GROUP_TICKET_TAB_ROW_TEXT,
  GROUP_TICKETS_DEFAULT_LAYOUT,
  GROUP_TICKETS_TEXT,
  REVIEW_OFFER_TEXT,
  REVIEW_START_TEXT,
  type GroupTicketListName,
  type GroupTicketRow,
  type GroupTicketSectionView,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsView,
  type GroupTicketTabsLayout,
  type ReviewOfferRowView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChat, IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import ReviewTabBar from '../chat/signoff/ReviewTabBar'
import TicketChip from '../chips/TicketChip'
import { GroupStoryChip, GroupStoryStoryChip } from './GroupStoryBits'

export type TicketActions = {
  /** Open a ticket's page: what a press on its row does. */
  onOpen: (ticketKey: string) => void
  onDiscuss: (ticketKey: string) => void
  /** Take a ticket: start its plan. */
  onPlan: (ticketKey: string) => void
  /** Open the group story working a ticket: Carry on, and its chip. */
  onOpenStory: (groupStoryId: string) => void
  /** Open the paste box on a ticket; without it, Review is not offered. */
  onReview?: (ticketKey: string) => void
  /** Dismiss the update from Slack waiting on a ticket; without it, Dismiss is not offered. */
  onDismissOffer?: (ticketKey: string) => void
}

export type GroupTicketsListProps = TicketActions & {
  view: GroupTicketsView
  query: string
  onQueryChange: (query: string) => void
  /** Show another tab. */
  onPickTab: (tabId: string) => void
  onOpenSettings: () => void
  onRetry: () => void
  onLoadMore: (name: GroupTicketListName) => void
  layout?: GroupTicketsLayout
  /** Where the tabs sit; a phone always shows them as a bar on top. */
  tabsLayout?: GroupTicketTabsLayout
  shownFirst?: GroupTicketsShown
}

type Listed = Extract<GroupTicketsView, { kind: 'tickets' }>

const ROW_MIN_HEIGHT = 44

/**
 * Native peer of
 * [web's `GroupTicketsList`](../../../web/compound/groupStories/GroupTicketsList.tsx):
 * the group's tabs with their counts, and inside the tab on screen the person's
 * tickets first, the next one on top of them, then everyone else's, each row with
 * the tab's actions for its side, and a search. Pressing a row opens its page;
 * Discuss is its own button. A phone has no room for two columns, so Side by side
 * stacks, and the tabs are always a bar on top.
 */
export default function GroupTicketsList({
  view,
  query,
  onQueryChange,
  onPickTab,
  onOpenSettings,
  onRetry,
  onLoadMore,
  layout = GROUP_TICKETS_DEFAULT_LAYOUT,
  tabsLayout: _bar,
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
  if (view.kind === 'failed') {
    return (
      <View style={{ padding: nativeSpace[3] }}>
        <ReadFailed error={view.error} onRetry={onRetry} />
      </View>
    )
  }

  const segmented = layout === 'segmented'
  const list = { starting: view.starting, ...actions }
  const yours = (
    <TicketSection
      {...list}
      heading={segmented ? undefined : GROUP_TICKETS_TEXT.yours}
      section={view.mine}
      top={view.next ? <NextTicket row={view.next} starting={view.starting} {...actions} /> : null}
    />
  )
  const others = (
    <TicketSection
      {...list}
      heading={segmented ? undefined : GROUP_TICKETS_TEXT.othersShort}
      section={view.others}
    />
  )
  const sides = segmented ? (
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
      {view.startError ? <Alert variant="error">{view.startError}</Alert> : null}
      {view.offerError ? <Alert variant="error">{view.offerError}</Alert> : null}
      {view.search ? (
        <TicketSection
          {...list}
          heading={GROUP_TICKETS_TEXT.results}
          section={view.search}
          loadingLine={GROUP_TICKETS_TEXT.searching}
          onRetry={onRetry}
          onLoadMore={() => onLoadMore('search')}
        />
      ) : (
        <>
          <ReviewTabBar<string>
            ariaLabel={GROUP_TICKETS_TEXT.heading}
            tabs={view.tabs}
            active={view.tab}
            onChange={onPickTab}
          />
          {view.readError ? <ReadFailed error={view.readError} onRetry={onRetry} /> : null}
          {view.emptyLine ? (
            <Text style={note}>{view.emptyLine}</Text>
          ) : (
            <>
              {sides}
              {view.canLoadMore ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={view.loadingMore}
                    onPress={() => onLoadMore('tab')}
                  >
                    {GROUP_TICKETS_TEXT.showMore}
                  </Button>
                </View>
              ) : null}
            </>
          )}
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
  onRetry?: () => void
  onLoadMore?: () => void
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
      {section.readError && onRetry ? (
        <ReadFailed error={section.readError} onRetry={onRetry} />
      ) : null}
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
          {section.canLoadMore && onLoadMore ? (
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

/** The row's actions, as its tab offers them for its side. */
export function RowButtons({
  row,
  starting,
  onOpen,
  onDiscuss,
  onPlan,
  onOpenStory,
  onReview,
}: Pick<TicketActions, 'onOpen' | 'onDiscuss' | 'onPlan' | 'onOpenStory' | 'onReview'> & {
  row: GroupTicketRow
  starting: boolean
}) {
  const { work } = row
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: nativeSpace[2],
        marginLeft: 'auto',
      }}
    >
      {row.actions.map((action) => {
        switch (action) {
          case 'take':
            return (
              <Button
                key={action}
                size="sm"
                variant="primary"
                loading={row.starting === 'plan'}
                disabled={starting}
                onPress={() => onPlan(row.key)}
              >
                {row.starting === 'plan'
                  ? GROUP_TICKETS_TEXT.starting
                  : GROUP_TICKET_TAB_ACTION_LABELS.take}
              </Button>
            )
          case 'carry-on':
            return work ? (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                accessibilityLabel={GROUP_TICKET_TAB_ROW_TEXT.carryOnHint(work.title)}
                onPress={() => onOpenStory(work.id)}
              >
                {GROUP_TICKET_TAB_ACTION_LABELS['carry-on']}
              </Button>
            ) : null
          case 'review':
            return onReview ? (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                disabled={row.reviewing !== undefined}
                accessibilityLabel={
                  row.reviewOpen
                    ? REVIEW_START_TEXT.nextRoundOf(row.key)
                    : REVIEW_START_TEXT.reviewTicket(row.key)
                }
                onPress={() => onReview(row.key)}
              >
                {row.reviewing !== undefined ? <Spinner size={12} /> : null}
                {row.reviewing ??
                  (row.reviewOpen ? REVIEW_START_TEXT.nextRound : REVIEW_START_TEXT.review)}
              </Button>
            ) : null
          case 'approve-and-merge':
            return (
              <Button key={action} size="sm" variant="secondary" onPress={() => onOpen(row.key)}>
                {GROUP_TICKET_TAB_ACTION_LABELS['approve-and-merge']}
              </Button>
            )
          case 'discuss':
            return (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                loading={row.starting === 'discuss'}
                disabled={starting}
                onPress={() => onDiscuss(row.key)}
              >
                {row.starting === 'discuss'
                  ? GROUP_TICKETS_TEXT.opening
                  : GROUP_TICKETS_TEXT.discuss}
              </Button>
            )
          default:
            return null
        }
      })}
    </View>
  )
}

/** Replies to the person's update and comments on their pull requests, as a chip on their row. */
export function RepliesChip({ row }: { row: GroupTicketRow }) {
  const { theme } = useNativeTheme()
  const { replies } = row
  if (!replies) return null
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: replies.none ? theme.border.subtle : theme.accent.primary,
        backgroundColor: replies.none ? 'transparent' : theme.accent.softBg,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <IconChat size={12} color={replies.none ? theme.text.muted : theme.accent.primary} />
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: 12,
          color: replies.none ? theme.text.muted : theme.text.primary,
        }}
      >
        {replies.line}
        {replies.when ? ` · ${GROUP_TICKET_TAB_ROW_TEXT.latest(replies.when)}` : ''}
      </Text>
    </View>
  )
}

/** A waiting update from Slack as a line under its row: who sent it, when, its message, and Dismiss. */
function OfferStrip({
  row,
  offer,
  onDismissOffer,
}: {
  row: GroupTicketRow
  offer: ReviewOfferRowView
  onDismissOffer?: ((ticketKey: string) => void) | undefined
}) {
  const { theme } = useNativeTheme()
  const { permalink } = offer
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.accent.softBg,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 4,
      }}
    >
      <IconChat size={14} color={theme.accent.primary} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
        {offer.label}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{offer.when}</Text>
      {permalink ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={6}
          onPress={() => void Linking.openURL(permalink)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Text style={{ fontSize: 12, color: theme.accent.primary }}>
            {REVIEW_OFFER_TEXT.open}
          </Text>
          <IconExternalLink size={11} color={theme.accent.primary} />
        </Pressable>
      ) : null}
      {onDismissOffer && !offer.dismissed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={REVIEW_OFFER_TEXT.dismissHint(row.key)}
          hitSlop={8}
          onPress={() => onDismissOffer(row.key)}
          style={{ marginLeft: 'auto' }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {REVIEW_OFFER_TEXT.dismiss}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function NextTicket({
  row,
  starting,
  onDismissOffer,
  ...actions
}: TicketActions & { row: GroupTicketRow; starting: boolean }) {
  const { theme } = useNativeTheme()
  const offer =
    actions.onReview && row.reviewing === undefined && row.actions.includes('review')
      ? row.offer
      : undefined
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.key}, ${row.summary}. ${row.hint}`}
      onPress={() => actions.onOpen(row.key)}
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
        {row.reviewOpen ? <GroupStoryChip label={REVIEW_START_TEXT.reviewOpen} /> : null}
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
        {row.summary}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{GROUP_TICKETS_TEXT.explain}</Text>
      <RowButtons row={row} starting={starting} {...actions} />
      {offer ? <OfferStrip row={row} offer={offer} onDismissOffer={onDismissOffer} /> : null}
    </Pressable>
  )
}

function TicketRow({
  row,
  starting,
  divided,
  onDismissOffer,
  ...actions
}: TicketActions & { row: GroupTicketRow; starting: boolean; divided: boolean }) {
  const { theme } = useNativeTheme()
  const { work } = row
  const offer =
    actions.onReview && row.reviewing === undefined && row.actions.includes('review')
      ? row.offer
      : undefined
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.key}, ${row.summary}. ${row.hint}`}
      onPress={() => actions.onOpen(row.key)}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        gap: 6,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        ...(divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
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
          <GroupStoryStoryChip title={work.title} onOpen={() => actions.onOpenStory(work.id)} />
        ) : null}
        {row.chatOpen ? <GroupStoryChip label={GROUP_TICKETS_TEXT.chatOpen} /> : null}
        {row.reviewOpen ? <GroupStoryChip label={REVIEW_START_TEXT.reviewOpen} /> : null}
        <RepliesChip row={row} />
        {!work && !row.chatOpen && !row.reviewOpen && !row.replies ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{GROUP_TICKETS_TEXT.noWork}</Text>
        ) : null}
        <RowButtons row={row} starting={starting} {...actions} />
      </View>
      {offer ? <OfferStrip row={row} offer={offer} onDismissOffer={onDismissOffer} /> : null}
    </Pressable>
  )
}
