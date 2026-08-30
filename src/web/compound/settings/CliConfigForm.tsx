import { useEffect, useMemo, useRef, useState } from 'react'
import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import { extractErrorMessage } from '../../../headless/api'
import type {
  CliAuthCacheEntry,
  CliReasoningEffort,
  CliTool,
  ModelInfo,
} from '../../../headless/api'
import { CliImageVersionChip } from './CliImageVersionChip'
import { useCliConfigs } from '../../../headless'
import type { CliLiveProbeResult, RunCliCapabilityCheckResponse } from '../../../headless'
import { loginAwaitsCode, parseLoginUrl } from '../../../headless/utils/cliRunner'
import { Alert, Button, ConfirmDialog, NativeSelect, Spinner } from '../..'
import { IconCheck, IconDelete, IconPlay, IconRobot } from '../../icons'

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
  | { kind: 'ok'; models: ModelInfo[]; efforts: CliReasoningEffort[] }
  | { kind: 'error'; message: string }

type CapabilityState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; card: RunCliCapabilityCheckResponse }
  | { kind: 'error'; message: string }

type LiveProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; result: CliLiveProbeResult }
  | { kind: 'error'; message: string }

type LiveModelsProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }

/**
 * Settings → CLI agents credential LIST. Shows every cached CLI credential
 * grouped by CLI, lets the user pick the default credential per CLI, toggle
 * whether a CLI is offered in the chip, probe a CLI for its models or a live
 * sandbox round-trip, and delete credentials. Adding a credential is a separate
 * modal flow ({@link CliAddCredentialForm}). Consumes `useCliConfigs()`.
 */
export function CliConfigForm() {
  const {
    isLoaded,
    loadError,
    cachesByCli,
    activeCliCredentialId,
    enabledClis,
    defaultModel,
    effort,
    setActiveCli,
    setCliEnabled,
    setCliDefaultModel,
    setCliEffort,
    deleteCache,
    probeModels,
    probeModelsLive,
    cachedLiveModels,
    probeLive,
    probeCapability,
    capabilityScorecards,
    cliImageVersions,
    cliImageDocker,
    cliImagesLoading,
    cliImageBuildOutput,
    checkCliImages,
    startCliImageBuild,
    checkAuth,
    startAuthLogin,
    cancelAuthLogin,
    submitLoginInput,
    loginOutput,
    loginResults,
  } = useCliConfigs()

  const [modelsProbe, setModelsProbe] = useState<Record<string, ModelsProbeState>>({})
  const [liveModelsProbe, setLiveModelsProbe] = useState<Record<string, LiveModelsProbeState>>({})
  const [liveProbe, setLiveProbe] = useState<Record<string, LiveProbeState>>({})
  const [capability, setCapability] = useState<Record<string, CapabilityState>>({})
  const [imageBuildError, setImageBuildError] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<CliAuthCacheEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Per-credential "Check now" auth probe in flight.
  const [checking, setChecking] = useState<Record<string, boolean>>({})
  // The credential currently being re-authenticated in place + its login stream id.
  const [reauth, setReauth] = useState<{ credentialId: string; loginId: string } | null>(null)
  const [pasteCode, setPasteCode] = useState('')

  // A completed re-auth clears the inline pane (the context already refreshed the
  // cache list, so the row's status badge flips to authenticated on its own).
  useEffect(() => {
    if (reauth && loginResults[reauth.loginId]?.status === 'completed') {
      setReauth(null)
      setPasteCode('')
    }
  }, [reauth, loginResults])

  const runCheckAuth = async (credentialId: string) => {
    setChecking((prev) => ({ ...prev, [credentialId]: true }))
    try {
      await checkAuth(credentialId)
    } catch {
      // The failure is advisory; the credential badge reflects the last known state.
    } finally {
      setChecking((prev) => ({ ...prev, [credentialId]: false }))
    }
  }

  const startReauth = async (cli: CliTool, cache: CliAuthCacheEntry) => {
    try {
      const loginId = await startAuthLogin(cli, cache.name, cache.id)
      setReauth({ credentialId: cache.id, loginId })
      setPasteCode('')
    } catch {
      // startAuthLogin rejects synchronously only on a transport error; ignore.
    }
  }

  const cancelReauth = async () => {
    if (!reauth) return
    try {
      await cancelAuthLogin(reauth.loginId)
    } catch {
      // best-effort cancel
    }
    setReauth(null)
    setPasteCode('')
  }

  const cliGroups = useMemo(
    () => Object.entries(cachesByCli).sort(([a], [b]) => a.localeCompare(b)),
    [cachesByCli],
  )

  const runModelsProbe = async (cli: CliTool) => {
    setModelsProbe((prev) => ({ ...prev, [cli]: { kind: 'loading' } }))
    try {
      const { models, efforts } = await probeModels(cli)
      setModelsProbe((prev) => ({ ...prev, [cli]: { kind: 'ok', models, efforts } }))
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

  const cliKeys = useMemo(() => cliGroups.map(([cli]) => cli).join(','), [cliGroups])
  useEffect(() => {
    if (!cliKeys) return
    for (const cli of cliKeys.split(',')) void runModelsProbe(cli as CliTool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliKeys])

  // Check upstream CLI versions when this view opens, so a fresh "update available"
  // is shown without waiting for the app-level provider's initial check. Respects the
  // 6h staleness window the check already persists, so re-opening does not hammer the registry.
  const CLI_IMAGE_STALE_MS = 6 * 60 * 60 * 1000
  const checkedOnOpenRef = useRef(false)
  useEffect(() => {
    if (cliImagesLoading || checkedOnOpenRef.current) return
    checkedOnOpenRef.current = true
    if (cliImageDocker !== 'ok') return
    const stale = cliImageVersions.some(
      (row) =>
        !row.latestCheckedAt || Date.now() - Date.parse(row.latestCheckedAt) > CLI_IMAGE_STALE_MS,
    )
    if (stale) void checkCliImages()
  }, [cliImagesLoading, cliImageDocker, cliImageVersions, checkCliImages])

  const runLiveModelsProbe = async (cli: CliTool, credentialId: string) => {
    setLiveModelsProbe((prev) => ({ ...prev, [cli]: { kind: 'loading' } }))
    try {
      const result = await probeModelsLive(cli, credentialId)
      setLiveModelsProbe((prev) => ({
        ...prev,
        [cli]: result.ok ? { kind: 'idle' } : { kind: 'error', message: result.error },
      }))
    } catch (err) {
      setLiveModelsProbe((prev) => ({
        ...prev,
        [cli]: { kind: 'error', message: extractErrorMessage(err, 'Could not fetch live models.') },
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

  const runCapabilityBattery = async (cli: CliTool, credentialId: string) => {
    setCapability((prev) => ({ ...prev, [credentialId]: { kind: 'loading' } }))
    try {
      const card = await probeCapability(cli, credentialId)
      setCapability((prev) => ({ ...prev, [credentialId]: { kind: 'result', card } }))
    } catch (err) {
      setCapability((prev) => ({
        ...prev,
        [credentialId]: {
          kind: 'error',
          message: extractErrorMessage(err, 'The capability battery failed to run.'),
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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner label="Loading CLI agents…" />
      </div>
    )
  }

  if (loadError) {
    return <Alert>{loadError.message}</Alert>
  }

  if (cliGroups.length === 0) {
    return (
      <p className="text-sm text-(--text-secondary)">
        No CLI credentials yet. Click the + button to authorise one and use a CLI agent in chat.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {cliGroups.map(([cliKey, caches]) => {
        const cli = cliKey as CliTool
        const enabled = enabledClis.includes(cli)
        const modelsState = modelsProbe[cli] ?? { kind: 'idle' }
        const liveModelsState = liveModelsProbe[cli] ?? { kind: 'idle' }
        const groupCredId = caches.find((c) => c.id === activeCliCredentialId)?.id ?? caches[0]?.id
        const liveModels = groupCredId ? cachedLiveModels(cli, groupCredId) : undefined
        // These are CLI auth-cache (subscription) logins, so hide API-key-only
        // models (e.g. codex's `gpt-5-codex`) from the default-model picker — a
        // subscription default that can't run would HTTP-400 every chat turn.
        const modelOptions = visibleCliModelsForAuth(
          liveModels ?? (modelsState.kind === 'ok' ? modelsState.models : []),
          'subscription',
        )
        const canRefreshLive = (cli === 'cursor-agent' || cli === 'codex') && !!groupCredId
        const imageVersion = cliImageVersions.find((row) => row.cli === cli)
        const isUpdating = imageVersion?.state === 'updating'
        return (
          <div
            key={cli}
            className="flex flex-col gap-3 rounded-md border border-(--border-default) p-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <IconRobot className="w-4 h-4 text-(--text-secondary)" />
                <span className="text-sm font-semibold text-(--text-primary)">{cliLabel(cli)}</span>
                <CliImageVersionChip version={imageVersion} loading={cliImagesLoading} />
                {cliImageDocker === 'ok' &&
                  imageVersion &&
                  (isUpdating || imageVersion.state !== 'up-to-date') && (
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        imageVersion.state === 'update-available' ||
                        imageVersion.state === 'not-built'
                          ? 'success'
                          : 'outline'
                      }
                      loading={isUpdating}
                      disabled={isUpdating}
                      onClick={() => {
                        setImageBuildError((prev) => {
                          const next = { ...prev }
                          delete next[cli]
                          return next
                        })
                        startCliImageBuild(cli).catch((err: unknown) => {
                          setImageBuildError((prev) => ({
                            ...prev,
                            [cli]: extractErrorMessage(
                              err,
                              'The image build could not be started.',
                            ),
                          }))
                        })
                      }}
                      title={
                        imageVersion.state === 'unknown'
                          ? (imageVersion.detail ?? 'Rebuild this image')
                          : `Build ${cliLabel(cli)} ${imageVersion.latest ?? ''}`
                      }
                    >
                      {isUpdating
                        ? 'Building…'
                        : imageVersion.state === 'not-built'
                          ? 'Build image'
                          : imageVersion.state === 'update-available'
                            ? `Update to ${imageVersion.latest ?? ''}`
                            : 'Rebuild'}
                    </Button>
                  )}
              </div>
              <Button
                type="button"
                size="sm"
                variant={enabled ? 'success' : 'outline'}
                disabled={isUpdating}
                onClick={() => void setCliEnabled(cli, !enabled)}
                title={enabled ? 'Enabled in chip' : 'Enable in chip'}
              >
                {enabled ? 'Enabled' : 'Enable in chip'}
              </Button>
            </div>

            {imageBuildError[cli] && (
              <div className="rounded border border-red-500/40 bg-(--surface-muted) px-2 py-2 text-xs text-red-500">
                {imageBuildError[cli]}
              </div>
            )}

            {imageVersion?.update?.status === 'failed' && (
              <div className="rounded border border-red-500/40 bg-(--surface-muted) px-2 py-2 text-xs flex flex-col gap-2">
                <span className="text-red-500 font-medium">
                  Build failed · {imageVersion.update.targetVersion}
                </span>
                {imageVersion.update.error && (
                  <span className="text-red-500">{imageVersion.update.error}</span>
                )}
                {(cliImageBuildOutput[imageVersion.update.updateId] ??
                  imageVersion.update.logTail) && (
                  <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-(--text-secondary)">
                    {cliImageBuildOutput[imageVersion.update.updateId] ??
                      imageVersion.update.logTail}
                  </pre>
                )}
              </div>
            )}

            <div
              className={`flex flex-col gap-3${isUpdating ? ' pointer-events-none select-none opacity-50' : ''}`}
              aria-disabled={isUpdating}
            >
              {modelOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 min-w-48 flex-1">
                      <span className="text-xs text-(--text-secondary)">Default model</span>
                      <NativeSelect
                        size="sm"
                        value={defaultModel[cli] ?? ''}
                        onChange={(e) => void setCliDefaultModel(cli, e.target.value || undefined)}
                      >
                        <option value="">Auto (CLI default)</option>
                        {modelOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label ?? m.id}
                            {m.isDefault ? ' — account default' : ''}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    {modelsState.kind === 'ok' && modelsState.efforts.length > 0 && (
                      <label className="flex flex-col gap-1 w-40">
                        <span className="text-xs text-(--text-secondary)">Reasoning effort</span>
                        <NativeSelect
                          size="sm"
                          value={effort[cli] ?? ''}
                          onChange={(e) => void setCliEffort(cli, e.target.value || undefined)}
                        >
                          <option value="">Default</option>
                          {modelsState.efforts.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                    )}
                    {canRefreshLive && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={liveModelsState.kind === 'loading'}
                        onClick={() => void runLiveModelsProbe(cli, groupCredId)}
                        title="Fetch the live, account-specific model list"
                      >
                        {liveModels ? 'Refresh models' : 'Load live models'}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-(--text-secondary)">
                    {liveModels
                      ? `Live list — ${liveModels.length} model${liveModels.length === 1 ? '' : 's'} for this account.`
                      : canRefreshLive
                        ? 'Showing the default list. Load live models for this account.'
                        : 'Showing the default list.'}
                  </p>
                  {liveModelsState.kind === 'loading' && cli === 'cursor-agent' && (
                    <div className="rounded bg-(--surface-muted) px-2 py-1.5 text-xs text-(--text-secondary) flex items-center gap-2">
                      <Spinner size={14} />
                      Booting sandbox to list models — a few seconds…
                    </div>
                  )}
                  {liveModelsState.kind === 'error' && (
                    <p className="text-xs text-red-500">{liveModelsState.message}</p>
                  )}
                </div>
              )}

              {caches.map((cache) => {
                const isDefault = activeCliCredentialId === cache.id
                const liveState = liveProbe[cache.id] ?? { kind: 'idle' }
                const storedCard = capabilityScorecards.find((c) => c.cli === cache.cli)
                const capState: CapabilityState =
                  capability[cache.id] ??
                  (storedCard ? { kind: 'result', card: storedCard } : { kind: 'idle' })
                const status = cache.authStatus
                const isReauthing = reauth?.credentialId === cache.id
                const reauthOut = isReauthing ? (loginOutput[reauth.loginId] ?? '') : ''
                const reauthSignInUrl = isReauthing ? parseLoginUrl(reauthOut) : null
                const reauthAwaitsCode = isReauthing ? loginAwaitsCode(reauthOut) : false
                const reauthResult = isReauthing ? loginResults[reauth.loginId] : undefined
                return (
                  <div key={cache.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-(--text-primary)">{cache.name}</span>
                      <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-(--surface-muted) text-(--text-secondary)">
                        {cliLabel(cache.cli)}
                      </span>
                      {status &&
                        (status.authenticated ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-(--surface-muted) text-(--text-secondary)">
                            Authenticated
                          </span>
                        ) : (
                          <span
                            className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500"
                            title={status.message ?? 'This credential needs re-authentication.'}
                          >
                            Needs re-auth
                          </span>
                        ))}
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
                          size="sm"
                          variant="outline"
                          loading={capState.kind === 'loading'}
                          onClick={() => void runCapabilityBattery(cli, cache.id)}
                          title="Run the capability battery: structured output, grounding, off-topic refusal, canonicalization, latency and web search"
                        >
                          Capability battery
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={checking[cache.id]}
                          onClick={() => void runCheckAuth(cache.id)}
                          title="Check whether this credential is still authenticated"
                        >
                          Check now
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={status && !status.authenticated ? 'success' : 'outline'}
                          disabled={isReauthing}
                          onClick={() => void startReauth(cli, cache)}
                          title="Re-authenticate this credential in place (keeps the same id)"
                        >
                          Re-authenticate
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

                    {capState.kind === 'error' && (
                      <p className="text-xs text-red-500">{capState.message}</p>
                    )}

                    {capState.kind === 'result' && (
                      <div className="rounded border border-(--border-default) bg-(--surface-muted) px-2 py-2 text-xs flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-(--text-primary) font-medium">
                            {capState.card.passed}/{capState.card.applicable} probes passed
                          </span>
                          <span className="text-(--text-secondary)">
                            median call {Math.round(capState.card.p50LatencyMs / 100) / 10}s
                          </span>
                          {typeof capState.card.totalCostUSD === 'number' && (
                            <span className="text-(--text-secondary)">
                              ${capState.card.totalCostUSD.toFixed(4)}
                            </span>
                          )}
                          {capState.card.finishedAt && (
                            <span className="text-(--text-secondary) ml-auto">
                              {new Date(capState.card.finishedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {capState.card.probes.map((probe) => (
                          <div key={probe.id} className="flex items-start gap-2">
                            <span
                              className={
                                probe.status === 'pass'
                                  ? 'text-green-500 w-14 shrink-0'
                                  : probe.status === 'fail'
                                    ? 'text-red-500 w-14 shrink-0'
                                    : 'text-(--text-secondary) w-14 shrink-0'
                              }
                            >
                              {probe.status === 'pass'
                                ? 'PASS'
                                : probe.status === 'fail'
                                  ? 'FAIL'
                                  : 'N/A'}
                            </span>
                            <div className="grow flex flex-col gap-1">
                              <div className="flex items-start gap-2">
                                <span className="text-(--text-primary) w-40 shrink-0">
                                  {probe.label}
                                </span>
                                <span className="text-(--text-secondary) grow">{probe.detail}</span>
                              </div>
                              {probe.status === 'fail' &&
                                probe.cases.some((probeCase) => probeCase.detail) && (
                                  <ul className="flex flex-col gap-0.5 pl-40">
                                    {probe.cases
                                      .filter((probeCase) => probeCase.detail)
                                      .map((probeCase) => (
                                        <li
                                          key={probeCase.input}
                                          className="flex items-start gap-2 text-(--text-secondary)"
                                        >
                                          <span
                                            className={
                                              probeCase.status === 'pass'
                                                ? 'text-green-500 shrink-0'
                                                : 'text-red-500 shrink-0'
                                            }
                                          >
                                            {probeCase.status === 'pass' ? '✓' : '✗'}
                                          </span>
                                          <span>{probeCase.detail}</span>
                                        </li>
                                      ))}
                                  </ul>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isReauthing && (
                      <div className="rounded border border-(--border-default) bg-(--surface-muted) px-2 py-2 text-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-(--text-primary) font-medium">
                            Re-authenticating {cliLabel(cache.cli)}…
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void cancelReauth()}
                          >
                            Cancel
                          </Button>
                        </div>
                        {reauthSignInUrl ? (
                          <a
                            href={reauthSignInUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-(--text-primary) underline break-all"
                          >
                            Open the sign-in page to finish ↗
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-(--text-secondary)">
                            <Spinner size={12} /> Starting login…
                          </div>
                        )}
                        {reauthAwaitsCode && (
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault()
                              const code = pasteCode.trim()
                              if (code) {
                                void submitLoginInput(reauth.loginId, code)
                                setPasteCode('')
                              }
                            }}
                          >
                            <input
                              className="flex-1 rounded border border-(--border-default) bg-(--surface-default) px-2 py-1 text-xs text-(--text-primary)"
                              placeholder="Paste the code from the browser"
                              value={pasteCode}
                              onChange={(e) => setPasteCode(e.target.value)}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Submit
                            </Button>
                          </form>
                        )}
                        {reauthResult?.status === 'error' && (
                          <span className="text-red-500">{reauthResult.error}</span>
                        )}
                        {reauthOut && (
                          <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-(--text-secondary)">
                            {reauthOut}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

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
