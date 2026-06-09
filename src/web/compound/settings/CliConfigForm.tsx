import { useMemo, useState } from 'react'
import { extractErrorMessage } from '../../../headless/api'
import type { CliAuthCacheEntry, CliTool, ModelInfo } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import type { CliLiveProbeResult } from '../../../headless'
import { Alert, Button, ConfirmDialog, Spinner } from '../..'
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
  | { kind: 'ok'; models: ModelInfo[] }
  | { kind: 'error'; message: string }

type LiveProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; result: CliLiveProbeResult }
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
    setActiveCli,
    setCliEnabled,
    deleteCache,
    probeModels,
    probeLive,
  } = useCliConfigs()

  const [modelsProbe, setModelsProbe] = useState<Record<string, ModelsProbeState>>({})
  const [liveProbe, setLiveProbe] = useState<Record<string, LiveProbeState>>({})
  const [pendingDelete, setPendingDelete] = useState<CliAuthCacheEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cliGroups = useMemo(
    () => Object.entries(cachesByCli).sort(([a], [b]) => a.localeCompare(b)),
    [cachesByCli],
  )

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
        return (
          <div
            key={cli}
            className="flex flex-col gap-3 rounded-md border border-(--border-default) p-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <IconRobot className="w-4 h-4 text-(--text-secondary)" />
                <span className="text-sm font-semibold text-(--text-primary)">{cliLabel(cli)}</span>
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
