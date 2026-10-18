import { useState, type ReactNode } from 'react'
import type { WorkLaunchMode } from 'thefactory-tools/types'
import { Text, View } from 'react-native'

import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import RichText from '../files/RichText'
import ToolAskCard, { ToolAskScopeChoice } from './ToolAskCard'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
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
  onDecideLater: () => void
  onDecided?: (line: ToolAskDecidedLine) => void
}

const MONO = { fontFamily: 'Menlo' }

function Boxed({ children, danger }: { children: ReactNode; danger?: boolean }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 6,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: danger ? status.blocked.softBorder : theme.border.subtle,
        backgroundColor: danger ? status.blocked.softBg : theme.surface.base,
      }}
    >
      {children}
    </View>
  )
}

function DeleteStoryBox({ storyId, featureId }: { storyId: string; featureId?: string }) {
  const { theme, status } = useNativeTheme()
  const { getStory, storyDisplayIndex, featureDisplayIndex } = useStories()
  const story = getStory(storyId)
  const feature = featureId ? story?.features.find((f) => f.id === featureId) : undefined
  const index = storyDisplayIndex(storyId)
  const number = featureId
    ? `#${index ?? '?'}.${featureDisplayIndex(storyId, featureId) ?? '?'}`
    : `#${index ?? '?'}`
  const title = featureId ? (feature?.title ?? featureId) : (story?.title ?? storyId)
  return (
    <Boxed danger>
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
        {`${number} · ${title}`}
      </Text>
      {!featureId && story ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {`${story.features.length} ${story.features.length === 1 ? 'feature' : 'features'}`}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.blocked.softFg }}>
        {featureId ? TOOL_ASK_COPY.featureGoes : TOOL_ASK_COPY.storyGoes}
      </Text>
    </Boxed>
  )
}

function NewFilePreview({ body }: { body: Extract<ToolAskBody, { kind: 'write' }> }) {
  const { theme, status } = useNativeTheme()
  const lines = body.content.split('\n')
  const shown = lines.slice(0, TOOL_ASK_PREVIEW_LINES)
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[{ fontSize: 12.5, color: theme.text.primary }, MONO]}>{body.path}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.done.softFg }}>
          {TOOL_ASK_COPY.lines(body.lines)}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>{TOOL_ASK_COPY.newFile}</Text>
      </View>
      <Boxed>
        <Text style={[{ fontSize: 12, color: status.done.softFg }, MONO]}>
          {shown.map((line) => `+ ${line}`).join('\n')}
          {lines.length > shown.length
            ? `\n${TOOL_ASK_COPY.more(lines.length - shown.length)}`
            : ''}
        </Text>
      </Boxed>
    </View>
  )
}

/** A decision on the chat's open changes — or closing them as already on their base: the branch, where it goes or how it stands, and its files. */
function ReviewBox({ body }: { body: Extract<ToolAskBody, { kind: 'review' }> }) {
  const { theme } = useNativeTheme()
  const more = body.fileCount - body.files.length
  const chip = [
    {
      fontSize: 12.5,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: nativeRadii[1],
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    MONO,
  ]
  return (
    <Boxed>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={chip}>{body.branch}</Text>
        {body.target ? (
          <>
            <Text style={{ fontSize: 12.5, color: theme.text.muted }}>{CHAT_REVIEW_ASK.into}</Text>
            <Text style={chip}>{body.target}</Text>
          </>
        ) : null}
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {CHAT_REVIEW_ASK.files(body.fileCount)}
        </Text>
      </View>
      {body.note ? (
        <Text style={{ fontSize: 12.5, color: theme.text.primary }}>{body.note}</Text>
      ) : null}
      {body.files.map((file) => (
        <Text
          key={file}
          numberOfLines={1}
          style={[{ fontSize: 12, color: theme.text.secondary }, MONO]}
        >
          {file}
        </Text>
      ))}
      {more > 0 ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {CHAT_REVIEW_ASK.moreFiles(more)}
        </Text>
      ) : null}
    </Boxed>
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
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 8 }}>
      <Boxed>
        <RichText text={body.question} textColor={theme.text.primary} />
        {body.featureTitle ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {FEATURE_QUESTION_ASK.on(body.featureTitle)}
          </Text>
        ) : null}
      </Boxed>
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
        {FEATURE_QUESTION_ASK.answer}
      </Text>
      <Textarea
        rows={3}
        value={answer}
        disabled={disabled}
        onChangeText={onAnswer}
        accessibilityLabel={FEATURE_QUESTION_ASK.answer}
      />
    </View>
  )
}

/** Native peer of web's `AcceptRequestBox`: the request, and the way its work starts. */
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
  const { theme } = useNativeTheme()
  const request = useFeatureRequestRecord(requestId)
  const summary = request ? featureRequestSummary(request) : ''
  return (
    <View style={{ gap: 8 }}>
      <Boxed>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
          {request?.title ?? requestId}
        </Text>
        {request?.requestedBy.fromProjectId ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {`From ${request.requestedBy.fromProjectId}`}
          </Text>
        ) : null}
        {summary ? (
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{summary}</Text>
        ) : null}
      </Boxed>
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
        {ACCEPT_REQUEST_ASK.how}
      </Text>
      <WorkLaunchChooser
        options={workLaunchOptions({ workLaunchMode: mode })}
        onChoose={onMode}
        busy={disabled}
      />
    </View>
  )
}

/**
 * Native peer of
 * [web's `ToolAskApprovalPanel`](../../../web/compound/chat/ToolAskApprovalPanel.tsx).
 */
export default function ToolAskApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: ToolAskApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
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
    <View style={{ margin: 12 }}>
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
          <Boxed>
            <Text style={{ fontSize: 11, fontWeight: '700', color: status.stuck.softFg }}>
              {body.ecosystem}
            </Text>
            <Text style={[{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }, MONO]}>
              {`${body.name}${body.version ? `@${body.version}` : ''}`}
            </Text>
          </Boxed>
        ) : body.kind === 'network' || body.kind === 'fetch' ? (
          <Boxed>
            <Text style={[{ fontSize: 13, color: theme.text.primary }, MONO]}>
              {body.kind === 'network' ? body.host : body.url}
            </Text>
          </Boxed>
        ) : body.kind === 'message' ? (
          <>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {`${TOOL_ASK_COPY.to} ${body.target}`}
            </Text>
            <Boxed>
              <RichText text={body.message} textColor={theme.text.primary} />
            </Boxed>
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
          <Boxed danger>
            <Text style={{ fontSize: 13, fontWeight: '600', color: status.blocked.softFg }}>
              {body.what}
            </Text>
          </Boxed>
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
          <Boxed>
            <RichText text={body.text} textColor={theme.text.secondary} fontSize={13} />
          </Boxed>
        ) : body.kind === 'details' && body.text ? (
          <Boxed>
            <Text selectable style={[{ fontSize: 12, color: theme.text.secondary }, MONO]}>
              {body.text}
            </Text>
          </Boxed>
        ) : null}
        <ToolAskScopeChoice options={scopes} value={scope} onChange={setScope} disabled={busy} />
      </ToolAskCard>
    </View>
  )
}
