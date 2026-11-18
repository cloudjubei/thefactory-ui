import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import { useColleagueReview } from '../../../headless/hooks/useColleagueReview'
import {
  colleagueReviewDecisionDraft,
  inlineReviewDecisionActions,
  reviewDecisionDecidedLine,
  reviewDecisionMetadata,
  reviewDecisionProblem,
  reviewDecisionPullRequests,
  reviewDecisionVerdict,
  reviewGateAnswer,
  runReviewDecisionActions,
} from '../../../headless/utils/colleagueReviewDecision'
import {
  REVIEW_DECISION_APPROVE_AND_MERGE,
  REVIEW_DECISION_STOP,
  REVIEW_DECISION_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewDecisionConstants'
import type {
  ReviewDecisionAction,
  ReviewDecisionVerdict,
  ReviewGateAnswer,
} from '../../../headless/utils/colleagueReviewDecisionTypes'
import type { ReviewMergePullRequest } from '../../../headless/utils/colleagueReviewMergeTypes'
import { reviewOfChat } from '../../../headless/utils/colleagueReviewStart'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import ToneBadge from '../chips/ToneBadge'

type Confirming = 'stop' | 'merge'

export type ColleagueReviewDecisionCardProps = {
  ticketKey?: string
  /** The round decided on; absent while it is read. */
  verdict?: ReviewDecisionVerdict
  /** The review is still being read. */
  loading?: boolean
  /** The reply the agent drafted: the box starts on it. */
  draft: string
  actions: readonly ReviewDecisionAction[]
  /** The round's pull requests, the backend's first: what approving and merging lists. */
  prs: readonly ReviewMergePullRequest[]
  /** The choice on its way: shown at once, the rest held. */
  choosing?: string
  /** Why the last choice did not go through. */
  error?: string | null
  onChoose: (action: ReviewDecisionAction, text: string, note: string) => void
  /** Hand the composer back without choosing; the card waits. */
  onLater?: () => void
  /** Inside a frame that draws its own border. */
  embedded?: boolean
  /** Start with this reply typed — for a fixed showcase state. */
  typedReply?: string
  /** Start with Keep reviewing's note open — for a fixed showcase state. */
  noting?: boolean
  /** Start with a confirm open — for a fixed showcase state. */
  confirming?: Confirming
}

/**
 * Native peer of [web's `ColleagueReviewDecisionCard`](../../../web/compound/chat/ColleagueReviewDecisionCard.tsx):
 * the person's call at the end of a colleague review round — the verdict, the
 * drafted reply to edit, and send in Slack, approve and merge, keep reviewing
 * with a note, or stop. Approving and merging, and stopping, ask first.
 */
export default function ColleagueReviewDecisionCard({
  ticketKey,
  verdict,
  loading = false,
  draft,
  actions,
  prs,
  choosing,
  error,
  onChoose,
  onLater,
  embedded = false,
  typedReply,
  noting: startNoting = false,
  confirming: startConfirming,
}: ColleagueReviewDecisionCardProps) {
  const { theme } = useNativeTheme()
  const [text, setText] = useState(typedReply ?? draft)
  const [note, setNote] = useState('')
  const [noting, setNoting] = useState(startNoting)
  const [confirming, setConfirming] = useState<Confirming | undefined>(startConfirming)
  const editsText = actions.some((a) => a.editsText)
  const keep = actions.find((a) => a.noteRequired)
  const held = choosing !== undefined
  const choose = (action: ReviewDecisionAction) => {
    if (held || reviewDecisionProblem(action, text, note)) return
    onChoose(action, text, note)
  }
  const press = (action: ReviewDecisionAction) => {
    if (action.noteRequired) setNoting(true)
    else if (action.id === REVIEW_DECISION_STOP) setConfirming('stop')
    else if (action.id === REVIEW_DECISION_APPROVE_AND_MERGE) setConfirming('merge')
    else choose(action)
  }
  const stop = actions.find((a) => a.id === REVIEW_DECISION_STOP)
  const merge = actions.find((a) => a.id === REVIEW_DECISION_APPROVE_AND_MERGE)
  const sendProblem = actions
    .filter((a) => a.editsText)
    .map((a) => reviewDecisionProblem(a, text, note))
    .find(Boolean)
  const label = { fontSize: 12, fontWeight: '500' as const, color: theme.text.primary }
  const small = { fontSize: 11.5, color: theme.text.muted }
  const body = (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {ticketKey ? TEXT.title(ticketKey) : TEXT.titleNoTicket}
        </Text>
        {verdict ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
              {verdict.title}
            </Text>
            {verdict.verdictLabel && verdict.tone ? (
              <ToneBadge tone={verdict.tone} label={verdict.verdictLabel} />
            ) : null}
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{verdict.summary}</Text>
          </View>
        ) : loading ? (
          <Text style={{ fontSize: 13, color: theme.text.muted }}>{TEXT.reading}</Text>
        ) : null}
      </View>
      {editsText ? (
        <View style={{ gap: 4 }}>
          <Text style={label}>{TEXT.reply}</Text>
          <Textarea
            value={text}
            disabled={held}
            onChangeText={setText}
            accessibilityLabel={TEXT.reply}
            rows={8}
            style={{ fontSize: 13, maxHeight: 320 }}
          />
          <Text style={small}>{sendProblem ?? TEXT.replyHint}</Text>
        </View>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {noting && keep ? (
        <View style={{ gap: nativeSpace[2] }}>
          <View style={{ gap: 4 }}>
            <Text style={label}>{TEXT.note}</Text>
            <Textarea
              autoFocus
              value={note}
              disabled={held}
              placeholder={TEXT.notePlaceholder}
              onChangeText={setNote}
              accessibilityLabel={TEXT.note}
              rows={3}
              style={{ fontSize: 13 }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" disabled={held} onPress={() => setNoting(false)}>
              {TEXT.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={held || reviewDecisionProblem(keep, text, note) !== undefined}
              loading={choosing === keep.id}
              onPress={() => choose(keep)}
            >
              {keep.label}
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={
                action.primary
                  ? 'primary'
                  : action.id === REVIEW_DECISION_STOP
                    ? 'ghost'
                    : 'secondary'
              }
              {...(action.detail ? { accessibilityHint: action.detail } : {})}
              disabled={held || (action.editsText && sendProblem !== undefined)}
              loading={choosing === action.id}
              onPress={() => press(action)}
            >
              {action.label}
            </Button>
          ))}
          {onLater ? (
            <Button
              size="sm"
              variant="ghost"
              style={{ marginLeft: 'auto' }}
              disabled={held}
              onPress={onLater}
            >
              {TEXT.later}
            </Button>
          ) : null}
        </View>
      )}
      {stop ? (
        <ConfirmDialog
          isOpen={confirming === 'stop'}
          onClose={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined)
            choose(stop)
          }}
          title={TEXT.stopTitle}
          description={TEXT.stopBody}
          confirmLabel={TEXT.stopConfirm}
          cancelLabel={TEXT.cancel}
          destructive
        />
      ) : null}
      {merge ? (
        <ConfirmDialog
          isOpen={confirming === 'merge'}
          onClose={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined)
            choose(merge)
          }}
          title={TEXT.mergeTitle}
          description={
            prs.length > 0
              ? [TEXT.mergeBody, ...prs.map((pr, at) => `${at + 1}. ${pr.name}`)].join('\n')
              : TEXT.mergeNone
          }
          confirmLabel={TEXT.mergeConfirm}
          cancelLabel={TEXT.cancel}
        />
      ) : null}
    </View>
  )
  if (embedded) return body
  return (
    <ScrollView
      style={{
        margin: nativeSpace[3],
        maxHeight: 560,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
      }}
      contentContainerStyle={{ padding: nativeSpace[3] }}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  )
}

export type ColleagueReviewDecisionPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The card was answered — what it folds to. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/** Native peer of web's `ColleagueReviewDecisionPanel`: the decision card on a review chat's ask. */
export function ColleagueReviewDecisionPanel({
  grant,
  onDecideLater,
  onDecided,
}: ColleagueReviewDecisionPanelProps) {
  const chat = useChatActions()
  const key = reviewOfChat(grant.chatContextId ?? chat?.chatContextId)
  const live = useColleagueReview(key?.groupId, key?.ticketKey)
  const draft = colleagueReviewDecisionDraft(grant)
  const [choosing, setChoosing] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const choose = (action: ReviewDecisionAction, text: string, note: string) => {
    if (choosing) return
    setChoosing(action.id)
    setError(null)
    grant
      .decide('once', reviewDecisionMetadata(action, draft, text, note))
      .then(() => onDecided?.(reviewDecisionDecidedLine(action)))
      .catch((err: unknown) => {
        setChoosing(undefined)
        setError(grantDecideErrorMessage(err))
      })
  }
  const verdict = reviewDecisionVerdict(live.review)
  return (
    <ColleagueReviewDecisionCard
      {...(key ? { ticketKey: key.ticketKey } : {})}
      {...(verdict ? { verdict } : {})}
      loading={live.review === undefined && !live.readError}
      draft={draft}
      actions={inlineReviewDecisionActions()}
      prs={reviewDecisionPullRequests(live.review)}
      {...(choosing ? { choosing } : {})}
      error={error}
      onChoose={choose}
      onLater={onDecideLater}
    />
  )
}

export type RunReviewDecisionCardProps = {
  run: ProcessRun
  embedded?: boolean
  /** Answer the run's actions gate; resolves `false` when refused, the reason shown on the run. */
  onAnswer: (answer: ReviewGateAnswer) => Promise<boolean>
}

/** Native peer of web's `RunReviewDecisionCard`: the decision card at a colleague review run's approval. */
export function RunReviewDecisionCard({ run, embedded, onAnswer }: RunReviewDecisionCardProps) {
  const subject = run.ticketReview
  const live = useColleagueReview(subject?.groupId, subject?.ticketKey)
  const round = live.review?.rounds.find((r) => r.n === subject?.round)
  const draft = round?.reply ?? ''
  const [choosing, setChoosing] = useState<string>()
  const parkedAt = run.park?.parkedAt
  const [seenPark, setSeenPark] = useState(parkedAt)
  if (seenPark !== parkedAt) {
    setSeenPark(parkedAt)
    setChoosing(undefined)
  }
  const choose = (action: ReviewDecisionAction, text: string, note: string) => {
    if (choosing) return
    setChoosing(action.id)
    void onAnswer(reviewGateAnswer(action, draft, text, note)).then((ok) => {
      if (!ok) setChoosing(undefined)
    })
  }
  const verdict = reviewDecisionVerdict(live.review)
  return (
    <ColleagueReviewDecisionCard
      key={`${run.id}-${parkedAt ?? 0}-${draft === '' ? 'empty' : 'drafted'}`}
      {...(subject ? { ticketKey: subject.ticketKey } : {})}
      {...(verdict ? { verdict } : {})}
      loading={live.review === undefined && !live.readError}
      draft={draft}
      actions={runReviewDecisionActions(run.park ? processRunParkChoices(run) : [])}
      prs={reviewDecisionPullRequests(live.review)}
      {...(choosing ? { choosing } : {})}
      {...(embedded !== undefined ? { embedded } : {})}
      onChoose={choose}
    />
  )
}
