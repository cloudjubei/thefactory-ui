import { useState } from 'react'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import RichText from '../files/RichText'
import ToolAskCard, { ToolAskScopeChoice } from './ToolAskCard'
import { useStories } from '../../../headless/contexts/StoriesContext'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import {
  acceptRequestDecisionMetadata,
  featureQuestionAnswerMetadata,
  featureQuestionAnswerProblem,
  toolAskCardView,
  toolAskDecidedLine,
  toolAskScopeOptions,
} from '../../../headless/utils/toolAskCard'
import {
  ACCEPT_REQUEST_ASK,
  CHAT_REVIEW_ASK,
  FEATURE_QUESTION_ASK,
  TOOL_ASK_COPY,
  TOOL_ASK_PREVIEW_LINES,
} from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskBody, ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import type { PendingToolGrant, PendingToolGrantDecision } from '../../../headless/utils/chatTypes'
import DesignAskBox from '../design/DesignAskBox'
import WorkLaunchChooser from '../WorkLaunchChooser'
import { useFeatureRequestRecord } from '../../../headless/hooks/useCrossProjectRequests'
import { featureRequestSummary } from '../../../headless/utils/featureRequestView'
import { workLaunchOptions } from '../../../headless/utils/workLaunchView'

export type ToolAskApprovalPanelProps = {
  grant: PendingToolGrant
  /** Leave the ask waiting and hand the composer back. */
  onDecideLater: () => void
  /** The card was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

function DeleteStoryBox({ storyId, featureId }: { storyId: string; featureId?: string }) {
  const { getStory, storyDisplayIndex, featureDisplayIndex } = useStories()
  const story = getStory(storyId)
  const feature = featureId ? story?.features.find((f) => f.id === featureId) : undefined
  const index = storyDisplayIndex(storyId)
  const number = featureId
    ? `#${index ?? '?'}.${featureDisplayIndex(storyId, featureId) ?? '?'}`
    : `#${index ?? '?'}`
  const title = featureId ? (feature?.title ?? featureId) : (story?.title ?? storyId)
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-(--status-blocked-soft-border) bg-(--status-blocked-soft-bg) p-3">
      <span className="text-[14px] font-semibold text-(--text-primary)">
        {number} · {title}
      </span>
      {!featureId && story ? (
        <span className="text-[12.5px] text-(--text-secondary)">
          {story.features.length} {story.features.length === 1 ? 'feature' : 'features'}
        </span>
      ) : null}
      <span className="text-[12.5px] font-semibold text-(--status-blocked-soft-fg)">
        {featureId ? TOOL_ASK_COPY.featureGoes : TOOL_ASK_COPY.storyGoes}
      </span>
    </div>
  )
}

function NewFilePreview({ body }: { body: Extract<ToolAskBody, { kind: 'write' }> }) {
  const lines = body.content.split('\n')
  const shown = lines.slice(0, TOOL_ASK_PREVIEW_LINES)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="rounded-md border border-(--border-default) px-2 py-0.5 font-mono">
          {body.path}
        </span>
        <span className="font-semibold text-(--status-done-soft-fg)">
          {TOOL_ASK_COPY.lines(body.lines)}
        </span>
        <span className="text-(--text-muted)">{TOOL_ASK_COPY.newFile}</span>
      </div>
      <pre className="m-0 max-h-60 overflow-auto rounded-lg border border-(--border-subtle) bg-(--surface-base) px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-(--status-done-soft-fg)">
        {shown.map((line) => `+ ${line}`).join('\n')}
        {lines.length > shown.length ? `\n${TOOL_ASK_COPY.more(lines.length - shown.length)}` : ''}
      </pre>
    </div>
  )
}

const CHIP =
  'rounded-md border border-(--border-default) px-2 py-0.5 font-mono text-(--text-primary)'

/** A decision on the chat's open changes — or closing them as already on their base: the branch, where it goes or how it stands, and its files. */
function ReviewBox({ body }: { body: Extract<ToolAskBody, { kind: 'review' }> }) {
  const more = body.fileCount - body.files.length
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className={CHIP}>{body.branch}</span>
        {body.target ? (
          <>
            <span className="text-(--text-muted)">{CHAT_REVIEW_ASK.into}</span>
            <span className={CHIP}>{body.target}</span>
          </>
        ) : null}
        <span className="text-(--text-secondary)">{CHAT_REVIEW_ASK.files(body.fileCount)}</span>
      </div>
      {body.note ? <span className="text-[12.5px] text-(--text-primary)">{body.note}</span> : null}
      {body.files.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-[12px] text-(--text-secondary)">
          {body.files.map((file) => (
            <li key={file} className="truncate">
              {file}
            </li>
          ))}
          {more > 0 ? (
            <li className="text-(--text-muted)">{CHAT_REVIEW_ASK.moreFiles(more)}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

/** An answer to a feature's question: the question as the run asked it, and the answer to send. */
function QuestionBox({
  body,
  answer,
  onAnswer,
  disabled,
}: {
  body: Extract<ToolAskBody, { kind: 'question' }>
  answer: string
  onAnswer: (next: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg border border-(--border-subtle) px-3 py-2.5">
        <span className="text-[13.5px] leading-relaxed text-(--text-primary)">
          <RichText text={body.question} />
        </span>
        {body.featureTitle ? (
          <span className="text-[12px] text-(--text-secondary)">
            {FEATURE_QUESTION_ASK.on(body.featureTitle)}
          </span>
        ) : null}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-(--text-secondary)">
          {FEATURE_QUESTION_ASK.answer}
        </span>
        <Textarea
          rows={3}
          value={answer}
          disabled={disabled}
          onChange={(e) => onAnswer(e.target.value)}
          className="text-[13.5px]"
        />
      </label>
    </div>
  )
}

/** Accepting a feature request: the request as it stands, and the way its work starts — the launch card's choice. */
function AcceptRequestBox({
  requestId,
  mode,
  onMode,
  disabled,
}: {
  requestId: string
  mode: WorkLaunchMode
  onMode: (next: WorkLaunchMode) => void
  disabled: boolean
}) {
  const request = useFeatureRequestRecord(requestId)
  const summary = request ? featureRequestSummary(request) : ''
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg border border-(--border-subtle) px-3 py-2.5">
        <span className="text-[13.5px] font-semibold text-(--text-primary)">
          {request?.title ?? requestId}
        </span>
        {request?.requestedBy.fromProjectId ? (
          <span className="text-[12px] text-(--text-secondary)">
            From {request.requestedBy.fromProjectId}
          </span>
        ) : null}
        {summary ? <span className="text-[12.5px] text-(--text-secondary)">{summary}</span> : null}
      </div>
      <span className="text-[12px] font-medium text-(--text-secondary)">
        {ACCEPT_REQUEST_ASK.how}
      </span>
      <WorkLaunchChooser
        options={workLaunchOptions({ workLaunchMode: mode })}
        onChoose={onMode}
        busy={disabled}
      />
    </div>
  )
}

/**
 * A waiting tool's ask on the shared card: the package, host, page, message,
 * new file or delete it is about, the radio for how far an approval reaches
 * where one may stand, and what the person may change before approving: a
 * message's wait-for-reply, an answer's words, the way an accepted request's
 * work starts.
 */
export default function ToolAskApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: ToolAskApprovalPanelProps) {
  const view = toolAskCardView(grant)
  const scopes = toolAskScopeOptions(
    grant.alwaysAllowScopes ?? [],
    grant.label,
    grant.grantCovers ?? 'exact-call',
    grant.trustableSite,
  )
  const [scope, setScope] = useState<PendingToolGrantDecision>('once')
  const startAwait = view.body.kind === 'message' ? view.body.awaitReply : false
  const [awaitReply, setAwaitReply] = useState(startAwait)
  const [answer, setAnswer] = useState(view.body.kind === 'question' ? view.body.answer : '')
  const [acceptMode, setAcceptMode] = useState<WorkLaunchMode>(
    view.body.kind === 'accept-request' ? (view.body.mode ?? 'process') : 'process',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: PendingToolGrantDecision) => {
    setBusy(true)
    setError(null)
    const metadata =
      decision === 'deny'
        ? undefined
        : view.body.kind === 'message' && awaitReply !== startAwait
          ? { args: { awaitReply } }
          : view.body.kind === 'question'
            ? featureQuestionAnswerMetadata(view.body, answer)
            : view.body.kind === 'accept-request'
              ? acceptRequestDecisionMetadata(acceptMode)
              : undefined
    grant
      .decide(decision, metadata)
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const body = view.body
  const problem = body.kind === 'question' ? featureQuestionAnswerProblem(answer) : undefined
  return (
    <ToolAskCard
      view={view}
      busy={busy}
      error={error}
      {...(problem ? { problem } : {})}
      onApprove={() => decide(scope)}
      onDeny={() => decide('deny')}
      onLater={onDecideLater}
    >
      {body.kind === 'package' ? (
        <div className="flex items-center gap-3 rounded-lg border border-(--border-subtle) px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--status-stuck-soft-bg) text-[11px] font-bold text-(--status-stuck-soft-fg)">
            {body.ecosystem}
          </span>
          <span className="min-w-0 font-mono text-[13.5px] font-semibold text-(--text-primary)">
            {body.name}
            {body.version ? `@${body.version}` : ''}
          </span>
        </div>
      ) : body.kind === 'network' || body.kind === 'fetch' ? (
        <div className="rounded-lg border border-(--border-subtle) px-3 py-2.5 font-mono text-[13px] break-all text-(--text-primary)">
          {body.kind === 'network' ? body.host : body.url}
        </div>
      ) : body.kind === 'message' ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-(--text-secondary)">
            {TOOL_ASK_COPY.to}
            <span className="inline-flex h-7 items-center rounded-md border border-(--border-default) px-2.5 text-(--text-primary)">
              {body.target}
            </span>
          </div>
          <div className="rounded-lg border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap wrap-break-word">
            <RichText text={body.message} />
          </div>
          <Switch
            checked={awaitReply}
            onCheckedChange={setAwaitReply}
            disabled={busy}
            label={TOOL_ASK_COPY.waitForReply}
          />
        </>
      ) : body.kind === 'write' ? (
        <NewFilePreview body={body} />
      ) : body.kind === 'delete-story' ? (
        <DeleteStoryBox
          storyId={body.storyId}
          {...(body.featureId ? { featureId: body.featureId } : {})}
        />
      ) : body.kind === 'delete' ? (
        <div className="rounded-lg border border-(--status-blocked-soft-border) bg-(--status-blocked-soft-bg) px-3 py-2.5 text-[13px] font-semibold text-(--status-blocked-soft-fg)">
          {body.what}
        </div>
      ) : body.kind === 'review' ? (
        <ReviewBox body={body} />
      ) : body.kind === 'question' ? (
        <QuestionBox body={body} answer={answer} onAnswer={setAnswer} disabled={busy} />
      ) : body.kind === 'accept-request' ? (
        <AcceptRequestBox
          requestId={body.requestId}
          mode={acceptMode}
          onMode={setAcceptMode}
          disabled={busy}
        />
      ) : body.kind === 'design' ? (
        <DesignAskBox
          {...(body.projectId ? { projectId: body.projectId } : {})}
          entries={body.entries}
          newScreens={body.newScreens}
        />
      ) : body.kind === 'references' ? (
        <div className="rounded-md bg-(--surface-muted) p-3 text-[13px]">
          <RichText text={body.text} />
        </div>
      ) : body.kind === 'details' && body.text ? (
        <pre className="m-0 max-h-40 overflow-auto rounded-md bg-(--surface-muted) p-3 font-mono text-xs whitespace-pre-wrap wrap-break-word opacity-90">
          {body.text}
        </pre>
      ) : null}
      <ToolAskScopeChoice options={scopes} value={scope} onChange={setScope} disabled={busy} />
    </ToolAskCard>
  )
}
