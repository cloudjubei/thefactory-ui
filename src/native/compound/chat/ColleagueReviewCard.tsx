import { useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { useColleagueReviewCall } from '../../../headless/hooks/useColleagueReviewCall'
import { reviewReplyToPost } from '../../../headless/utils/colleagueReviewCard'
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
import { REVIEW_POST_TEXT } from '../../../headless/utils/colleagueReviewSourceConstants'
import { REVIEW_MERGE_TEXT } from '../../../headless/utils/colleagueReviewMergeConstants'
import type { ReviewCardMerge } from '../../../headless/utils/colleagueReviewMergeTypes'
import { ticketChipView } from '../../../headless/utils/groupTickets'
import { ticketLinkOf } from '../../../headless/utils/ticketLinks'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron, IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
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
  /** Post a round's reply in the group's Slack thread; `again` posts it a second time, `text` is the person's edit. Without it, Post in thread is not offered. */
  onPost?: (round: number, again: boolean, text?: string) => void
  /** Start with Post in thread's confirm open — for a fixed showcase state. */
  postConfirm?: boolean
  /** Approve & merge on the latest round, and how it goes; without it, not offered. */
  merge?: ReviewCardMerge
  /** Approve the round's pull requests and merge them; `override` merges one that asked for changes. */
  onApproveAndMerge?: (slackText: string, override: boolean) => void
  /** Start with Approve & merge's confirm open — for a fixed showcase state. */
  mergeConfirm?: boolean
  /** Start with this finding opened — for a fixed showcase state. */
  openFinding?: string
  /** Start with this note open — for a fixed showcase state. */
  noteOpen?: NoteOpen
  /** Start with the earlier rounds, or the summary's findings, opened. */
  expanded?: boolean
}

type Actions = Pick<ColleagueReviewCardProps, 'onDrop' | 'onGiven' | 'onPost' | 'postConfirm'> & {
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
 * the reply to copy or post in the group's Slack thread after a confirm that
 * shows it, editable, and the person's own Drop and Given on the latest round.
 */
export default function ColleagueReviewCard({
  view,
  layout = COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  onDrop,
  onGiven,
  onPost,
  postConfirm,
  merge,
  onApproveAndMerge,
  mergeConfirm = false,
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
  const actions: Actions = { onDrop, onGiven, onPost, postConfirm, note, setNote, openFinding }
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
      {merge ? (
        <MergeSection
          merge={merge}
          {...(onApproveAndMerge ? { onStart: onApproveAndMerge } : {})}
          confirmOpen={mergeConfirm}
        />
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's merge section: Approve & merge on the latest round,
 * its confirm listing the pull requests in the order they merge and the Slack
 * line, then each one's progress, live; a round that asked for changes is
 * held with the backend's words and "Merge anyway". What became of the
 * ticket's status once it merged shows last. The ticket page shows it too.
 */
export function MergeSection({
  merge,
  onStart,
  confirmOpen = false,
}: {
  merge: ReviewCardMerge
  onStart?: (slackText: string, override: boolean) => void
  confirmOpen?: boolean
}) {
  const { theme, status } = useNativeTheme()
  const [confirming, setConfirming] = useState(confirmOpen)
  const [slackText, setSlackText] = useState('')
  const { view } = merge
  const canStart =
    onStart !== undefined && merge.prs.length > 0 && !merge.starting && !view?.running
  const muted = { fontSize: 12, color: theme.text.secondary }
  const slack = view?.slack
  const slackLink = slack?.permalink
  return (
    <View
      style={{
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
        paddingTop: nativeSpace[2],
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Label>{REVIEW_MERGE_TEXT.heading}</Label>
        {view ? <ToneBadge tone={view.tone} label={view.label} /> : null}
        {onStart && merge.prs.length > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            style={{ marginLeft: 'auto' }}
            disabled={!canStart}
            onPress={() => setConfirming(true)}
          >
            {REVIEW_MERGE_TEXT.button}
          </Button>
        ) : null}
      </View>
      {merge.refusal && onStart ? (
        <View
          style={{
            gap: 6,
            borderWidth: 1,
            borderColor: status.working.softBorder,
            backgroundColor: status.working.softBg,
            borderRadius: nativeRadii[2],
            padding: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 13, color: theme.text.primary }}>{merge.refusal}</Text>
          <Button
            size="sm"
            variant="secondary"
            style={{ alignSelf: 'flex-start' }}
            onPress={() => onStart(slackText, true)}
          >
            {REVIEW_MERGE_TEXT.mergeAnyway}
          </Button>
        </View>
      ) : null}
      {merge.actionError ? <Alert>{merge.actionError}</Alert> : null}
      {view
        ? view.rows.map((row) => (
            <View key={row.url} style={{ gap: 2 }}>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
              >
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(row.url)}
                  style={{ flexShrink: 1 }}
                >
                  <Text numberOfLines={1} style={{ fontSize: 13, color: theme.accent.primary }}>
                    {row.name}
                  </Text>
                </Pressable>
                <ToneBadge tone={row.tone} label={row.label} />
              </View>
              {row.detail ? (
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{row.detail}</Text>
              ) : null}
            </View>
          ))
        : null}
      {view?.summary ? <Text style={muted}>{view.summary}</Text> : null}
      {view?.error ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{view.error}</Text>
      ) : null}
      {slack ? (
        slackLink ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(slackLink)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
          >
            <Text style={{ fontSize: 12, color: theme.accent.primary }}>{slack.line}</Text>
            <IconExternalLink size={12} color={theme.accent.primary} />
          </Pressable>
        ) : (
          <Text style={muted}>{slack.line}</Text>
        )
      ) : null}
      {view?.ticketMove ? (
        <Text
          style={{
            fontSize: 12,
            color: view.ticketMove.failed ? status.stuck.softFg : theme.text.secondary,
          }}
        >
          {view.ticketMove.line}
        </Text>
      ) : null}
      {onStart ? (
        <BottomSheet
          isOpen={confirming}
          onClose={() => setConfirming(false)}
          title={REVIEW_MERGE_TEXT.confirmTitle}
        >
          <View style={{ gap: nativeSpace[3] }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {REVIEW_MERGE_TEXT.confirmBody}
              </Text>
              {merge.prs.map((pr, at) => (
                <Text key={pr.url} style={{ fontSize: 13, color: theme.text.primary }}>
                  {`${at + 1}. ${pr.name}`}
                </Text>
              ))}
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
                {REVIEW_MERGE_TEXT.slackLine}
              </Text>
              <Textarea
                value={slackText}
                placeholder={REVIEW_MERGE_TEXT.slackPlaceholder}
                onChangeText={setSlackText}
                accessibilityLabel={REVIEW_MERGE_TEXT.slackLine}
                rows={2}
                style={{ fontSize: 13 }}
              />
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {REVIEW_MERGE_TEXT.slackHint}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onPress={() => setConfirming(false)}>
                {REVIEW_MERGE_TEXT.cancel}
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  setConfirming(false)
                  onStart(slackText, false)
                }}
              >
                {REVIEW_MERGE_TEXT.confirm}
              </Button>
            </View>
          </View>
        </BottomSheet>
      ) : null}
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
      {round.reply ? <Reply round={round} reply={round.reply} actions={actions} /> : null}
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

function Reply({
  round,
  reply,
  actions,
}: {
  round: ReviewRoundView
  reply: string
  actions: Actions
}) {
  const { theme } = useNativeTheme()
  const { copyText } = useClipboardHost()
  const [copied, setCopied] = useState(false)
  const { post } = round
  const posted = post?.posted
  const shown = posted?.text ?? reply
  const [confirming, setConfirming] = useState(Boolean(actions.postConfirm))
  const [typed, setTyped] = useState(shown)
  const onPost = post?.canPost ? actions.onPost : undefined
  const again = posted !== undefined
  const toPost = reviewReplyToPost(reply, typed)
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Label>{TEXT.reply}</Label>
        {posted ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(posted.permalink)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text numberOfLines={1} style={{ fontSize: 12, color: theme.accent.primary }}>
              {REVIEW_POST_TEXT.posted}
            </Text>
            <IconExternalLink size={12} color={theme.accent.primary} />
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: theme.text.muted }}>
            {onPost ? REVIEW_POST_TEXT.hintPost : TEXT.replyHint}
          </Text>
        )}
        {onPost ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={post?.posting}
            loading={post?.posting}
            onPress={() => {
              setTyped(shown)
              setConfirming(true)
            }}
          >
            {post?.posting
              ? REVIEW_POST_TEXT.posting
              : again
                ? REVIEW_POST_TEXT.postAgain
                : REVIEW_POST_TEXT.post}
          </Button>
        ) : null}
        {copyText ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              void copyText(shown).then(() => setCopied(true))
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
          {shown}
        </Text>
      </ScrollView>
      {onPost ? (
        <BottomSheet
          isOpen={confirming}
          onClose={() => setConfirming(false)}
          title={again ? REVIEW_POST_TEXT.confirmAgainTitle : REVIEW_POST_TEXT.confirmTitle}
        >
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              {again ? REVIEW_POST_TEXT.confirmAgainBody : REVIEW_POST_TEXT.confirmBody}
            </Text>
            <Textarea
              value={typed}
              onChangeText={setTyped}
              accessibilityLabel={TEXT.reply}
              rows={8}
              style={{ fontSize: 13, maxHeight: 360 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onPress={() => setConfirming(false)}>
                {REVIEW_POST_TEXT.cancel}
              </Button>
              <Button
                variant="primary"
                disabled={!toPost.canPost}
                onPress={() => {
                  setConfirming(false)
                  onPost(round.n, again, toPost.text)
                }}
              >
                {again ? REVIEW_POST_TEXT.confirmAgain : REVIEW_POST_TEXT.confirm}
              </Button>
            </View>
          </View>
        </BottomSheet>
      ) : null}
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
  onPost: undefined,
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
      {round.reply ? <Reply round={round} reply={round.reply} actions={actions} /> : null}
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
  const { view, dropFinding, markGiven, postReply, merge, approveAndMerge } =
    useColleagueReviewCall({
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
      onPost={postReply}
      {...(merge ? { merge } : {})}
      onApproveAndMerge={approveAndMerge}
    />
  )
}
