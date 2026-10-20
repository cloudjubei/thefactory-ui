import { useState, type FormEvent, type ReactNode } from 'react'

import {
  BACKEND_RESET_BODY,
  BACKEND_RESET_LABEL,
  BACKEND_RESET_TITLE,
  BACKEND_TEST_LABEL,
  BACKEND_TESTING_LABEL,
  backendTestCandidate,
  maskSecret,
  normalizeBackendUrl,
  useBackendConnectionTest,
} from '../../../headless'
import { IconSave } from '../../icons'
import { Alert, Button, Field, Input, Spinner, Surface } from '../..'

export type BackendConnectionPanelProps = {
  /** How the panel names this app in its subtitle: "this web app", "this desktop client". */
  clientName: string
  baseUrl: string | null
  token: string | null
  wsState: string
  unauthorized: boolean
  onSaveUrl: (url: string) => void
  onSaveToken: (token: string) => void
  onClearToken: () => void
  /** Clears both URL and token, which returns the person to the login screen. */
  onResetAll: () => void
}

/**
 * Developer settings' backend connection, shared by web and desktop: the URL,
 * WebSocket and token rows, replacing the URL (with a Test connection) and the
 * token, and Reset all. The host owns where URL and token are kept.
 */
export default function BackendConnectionPanel({
  clientName,
  baseUrl,
  token,
  wsState,
  unauthorized,
  onSaveUrl,
  onSaveToken,
  onClearToken,
  onResetAll,
}: BackendConnectionPanelProps) {
  const [nextUrl, setNextUrl] = useState('')
  const [urlSaved, setUrlSaved] = useState(false)
  const [nextToken, setNextToken] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)
  const connection = useBackendConnectionTest()
  const testUrl = backendTestCandidate(nextUrl, baseUrl)

  const onReplaceUrl = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = normalizeBackendUrl(nextUrl)
    if (trimmed.length === 0) return
    onSaveUrl(trimmed)
    setNextUrl('')
    setUrlSaved(true)
    connection.reset()
  }

  const onReplaceToken = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = nextToken.trim()
    if (trimmed.length === 0) return
    onSaveToken(trimmed)
    setNextToken('')
    setTokenSaved(true)
  }

  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-xl font-semibold">Backend connection</h2>
        <p className="text-sm opacity-70">Where {clientName} talks to the backend.</p>
      </header>

      <Surface as="dl" className="flex flex-col gap-2 p-4">
        <Row label="Backend URL">
          {baseUrl ? (
            <code className="text-xs">{baseUrl}</code>
          ) : (
            <span className="text-sm opacity-70">Not set</span>
          )}
        </Row>
        <Row label="WebSocket">
          <StatusDot state={wsState} />
          <span className="text-sm">{wsState}</span>
        </Row>
        <Row label="Bearer token">
          {token ? (
            <code className="text-xs opacity-70">{maskSecret(token)}</code>
          ) : (
            <span className="text-sm opacity-70">Not set</span>
          )}
        </Row>
      </Surface>

      <Surface as="form" onSubmit={onReplaceUrl} className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold">Replace backend URL</h3>
        <Field label="New URL">
          <Input
            type="url"
            value={nextUrl}
            onChange={(e) => {
              setNextUrl(e.target.value)
              setUrlSaved(false)
              connection.reset()
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="http://localhost:7001"
          />
        </Field>
        {urlSaved && (
          <p className="text-xs" style={{ color: 'var(--color-green-700)' }}>
            URL updated.
          </p>
        )}
        {connection.line && (
          <p
            className="text-xs"
            style={{
              color:
                connection.line.tone === 'ok' ? 'var(--color-green-700)' : 'var(--color-red-700)',
            }}
          >
            {connection.line.text}
          </p>
        )}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => testUrl && void connection.test(testUrl, token)}
            disabled={connection.testing || !testUrl}
          >
            {connection.testing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={14} /> {BACKEND_TESTING_LABEL}
              </span>
            ) : (
              BACKEND_TEST_LABEL
            )}
          </Button>
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            disabled={nextUrl.trim().length === 0}
            title="Save URL"
            aria-label="Save URL"
          >
            <IconSave className="w-4 h-4" />
          </Button>
        </div>
      </Surface>

      {unauthorized && (
        <Alert>The current token was rejected by the backend. Update it below.</Alert>
      )}

      <Surface as="form" onSubmit={onReplaceToken} className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold">Replace token</h3>
        <Field label="New token">
          <Input
            type="password"
            value={nextToken}
            onChange={(e) => {
              setNextToken(e.target.value)
              setTokenSaved(false)
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste a new bearer token"
          />
        </Field>
        {tokenSaved && (
          <p className="text-xs" style={{ color: 'var(--color-green-700)' }}>
            Token updated.
          </p>
        )}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClearToken()
              setTokenSaved(false)
            }}
            disabled={!token}
          >
            Clear token
          </Button>
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            disabled={nextToken.trim().length === 0}
            title="Save token"
            aria-label="Save token"
          >
            <IconSave className="w-4 h-4" />
          </Button>
        </div>
      </Surface>

      <Surface className="flex items-center justify-between gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">{BACKEND_RESET_TITLE}</h3>
          <p className="text-xs opacity-70">{BACKEND_RESET_BODY}</p>
        </div>
        <Button type="button" variant="ghost" onClick={onResetAll} disabled={!baseUrl && !token}>
          {BACKEND_RESET_LABEL}
        </Button>
      </Surface>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="text-xs uppercase tracking-wide opacity-60 w-28 shrink-0">{label}</dt>
      <dd className="flex items-center gap-2 min-w-0">{children}</dd>
    </div>
  )
}

function StatusDot({ state }: { state: string }) {
  const color =
    state === 'open'
      ? 'var(--color-green-600)'
      : state === 'connecting'
        ? 'var(--color-orange-500)'
        : 'var(--color-gray-400)'
  return (
    <span aria-hidden className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
  )
}
