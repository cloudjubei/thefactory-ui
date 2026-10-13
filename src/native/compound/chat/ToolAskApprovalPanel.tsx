import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Switch } from '../../primitives/Switch'
import RichText from '../files/RichText'
import ToolAskCard, { ToolAskScopeChoice } from './ToolAskCard'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import { useStories } from '../../../headless/contexts/StoriesContext'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import {
  toolAskCardView,
  toolAskDecidedLine,
  toolAskScopeOptions,
} from '../../../headless/utils/toolAskCard'
import { TOOL_ASK_COPY, TOOL_ASK_PREVIEW_LINES } from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskBody, ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import type { PendingToolGrant, PendingToolGrantDecision } from '../../../headless/utils/chatTypes'

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
  )
  const [scope, setScope] = useState<PendingToolGrantDecision>('once')
  const startAwait = view.body.kind === 'message' ? view.body.awaitReply : false
  const [awaitReply, setAwaitReply] = useState(startAwait)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: PendingToolGrantDecision) => {
    setBusy(true)
    setError(null)
    const metadata =
      decision !== 'deny' && view.body.kind === 'message' && awaitReply !== startAwait
        ? { args: { awaitReply } }
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
  return (
    <View style={{ margin: 12 }}>
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
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
