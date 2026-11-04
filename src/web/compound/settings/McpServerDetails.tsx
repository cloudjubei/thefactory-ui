import { useState } from 'react'
import {
  MCP_SERVER_ACTIONS,
  MCP_SERVER_ASKS_TAG,
  MCP_SERVER_FIELD_LABELS,
  MCP_SERVER_SIGN_IN_PENDING,
  MCP_SERVER_TOKEN_HINT,
  MCP_SERVER_TOKEN_SAVED_HINT,
  MCP_SERVER_TOOLS_HEADING,
  MCP_SERVER_TOOLS_HINT,
  type McpServerStatusTone,
  type McpServerView,
  type McpToolView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { SecretInput } from '../SecretInput'

const TONE_CLASS: Record<McpServerStatusTone, string> = {
  done: 'badge--done',
  onhold: 'badge--onhold',
  stuck: 'badge--stuck',
  empty: 'badge--empty',
}

export function McpServerStatusChip({ view }: { view: McpServerView }) {
  return (
    <span className={`badge badge--soft badge--sm shrink-0 ${TONE_CLASS[view.statusTone]}`}>
      {view.statusLabel}
    </span>
  )
}

export type McpServerActions = {
  busy: boolean
  onSignIn: (serverId: string) => void | Promise<void>
  onOpenPage: (url: string) => void
  onSetToken: (serverId: string, token: string) => Promise<boolean>
  onTest: (serverId: string) => void | Promise<void>
  /** Ask to remove it; the section confirms. */
  onRemove: (serverId: string) => void
}

function TokenField({
  view,
  saved,
  busy,
  onSetToken,
}: {
  view: McpServerView
  saved: boolean
  busy: boolean
  onSetToken: McpServerActions['onSetToken']
}) {
  const [token, setToken] = useState('')
  const save = async () => {
    if (await onSetToken(view.id, token)) setToken('')
  }
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Field
          label={MCP_SERVER_FIELD_LABELS.token}
          hint={saved ? MCP_SERVER_TOKEN_SAVED_HINT : MCP_SERVER_TOKEN_HINT}
        >
          <SecretInput value={token} onChange={(e) => setToken(e.target.value)} />
        </Field>
      </div>
      <Button
        className="mt-6"
        variant="secondary"
        size="sm"
        onClick={() => void save()}
        disabled={busy || !token.trim()}
      >
        {MCP_SERVER_ACTIONS.saveToken}
      </Button>
    </div>
  )
}

function ToolRow({ tool }: { tool: McpToolView }) {
  return (
    <li className="flex flex-col gap-0.5 px-3 py-2">
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 font-mono text-[12px] break-all">{tool.name}</span>
        {tool.asks ? (
          <span className="badge badge--soft badge--sm badge--review shrink-0">
            {MCP_SERVER_ASKS_TAG}
          </span>
        ) : null}
      </span>
      {tool.description ? (
        <span className="text-[12px] break-words whitespace-pre-line text-(--text-secondary)">
          {tool.description}
        </span>
      ) : null}
    </li>
  )
}

/**
 * Everything about one server: why it stands as it does, the one way in if it
 * has one, the tools it offers and which of those ask. Tool names and
 * descriptions come from an outside server, so they only ever render as text.
 */
export default function McpServerDetails({
  view,
  showUrl = false,
  busy,
  onSignIn,
  onOpenPage,
  onSetToken,
  onTest,
  onRemove,
}: { view: McpServerView; showUrl?: boolean } & McpServerActions) {
  const access = view.access
  const pendingUrl = access?.kind === 'sign-in' ? access.pendingUrl : undefined
  return (
    <div className="flex flex-col gap-3">
      {showUrl ? (
        <span className="font-mono text-[12px] break-all text-(--text-secondary)">{view.url}</span>
      ) : null}
      {view.reason ? (
        <span className="text-[12px] break-words text-(--text-secondary)">{view.reason}</span>
      ) : null}
      {view.note ? <span className="text-sm text-(--text-secondary)">{view.note}</span> : null}

      {access?.kind === 'sign-in' ? (
        <div className="flex flex-col items-start gap-1">
          <Button
            variant={access.label === MCP_SERVER_ACTIONS.signIn ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => void onSignIn(view.id)}
            disabled={busy}
          >
            {access.label}
          </Button>
          {pendingUrl ? (
            <span className="text-[12px] text-(--text-secondary)">
              {MCP_SERVER_SIGN_IN_PENDING}{' '}
              <button
                type="button"
                className="text-(--accent-primary) underline-offset-2 hover:underline"
                onClick={() => onOpenPage(pendingUrl)}
              >
                {MCP_SERVER_ACTIONS.openPage}
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {access?.kind === 'token' ? (
        <TokenField view={view} saved={access.saved} busy={busy} onSetToken={onSetToken} />
      ) : null}

      {view.toolsSummary || view.tools.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{MCP_SERVER_TOOLS_HEADING}</span>
            {view.toolsSummary ? (
              <span className="text-[12px] text-(--text-secondary)">{view.toolsSummary}</span>
            ) : null}
          </span>
          {view.tools.length > 0 ? (
            <>
              <ul className="max-h-64 divide-y divide-(--border-subtle) overflow-y-auto rounded-md border border-(--border-subtle)">
                {view.tools.map((tool) => (
                  <ToolRow key={tool.name} tool={tool} />
                ))}
              </ul>
              <span className="text-[12px] text-(--text-secondary)">{MCP_SERVER_TOOLS_HINT}</span>
            </>
          ) : null}
          {view.omittedNote ? (
            <span className="text-[12px] text-(--text-secondary)">{view.omittedNote}</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onTest(view.id)}
          loading={view.testing}
        >
          {MCP_SERVER_ACTIONS.test}
        </Button>
        {view.testSummary ? (
          <span className="min-w-0 text-[12px] text-(--text-secondary)">{view.testSummary}</span>
        ) : null}
        <span className="flex-1" />
        {view.readOnly ? null : (
          <Button variant="danger" size="sm" onClick={() => onRemove(view.id)} disabled={busy}>
            {MCP_SERVER_ACTIONS.remove}
          </Button>
        )}
      </div>
    </div>
  )
}
