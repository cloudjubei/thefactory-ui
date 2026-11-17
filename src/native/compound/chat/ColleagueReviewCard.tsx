import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { useColleagueReviewCall } from '../../../headless/hooks/useColleagueReviewCall'
import {
  COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  COLLEAGUE_REVIEW_CARD_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewCardConstants'
import type {
  ColleagueReviewCardLayout,
  ColleagueReviewCardView,
  ColleagueReviewTool,
  ReviewFindingView,
  ReviewRoundView,
  ReviewWaitingOnView,
} from '../../../headless/utils/colleagueReviewCardTypes'
import { ticketChipView } from '../../../headless/utils/groupTickets'
import { ticketLinkOf } from '../../../headless/utils/ticketLinks'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import { useClipboardHost } from '../ClipboardHostContext'
import TicketChip from '../chips/TicketChip'
import TicketLinkChip from '../chips/TicketLinkChip'
import ToneBadge from '../chips/ToneBadge'
import { GroupStoryChip } from '../groupStories/GroupStoryBits'

type NoteOpen = { kind: 'drop' | 'given'; id: string }

export type ColleagueReviewCardProps = {
  view: ColleagueReviewCardView
  layout?: ColleagueReviewCardLayout
  onDrop?: (findingId: string, note?: string) => void
  onGiven?: (waitingOnId: string, note?: string) => void
  /** Start with this finding opened — for a fixed showcase state. */
  openFinding?: string
  /** Start with this note open — for a fixed showcase state. */
  noteOpen?: NoteOpen
  /** Start with the earlier rounds, or the summary's findings, opened. */
  expanded?: boolean
}

type Actions = Pick<ColleagueReviewCardProps, 'onDrop' | 'onGiven'> & {
  note: NoteOpen | undefined
  setNote: (note: NoteOpen | undefined) => void
  openFinding: string | undefined
}

type ReviewShown = Extract<ColleagueReviewCardView, { kind: 'review' }>

function Label({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

/**
 * Native peer of [web's `ColleagueReviewCard`](../../../web/compound/chat/ColleagueReviewCard.tsx):
 * a ticket's colleague review on its review chat's tool rows, read live — the
 * round with its verdict, what became of each finding, what the work waits on,
 * the reply to copy, and the person's own Drop and Given on the latest round.
 */
export default function ColleagueReviewCard({
  view,
  layout = COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  onDrop,
  onGiven,
  openFinding,
  noteOpen,
  expanded = false,
}: ColleagueReviewCardProps) {
  const { theme, status } = useNativeTheme()
  const [note, setNote] = useState<NoteOpen | undefined>(noteOpen)
  const muted = { fontSize: 13, color: theme.text.secondary }
  if (view.kind === 'loading') return <Text style={muted}>{TEXT.loading}</Text>
  if (view.kind === 'none') return <Text style={muted}>{view.line}</Text>
  if (view.kind === 'failed') {
    return <Text style={{ fontSize: 13, color: status.stuck.softFg }}>{view.line}</Text>
  }
  if (view.kind === 'refused') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: status.stuck.softFg }}>
          {view.line}
        </Text>
        {view.errors.map((error) => (
          <Text key={error} selectable style={muted}>
            {`• ${error}`}
          </Text>
        ))}
      </View>
    )
  }
  const actions: Actions = { onDrop, onGiven, note, setNote, openFinding }
  return (
    <View style={{ gap: 12 }}>
      {layout === 'rounds' ? (
        <RoundTabs view={view} actions={actions} />
      ) : layout === 'summary' ? (
        <Summary view={view} actions={actions} expanded={expanded} />
      ) : (
        <>
          <Header view={view} round={view.round} />
          <Notes view={view} />
          <RoundBody round={view.round} actions={actions} />
          <Earlier view={view} expanded={expanded} actions={actions} />
        </>
      )}
    </View>
  )
}

function TicketOf({ view }: { view: ReviewShown }) {
  const site = useTicketLinks()?.site
  const link = view.ticketUrl ? ticketLinkOf(view.ticketUrl, site) : undefined
  return link ? (
    <Text>
      <TicketLinkChip link={link} />
    </Text>
  ) : (
    <TicketChip view={ticketChipView({ key: view.ticketKey, url: view.ticketUrl })} />
  )
}

function Verdict({ round }: { round: ReviewRoundView }) {
  const { theme } = useNativeTheme()
  return round.verdictLabel && round.verdictTone ? (
    <ToneBadge tone={round.verdictTone} label={round.verdictLabel} />
  ) : (
    <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.reviewing}</Text>
  )
}

function Header({ view, round }: { view: ReviewShown; round: ReviewRoundView }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <TicketOf view={view} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
        {round.title}
      </Text>
      <Verdict round={round} />
      {round.files > 0 ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.files(round.files)}</Text>
      ) : null}
    </View>
  )
}

function Notes({ view }: { view: ReviewShown }) {
  const { theme, status } = useNativeTheme()
  return (
    <>
      {view.laterNote ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.laterNote}</Text>
      ) : null}
      {view.actionError ? (
        <Text accessibilityRole="alert" style={{ fontSize: 13, color: status.stuck.softFg }}>
          {view.actionError}
        </Text>
      ) : null}
    </>
  )
}

function Listed({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}

function RoundBody({ round, actions }: { round: ReviewRoundView; actions: Actions }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 12 }}>
      {round.groups.map((group) => (
        <View key={group.id} style={{ gap: 4 }}>
          <Label>{group.label}</Label>
          <Listed>
            {group.findings.map((finding, at) => (
              <FindingRow key={finding.id} finding={finding} divided={at > 0} actions={actions} />
            ))}
          </Listed>
        </View>
      ))}
      {round.recorded && round.groups.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{TEXT.nothingFound}</Text>
      ) : null}
      {round.waitingOn.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Label>{TEXT.waitingOn}</Label>
          <Listed>
            {round.waitingOn.map((item, at) => (
              <WaitingRow key={item.id} item={item} divided={at > 0} actions={actions} />
            ))}
          </Listed>
        </View>
      ) : null}
      {round.reply ? <Reply reply={round.reply} /> : null}
    </View>
  )
}

function Chevron({ open }: { open: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }], marginTop: 2 }}>
      <IconChevron size={14} color={theme.text.muted} />
    </View>
  )
}

function FindingRow({
  finding,
  divided,
  actions,
}: {
  finding: ReviewFindingView
  divided: boolean
  actions: Actions
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(actions.openFinding === finding.id)
  const noting = actions.note?.kind === 'drop' && actions.note.id === finding.id
  const canDrop = finding.canDrop && actions.onDrop !== undefined
  return (
    <View style={divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : undefined}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: nativeSpace[2] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${finding.title}, ${finding.kindLabel}, ${finding.stateLabel}`}
          onPress={() => setOpen((v) => !v)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 6,
            opacity: finding.saving ? 0.6 : 1,
          }}
        >
          <Chevron open={open} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.text.primary }}>{finding.title}</Text>
            <GroupStoryChip label={finding.kindLabel} />
            <ToneBadge tone={finding.tone} label={finding.stateLabel} />
          </View>
        </Pressable>
        {canDrop && !noting ? (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => actions.setNote({ kind: 'drop', id: finding.id })}
          >
            {TEXT.drop}
          </Button>
        ) : null}
      </View>
      {noting ? (
        <NoteConfirm
          confirm={TEXT.drop}
          onConfirm={(note) => {
            actions.setNote(undefined)
            actions.onDrop?.(finding.id, note)
          }}
          onCancel={() => actions.setNote(undefined)}
        />
      ) : null}
      {open ? (
        <View
          style={{ gap: 6, paddingHorizontal: nativeSpace[2], paddingBottom: 8, paddingLeft: 28 }}
        >
          <Text selectable style={{ fontSize: 13, color: theme.text.secondary }}>
            {finding.detail}
          </Text>
          {finding.note ? (
            <Text
              selectable
              style={{ fontSize: 13, fontStyle: 'italic', color: theme.text.secondary }}
            >
              {finding.note}
            </Text>
          ) : null}
          {finding.state !== 'dropped' ? <Evidence lines={finding.evidence} /> : null}
        </View>
      ) : null}
    </View>
  )
}

function Evidence({ lines }: { lines: readonly string[] }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Label>{TEXT.evidence}</Label>
      {lines.length > 0 ? (
        lines.map((line) => (
          <Text
            key={line}
            selectable
            style={{ fontSize: 12, fontFamily: 'monospace', color: theme.text.primary }}
          >
            {line}
          </Text>
        ))
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{TEXT.noEvidence}</Text>
      )}
    </View>
  )
}

function WaitingRow({
  item,
  divided,
  actions,
}: {
  item: ReviewWaitingOnView
  divided: boolean
  actions: Actions
}) {
  const { theme } = useNativeTheme()
  const noting = actions.note?.kind === 'given' && actions.note.id === item.id
  const canGive = item.canMarkGiven && actions.onGiven !== undefined
  return (
    <View style={divided ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : undefined}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          padding: nativeSpace[2],
          opacity: item.saving ? 0.6 : 1,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {item.who}
            </Text>
            <ToneBadge tone={item.tone} label={item.stateLabel} />
          </View>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{item.what}</Text>
          {item.note ? (
            <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.text.muted }}>
              {item.note}
            </Text>
          ) : null}
          {item.evidence.length > 0 ? (
            <Text
              selectable
              style={{ fontSize: 12, fontFamily: 'monospace', color: theme.text.muted }}
            >
              {item.evidence.join(' · ')}
            </Text>
          ) : null}
        </View>
        {canGive && !noting ? (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => actions.setNote({ kind: 'given', id: item.id })}
          >
            {TEXT.given}
          </Button>
        ) : null}
      </View>
      {noting ? (
        <NoteConfirm
          confirm={TEXT.given}
          onConfirm={(note) => {
            actions.setNote(undefined)
            actions.onGiven?.(item.id, note)
          }}
          onCancel={() => actions.setNote(undefined)}
        />
      ) : null}
    </View>
  )
}

function NoteConfirm({
  confirm,
  onConfirm,
  onCancel,
}: {
  confirm: string
  onConfirm: (note: string | undefined) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const done = () => onConfirm(note.trim() || undefined)
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: nativeSpace[2],
        paddingBottom: 8,
      }}
    >
      <View style={{ flexGrow: 1, flexBasis: 180 }}>
        <Input
          accessibilityLabel={TEXT.note}
          placeholder={TEXT.note}
          value={note}
          autoFocus
          onChangeText={setNote}
          onSubmitEditing={done}
          returnKeyType="done"
        />
      </View>
      <Button size="sm" variant="secondary" onPress={done}>
        {confirm}
      </Button>
      <Button size="sm" variant="ghost" onPress={onCancel}>
        {TEXT.cancel}
      </Button>
    </View>
  )
}

function Reply({ reply }: { reply: string }) {
  const { theme } = useNativeTheme()
  const { copyText } = useClipboardHost()
  const [copied, setCopied] = useState(false)
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label>{TEXT.reply}</Label>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: theme.text.muted }}>
          {TEXT.replyHint}
        </Text>
        {copyText ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              void copyText(reply).then(() => setCopied(true))
            }}
          >
            {copied ? TEXT.copied : TEXT.copy}
          </Button>
        ) : null}
      </View>
      <ScrollView
        nestedScrollEnabled
        style={{
          maxHeight: 320,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.raised,
        }}
        contentContainerStyle={{ padding: nativeSpace[2] }}
      >
        <Text selectable style={{ fontSize: 13, color: theme.text.primary }}>
          {reply}
        </Text>
      </ScrollView>
    </View>
  )
}

function Disclosure({
  label,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}
      >
        <Chevron open={open} />
        <View style={{ flex: 1 }}>{label}</View>
      </Pressable>
      {open ? children : null}
    </View>
  )
}

const READ_ONLY = (actions: Actions): Actions => ({
  ...actions,
  onDrop: undefined,
  onGiven: undefined,
})

function EarlierRound({ round, actions }: { round: ReviewRoundView; actions: Actions }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <Disclosure
      open={open}
      onToggle={() => setOpen((v) => !v)}
      label={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
            {TEXT.roundTab(round.n)}
          </Text>
          <Verdict round={round} />
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{round.summary}</Text>
        </View>
      }
    >
      <View style={{ borderLeftWidth: 2, borderLeftColor: theme.border.subtle, paddingLeft: 12 }}>
        <RoundBody round={round} actions={READ_ONLY(actions)} />
      </View>
    </Disclosure>
  )
}

function Earlier({
  view,
  expanded,
  actions,
}: {
  view: ReviewShown
  expanded: boolean
  actions: Actions
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(expanded)
  const earlier = view.rounds.filter((r) => r.n < view.round.n).reverse()
  if (earlier.length === 0) return null
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 8 }}>
      <Disclosure
        open={open}
        onToggle={() => setOpen((v) => !v)}
        label={
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {TEXT.earlier(earlier.length)}
          </Text>
        }
      >
        <View style={{ gap: 8, paddingLeft: 20 }}>
          {earlier.map((round) => (
            <EarlierRound key={round.n} round={round} actions={actions} />
          ))}
        </View>
      </Disclosure>
    </View>
  )
}

function RoundTabs({ view, actions }: { view: ReviewShown; actions: Actions }) {
  const [shown, setShown] = useState(view.round.n)
  const round = view.rounds.find((r) => r.n === shown) ?? view.round
  const own = round.n === view.round.n
  return (
    <>
      <Header view={view} round={round} />
      {view.rounds.length > 1 ? (
        <SegmentedControl
          ariaLabel={TEXT.heading}
          size="sm"
          value={String(round.n)}
          onChange={(next) => setShown(Number(next))}
          options={view.rounds.map((r) => ({ value: String(r.n), label: TEXT.roundTab(r.n) }))}
        />
      ) : null}
      {own ? <Notes view={view} /> : null}
      <RoundBody round={round} actions={own ? actions : READ_ONLY(actions)} />
    </>
  )
}

function withoutReply(round: ReviewRoundView): ReviewRoundView {
  const { reply: _shownAbove, ...rest } = round
  return rest
}

function Summary({
  view,
  actions,
  expanded,
}: {
  view: ReviewShown
  actions: Actions
  expanded: boolean
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(expanded)
  const { round } = view
  const hasMore = round.groups.length > 0 || round.waitingOn.length > 0
  return (
    <>
      <Header view={view} round={round} />
      <Text style={{ fontSize: 13, color: theme.text.primary }}>{round.summary}</Text>
      <Notes view={view} />
      {round.reply ? <Reply reply={round.reply} /> : null}
      {hasMore ? (
        <Disclosure
          open={open}
          onToggle={() => setOpen((v) => !v)}
          label={
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              {open ? TEXT.hideAll : TEXT.showAll}
            </Text>
          }
        >
          <RoundBody round={withoutReply(round)} actions={actions} />
          <Earlier view={view} expanded={false} actions={actions} />
        </Disclosure>
      ) : null}
    </>
  )
}

export type ColleagueReviewConnectedProps = {
  tool: ColleagueReviewTool
  args?: unknown
  result?: unknown
  resultType?: string
  layout?: ColleagueReviewCardLayout
}

/** Native peer of web's `ColleagueReviewConnected`: the review read live on its tool's row. */
export function ColleagueReviewConnected({
  tool,
  args,
  result,
  resultType,
  layout,
}: ColleagueReviewConnectedProps) {
  const { view, dropFinding, markGiven } = useColleagueReviewCall({
    tool,
    args,
    result,
    resultType,
  })
  return (
    <ColleagueReviewCard
      view={view}
      layout={layout ?? (tool === 'read' ? 'summary' : COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT)}
      onDrop={dropFinding}
      onGiven={markGiven}
    />
  )
}
