import { useState, type ReactNode } from 'react'
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
  reviewPushApprovalIntro,
  reviewPushApprovalRows,
  reviewRunRound,
} from '../../../headless/utils/colleagueReviewBranchUpdates'
import { REVIEW_PUSH_COPY } from '../../../headless/utils/colleagueReviewBranchUpdatesConstants'
import ReviewBranchRows from '../process/ReviewBranchRows'
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
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import ToneBadge from '../chips/ToneBadge'

type Confirming = 'stop' | 'merge'

export type ColleagueReviewDecisionCardProps = {
  ticketKey?: string
  /** Said in place of the review's title. */
  heading?: string
  /** Shown under the heading, before the choices. */
  body?: ReactNode
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
 * The person's call at the end of a colleague review round, in a review chat
 * and at a review run's approval alike: the round's verdict, the drafted reply
 * in a box they may edit, and what is done — send it in Slack, approve and
 * merge, keep reviewing with a note, or stop. Approving and merging, and
 * stopping, ask first. The choice shows at once; a refusal hands the card back
 * with why.
 */
export default function ColleagueReviewDecisionCard({
  ticketKey,
  heading,
  body,
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
  const title = heading ?? (ticketKey ? TEXT.title(ticketKey) : TEXT.titleNoTicket)
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-3 text-[12.5px] ${
        embedded
          ? ''
          : 'm-3 max-h-[min(70vh,640px)] overflow-y-auto rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-sm font-semibold text-(--text-primary)">{title}</h3>
        {verdict ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-(--text-primary)">{verdict.title}</span>
            {verdict.verdictLabel && verdict.tone ? (
              <ToneBadge tone={verdict.tone}>{verdict.verdictLabel}</ToneBadge>
            ) : null}
            <span className="text-(--text-secondary)">{verdict.summary}</span>
          </div>
        ) : loading ? (
          <span className="text-(--text-muted)">{TEXT.reading}</span>
        ) : null}
      </div>
      {body}
      {editsText ? (
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.reply}</span>
          <Textarea
            value={text}
            disabled={held}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="max-h-[40vh] min-h-[140px] resize-y text-[13px]"
          />
          <span className="text-[11.5px] text-(--text-muted)">{sendProblem ?? TEXT.replyHint}</span>
        </label>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {noting && keep ? (
        <div className="flex min-w-0 flex-col gap-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.note}</span>
            <Textarea
              autoFocus
              value={note}
              disabled={held}
              placeholder={TEXT.notePlaceholder}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-y text-[13px]"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={held} onClick={() => setNoting(false)}>
              {TEXT.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={held || reviewDecisionProblem(keep, text, note) !== undefined}
              loading={choosing === keep.id}
              onClick={() => choose(keep)}
            >
              {keep.label}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
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
              title={action.detail}
              disabled={held || (action.editsText && sendProblem !== undefined)}
              loading={choosing === action.id}
              onClick={() => press(action)}
            >
              {action.label}
            </Button>
          ))}
          {onLater ? (
            <Button size="sm" variant="ghost" className="ml-auto" disabled={held} onClick={onLater}>
              {TEXT.later}
            </Button>
          ) : null}
        </div>
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
            prs.length > 0 ? (
              <span className="flex flex-col gap-1">
                <span>{TEXT.mergeBody}</span>
                <span className="flex flex-col">
                  {prs.map((pr, at) => (
                    <span key={pr.url}>
                      {at + 1}. {pr.name}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              TEXT.mergeNone
            )
          }
          confirmLabel={TEXT.mergeConfirm}
          cancelLabel={TEXT.cancel}
        />
      ) : null}
    </section>
  )
}

export type ColleagueReviewDecisionPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The card was answered — what it folds to. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * The decision card on a review chat's `askColleagueReviewDecision` ask, in
 * the composer's place: the chat's review read live, the agent's draft in the
 * box; the person's choice approves the ask with their edits.
 */
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

/**
 * The decision card at a colleague review run's approval: the run's ticket
 * review read live, the round's reply in the box, the gate's actions as the
 * card's choices. Only a person answers it.
 */
export function RunReviewDecisionCard({ run, embedded, onAnswer }: RunReviewDecisionCardProps) {
  const subject = run.ticketReview
  const live = useColleagueReview(subject?.groupId, subject?.ticketKey)
  const n = reviewRunRound(live.review, subject)
  const round = live.review?.rounds.find((r) => r.n === n)
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

/**
 * The push approval of a colleague review run, when bringing the base in
 * conflicted: each pull request's resolution — the files, the changes, the
 * checks and the diff — then Approve push, Send back with a note, or Stop.
 * Nothing is pushed before the person chooses.
 */
export function RunPushApprovalCard({ run, embedded, onAnswer }: RunReviewDecisionCardProps) {
  const [choosing, setChoosing] = useState<string>()
  const parkedAt = run.park?.parkedAt
  const [seenPark, setSeenPark] = useState(parkedAt)
  if (seenPark !== parkedAt) {
    setSeenPark(parkedAt)
    setChoosing(undefined)
  }
  const actions = runReviewDecisionActions(run.park ? processRunParkChoices(run) : []).map((a) =>
    a.noteRequired ? { ...a, label: REVIEW_PUSH_COPY.sendBack } : a,
  )
  const choose = (action: ReviewDecisionAction, _text: string, note: string) => {
    if (choosing) return
    setChoosing(action.id)
    void onAnswer(reviewGateAnswer(action, '', '', note)).then((ok) => {
      if (!ok) setChoosing(undefined)
    })
  }
  return (
    <ColleagueReviewDecisionCard
      key={`${run.id}-${parkedAt ?? 0}`}
      heading={REVIEW_PUSH_COPY.heading}
      body={
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-(--text-secondary)">{reviewPushApprovalIntro(run)}</p>
          <ReviewBranchRows rows={reviewPushApprovalRows(run)} />
        </div>
      }
      draft=""
      actions={actions}
      prs={[]}
      {...(choosing ? { choosing } : {})}
      {...(embedded !== undefined ? { embedded } : {})}
      onChoose={choose}
    />
  )
}
