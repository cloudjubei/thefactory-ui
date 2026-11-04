import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  pressTicketRow,
  TAKE_NEXT_TICKET_DEFAULT_LAYOUT,
  TAKE_NEXT_TICKET_TEXT,
  type GroupTicketRow,
  type TakeNextTicketLayout,
  type TakeNextTicketView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import TicketChip from '../chips/TicketChip'
import { GroupStoryChip, GroupStoryStoryChip } from './GroupStoryBits'

export type TakeNextTicketProps = {
  view: TakeNextTicketView
  onPlan: (ticketKey: string) => void
  onOpenStory: (groupStoryId: string) => void
  onRetry: () => void
  onLoadMore: () => void
  layout?: TakeNextTicketLayout
  sprintOpen?: boolean
}

type RowHandlers = Pick<TakeNextTicketProps, 'onPlan' | 'onOpenStory'>

const ROW_MIN_HEIGHT = 44

/**
 * Native peer of
 * [web's `TakeNextTicket`](../../../web/compound/groupStories/TakeNextTicket.tsx):
 * the next ticket with no work yet, and the person's sprint in board order. A row
 * with work opens its group story; one without starts its plan. A phone has no
 * room for two columns, so Side by side stacks with the sprint open.
 */
export default function TakeNextTicket({
  view,
  onPlan,
  onOpenStory,
  onRetry,
  onLoadMore,
  layout = TAKE_NEXT_TICKET_DEFAULT_LAYOUT,
  sprintOpen = false,
}: TakeNextTicketProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(sprintOpen)
  const handlers = { onPlan, onOpenStory }
  const hasRows = view.rows.length > 0
  const folds = layout === 'card'
  const sprint = (
    <SprintRows view={view} marksNext={layout === 'list'} onLoadMore={onLoadMore} {...handlers} />
  )
  const next = view.next ? (
    <NextTicket row={view.next} planning={view.planning} onPlan={onPlan} />
  ) : view.noNextLine ? (
    <Text style={{ padding: nativeSpace[3], fontSize: 13, color: theme.text.secondary }}>
      {view.noNextLine}
    </Text>
  ) : null
  const Chevron = open ? IconChevronDown : IconChevronRight
  const sprintLabel = (
    <>
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
        {TAKE_NEXT_TICKET_TEXT.sprint}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.sprintLine}</Text>
    </>
  )

  return (
    <View
      accessibilityLabel={TAKE_NEXT_TICKET_TEXT.heading}
      style={{
        marginHorizontal: nativeSpace[3],
        marginVertical: nativeSpace[2],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      {view.readError ? (
        <View style={{ gap: nativeSpace[2], padding: nativeSpace[2] }}>
          <Alert variant="error">{view.readError}</Alert>
          <View style={{ alignItems: 'flex-start' }}>
            <Button size="sm" variant="secondary" onPress={onRetry}>
              {TAKE_NEXT_TICKET_TEXT.tryAgain}
            </Button>
          </View>
        </View>
      ) : null}
      {view.planError ? (
        <View style={{ padding: nativeSpace[2] }}>
          <Alert variant="error">{view.planError}</Alert>
        </View>
      ) : null}
      {layout === 'list' && hasRows ? sprint : next}
      {layout !== 'list' && hasRows ? (
        folds ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen((v) => !v)}
              style={({ pressed }) => ({
                minHeight: ROW_MIN_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                gap: nativeSpace[2],
                paddingHorizontal: nativeSpace[3],
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
                backgroundColor: pressed ? theme.surface.hover : 'transparent',
              })}
            >
              <Chevron size={14} color={theme.text.muted} />
              {sprintLabel}
            </Pressable>
            {open ? sprint : null}
          </>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: nativeSpace[2],
                padding: nativeSpace[3],
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
              }}
            >
              {sprintLabel}
            </View>
            {sprint}
          </>
        )
      ) : null}
    </View>
  )
}

function NextTicket({
  row,
  planning,
  onPlan,
}: {
  row: GroupTicketRow
  planning: boolean
  onPlan: (ticketKey: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2], padding: nativeSpace[3] }}>
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
          {TAKE_NEXT_TICKET_TEXT.heading}
        </Text>
        <TicketChip view={row.chip} />
        {row.priority ? <GroupStoryChip label={row.priority} /> : null}
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
        {row.summary}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted }}>{TAKE_NEXT_TICKET_TEXT.explain}</Text>
      <View style={{ alignItems: 'flex-start' }}>
        <Button
          size="sm"
          variant="primary"
          loading={row.planning}
          disabled={planning}
          onPress={() => onPlan(row.key)}
        >
          {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.take}
        </Button>
      </View>
    </View>
  )
}

function SprintRows({
  view,
  marksNext,
  onLoadMore,
  ...handlers
}: RowHandlers & {
  view: TakeNextTicketView
  marksNext: boolean
  onLoadMore: () => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View accessibilityLabel={TAKE_NEXT_TICKET_TEXT.sprint}>
      {view.rows.map((row) => (
        <SprintRow
          key={row.key}
          row={row}
          planning={view.planning}
          isNext={marksNext && row.key === view.next?.key}
          {...handlers}
        />
      ))}
      {view.canLoadMore ? (
        <View
          style={{
            alignItems: 'flex-start',
            padding: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <Button size="sm" variant="ghost" loading={view.loadingMore} onPress={onLoadMore}>
            {TAKE_NEXT_TICKET_TEXT.showMore}
          </Button>
        </View>
      ) : null}
    </View>
  )
}

function SprintRow({
  row,
  planning,
  isNext,
  onPlan,
  onOpenStory,
}: RowHandlers & { row: GroupTicketRow; planning: boolean; isNext: boolean }) {
  const { theme } = useNativeTheme()
  const { work } = row
  const inert = planning && !work
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.key}, ${row.summary}. ${row.hint}`}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={() => pressTicketRow(row, planning, { onPlan, onOpenStory })}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        gap: 6,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        opacity: inert ? 0.7 : 1,
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
        {isNext ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {TAKE_NEXT_TICKET_TEXT.next}
          </Text>
        ) : null}
        <TicketChip view={row.chip} />
        {row.priority ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.priority}</Text>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.primary }}>
        {row.summary}
      </Text>
      {work ? (
        <View style={{ alignItems: 'flex-start' }}>
          <GroupStoryStoryChip title={work.title} onOpen={() => onOpenStory(work.id)} />
        </View>
      ) : isNext ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            size="sm"
            variant="primary"
            loading={row.planning}
            disabled={planning}
            onPress={() => onPlan(row.key)}
          >
            {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.take}
          </Button>
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.noWork}
        </Text>
      )}
    </Pressable>
  )
}
