import { useEffect, useMemo, useRef, useState } from 'react'
import { extractErrorMessage } from '../../../headless/api'
import type { CliAuthCacheEntry, CliTool, ModelInfo } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import type { CliLiveProbeResult } from '../../../headless'
import {
  CLI_CLIENT_OPENS_LOGIN_URL,
  loginAwaitsCode,
  parseLoginUrl,
} from '../../../headless/utils/cliRunner'
import {
  Alert,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '../..'
import { IconCheck, IconDelete, IconPlay, IconRobot } from '../../icons'

const CLI_OPTIONS: ReadonlyArray<{ value: CliTool; label: string }> = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor-agent', label: 'Cursor Agent' },
  { value: 'codex', label: 'Codex' },
]

const CLI_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'cursor-agent': 'Cursor Agent',
  codex: 'Codex',
}

function cliLabel(cli: string): string {
  return CLI_LABELS[cli] ?? cli
}

type ModelsProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; models: ModelInfo[] }
  | { kind: 'error'; message: string }

type LiveProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; result: CliLiveProbeResult }
  | { kind: 'error'; message: string }

export interface CliConfigFormProps {
  /**
   * Optional dismissal callback. When provided the form renders a trailing
   * "Close" button wired to it. Settings hosts that embed the form inline
   * (no modal chrome) omit this. Kept identical on the native peer so the
   * public contract matches across clients.
   */
  onClose?: () => void
}

/**
 * Settings → CLI agents form. Lists every cached CLI credential grouped by
 * CLI, lets the user pick the default credential per CLI, toggle whether a
 * CLI is offered in the chip, probe a CLI for its models or a live sandbox
 * round-trip, delete credentials, and authorise a new credential via the
 * CLI's interactive login subprocess. Consumes `useCliConfigs()` for all
 * state and mutations.
 */
export function CliConfigForm({ onClose }: CliConfigFormProps) {
  const {
    isLoaded,
    loadError,
    cachesByCli,
    activeCliCredentialId,
    enabledClis,
    setActiveCli,
    setCliEnabled,
    deleteCache,
    probeModels,
    probeLive,
    startAuthLogin,
    cancelAuthLogin,
    submitLoginInput,
    loginOutput,
    loginResults,
  } = useCliConfigs()

  const [modelsProbe, setModelsProbe] = useState<Record<string, ModelsProbeState>>({})
  const [liveProbe, setLiveProbe] = useState<Record<string, LiveProbeState>>({})
  const [pendingDelete, setPendingDelete] = useState<CliAuthCacheEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [addCli, setAddCli] = useState<CliTool>('claude-code')
  const [addLabel, setAddLabel] = useState('')
  const [authStarting, setAuthStarting] = useState(false)
  const [loginId, setLoginId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [loginInput, setLoginInput] = useState('')

  // Leave the streaming pane as soon as the active login reaches a terminal
  // outcome: success closes it (the new credential is already refreshed in),
  // an error surfaces inline and returns to the Authorize button.
  const activeResult = loginId ? loginResults[loginId] : undefined
  useEffect(() => {
    if (!loginId || !activeResult) return
    if (activeResult.status === 'completed') {
      setAddSuccess(`Authorized ${cliLabel(addCli)}.`)
      setAddLabel('')
    } else {
      setAddError(activeResult.error)
    }
    setLoginId(null)
  }, [loginId, activeResult, addCli])

  const cliGroups = useMemo(
    () => Object.entries(cachesByCli).sort(([a], [b]) => a.localeCompare(b)),
    [cachesByCli],
  )

  const currentLoginOutput = loginId ? (loginOutput[loginId] ?? '') : ''
  const loginUrl = parseLoginUrl(currentLoginOutput)
  const needsCode = loginAwaitsCode(currentLoginOutput)

  // Container logins (cursor) can't open the host browser themselves — open the
  // printed sign-in link for the user. Host logins (claude / codex) open it
  // themselves, so they're excluded to avoid a duplicate tab. The blank tab is
  // opened during the Authorize click (see startAuthorize) so it isn't popup-
  // blocked, then navigated here once the URL streams in.
  const pendingLoginTabRef = useRef<Window | null>(null)
  const autoOpenedLoginRef = useRef<string | null>(null)
  useEffect(() => {
    if (!loginId || !loginUrl || !CLI_CLIENT_OPENS_LOGIN_URL.has(addCli)) return
    if (autoOpenedLoginRef.current === loginId) return
    autoOpenedLoginRef.current = loginId
    const tab = pendingLoginTabRef.current
    pendingLoginTabRef.current = null
    if (tab && !tab.closed) tab.location.href = loginUrl
    else window.open(loginUrl, '_blank', 'noopener,noreferrer')
  }, [loginId, loginUrl, addCli])

  const runModelsProbe = async (cli: CliTool) => {
    setModelsProbe((prev) => ({ ...prev, [cli]: { kind: 'loading' } }))
    try {
      const models = await probeModels(cli)
      setModelsProbe((prev) => ({ ...prev, [cli]: { kind: 'ok', models } }))
    } catch (err) {
      setModelsProbe((prev) => ({
        ...prev,
        [cli]: {
          kind: 'error',
          message: extractErrorMessage(err, 'Could not list models for this CLI.'),
        },
      }))
    }
  }

  const runLiveProbe = async (cli: CliTool, credentialId: string) => {
    setLiveProbe((prev) => ({ ...prev, [credentialId]: { kind: 'loading' } }))
    try {
      const result = await probeLive(cli, credentialId)
      setLiveProbe((prev) => ({ ...prev, [credentialId]: { kind: 'result', result } }))
    } catch (err) {
      setLiveProbe((prev) => ({
        ...prev,
        [credentialId]: {
          kind: 'error',
          message: extractErrorMessage(err, 'The live probe failed to run.'),
        },
      }))
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      await deleteCache(pendingDelete.id)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const startAuthorize = async () => {
    if (authStarting || loginId) return
    setAuthStarting(true)
    setAddError(null)
    setAddSuccess(null)
    // Open the tab synchronously inside the click gesture (not popup-blocked)
    // for CLIs the client opens (cursor); the effect navigates it to the URL.
    if (CLI_CLIENT_OPENS_LOGIN_URL.has(addCli)) {
      pendingLoginTabRef.current = window.open('about:blank', '_blank')
    }
    try {
      const id = await startAuthLogin(addCli, addLabel.trim() || cliLabel(addCli))
      setLoginId(id)
    } catch (err) {
      pendingLoginTabRef.current?.close()
      pendingLoginTabRef.current = null
      setAddError(extractErrorMessage(err, 'Failed to start the CLI login.'))
    } finally {
      setAuthStarting(false)
    }
  }

  const cancelAuthorize = async () => {
    if (!loginId) return
    if (pendingLoginTabRef.current && !pendingLoginTabRef.current.closed) {
      pendingLoginTabRef.current.close()
    }
    pendingLoginTabRef.current = null
    try {
      await cancelAuthLogin(loginId)
    } finally {
      setLoginId(null)
      setLoginInput('')
    }
  }

  const submitCode = async () => {
    const text = loginInput.trim()
    if (!loginId || !text) return
    await submitLoginInput(loginId, text)
    setLoginInput('')
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner label="Loading CLI agents…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <Alert>{loadError.message}</Alert>
        {onClose && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {cliGroups.length === 0 ? (
        <p className="text-sm text-(--text-secondary)">
          No CLI credentials yet. Authorise one below to use a CLI agent in chat.
        </p>
      ) : (
        cliGroups.map(([cliKey, caches]) => {
          const cli = cliKey as CliTool
          const enabled = enabledClis.includes(cli)
          const modelsState = modelsProbe[cli] ?? { kind: 'idle' }
          return (
            <div
              key={cli}
              className="flex flex-col gap-3 rounded-md border border-(--border-default) p-3"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-(--border-subtle)">
                <div className="flex items-center gap-2">
                  <IconRobot className="w-4 h-4 text-(--text-secondary)" />
                  <span className="text-sm font-semibold text-(--text-primary)">
                    {cliLabel(cli)}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={enabled ? 'success' : 'outline'}
                  onClick={() => void setCliEnabled(cli, !enabled)}
                  title={enabled ? 'Enabled in chip' : 'Enable in chip'}
                >
                  {enabled ? 'Enabled' : 'Enable in chip'}
                </Button>
              </div>

              {caches.map((cache) => {
                const isDefault = activeCliCredentialId === cache.id
                const liveState = liveProbe[cache.id] ?? { kind: 'idle' }
                return (
                  <div key={cache.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-(--text-primary)">{cache.name}</span>
                      <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-(--surface-muted) text-(--text-secondary)">
                        {cliLabel(cache.cli)}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isDefault ? 'success' : 'outline'}
                          onClick={() => {
                            if (!isDefault) void setActiveCli(cli, cache.id)
                          }}
                          title={isDefault ? 'Default credential' : 'Set as default'}
                        >
                          {isDefault && <IconCheck className="w-3.5 h-3.5 mr-1" />}
                          {isDefault ? 'Default' : 'Set default'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={modelsState.kind === 'loading'}
                          onClick={() => void runModelsProbe(cli)}
                        >
                          Test (models)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={liveState.kind === 'loading'}
                          onClick={() => void runLiveProbe(cli, cache.id)}
                        >
                          <IconPlay className="w-3.5 h-3.5 mr-1" />
                          Test (live)
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="danger"
                          onClick={() => setPendingDelete(cache)}
                          title="Delete credential"
                          aria-label="Delete credential"
                        >
                          <IconDelete className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {modelsState.kind === 'ok' && (
                      <p className="text-xs text-(--text-secondary)">
                        {modelsState.models.length} model
                        {modelsState.models.length === 1 ? '' : 's'}
                        {modelsState.models.length > 0 &&
                          `: ${modelsState.models
                            .slice(0, 5)
                            .map((m) => m.id)
                            .join(', ')}${modelsState.models.length > 5 ? '…' : ''}`}
                      </p>
                    )}
                    {modelsState.kind === 'error' && (
                      <p className="text-xs text-red-500">{modelsState.message}</p>
                    )}

                    {liveState.kind === 'loading' && (
                      <div className="rounded bg-(--surface-muted) px-2 py-1.5 text-xs text-(--text-secondary) flex items-center gap-2">
                        <Spinner size={14} />
                        Booting sandbox — may take 10–30s
                      </div>
                    )}
                    {liveState.kind === 'result' &&
                      (liveState.result.ok ? (
                        <div className="rounded bg-(--surface-muted) px-2 py-1.5 text-xs text-(--text-secondary) flex flex-col gap-1">
                          <span className="text-(--text-primary)">
                            OK · {liveState.result.durationMs}ms
                          </span>
                          {liveState.result.transcriptHead && (
                            <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                              {liveState.result.transcriptHead}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <div className="rounded px-2 py-1.5 text-xs text-red-500 flex flex-col gap-1">
                          <span>Failed · {liveState.result.durationMs}ms</span>
                          <span>{liveState.result.error}</span>
                        </div>
                      ))}
                    {liveState.kind === 'error' && (
                      <p className="text-xs text-red-500">{liveState.message}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      <div className="flex flex-col gap-3 rounded-md border border-(--border-default) p-3">
        <span className="text-sm font-semibold text-(--text-primary)">Add credential</span>
        {addError && <Alert>{addError}</Alert>}
        {addSuccess && (
          <div className="flex items-center gap-2 rounded bg-(--surface-muted) px-2 py-1.5 text-xs text-(--text-primary)">
            <IconCheck className="w-3.5 h-3.5" />
            {addSuccess}
          </div>
        )}
        <Field label="CLI">
          <Select value={addCli} onValueChange={(v) => setAddCli(v as CliTool)}>
            <SelectTrigger>
              <SelectValue placeholder="Select CLI" />
            </SelectTrigger>
            <SelectContent>
              {CLI_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Label" hint="A name you'll recognise, e.g. “Claude Code (work)”">
          <Input
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder={cliLabel(addCli)}
          />
        </Field>

        {loginId ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-md border border-(--border-default) bg-(--surface-muted) p-3">
              <span className="text-sm font-medium text-(--text-primary)">
                Sign in to {cliLabel(addCli)}
              </span>
              {loginUrl ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-(--accent-primary) underline"
                    >
                      Open the sign-in page ↗
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void navigator.clipboard?.writeText(loginUrl)}
                    >
                      Copy link
                    </Button>
                  </div>
                  <span className="text-xs text-(--text-secondary)">
                    Authorize in your browser, then return here — this updates automatically.
                  </span>
                </>
              ) : (
                <span className="text-xs text-(--text-secondary)">Starting login…</span>
              )}
            </div>

            {needsCode && (
              <Field label="Paste the code shown after you authorize">
                <div className="flex items-center gap-2">
                  <Input
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void submitCode()
                      }
                    }}
                    placeholder="Paste code"
                  />
                  <Button type="button" onClick={() => void submitCode()}>
                    Submit
                  </Button>
                </div>
              </Field>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => void cancelAuthorize()}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button type="button" loading={authStarting} onClick={() => void startAuthorize()}>
              Authorize
            </Button>
          </div>
        )}
      </div>

      {onClose && (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete credential?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Chats using it will fall back to another credential.`
            : undefined
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        cancelLabel="Keep"
        destructive
      />
    </div>
  )
}

export default CliConfigForm
