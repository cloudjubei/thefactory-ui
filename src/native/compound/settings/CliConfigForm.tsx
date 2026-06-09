import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { extractErrorMessage } from '../../../headless/api'
import type { CliAuthCacheEntry, CliTool, ModelInfo } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import type { CliLiveProbeResult } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import { IconCheck } from '../../icons/IconCheck'
import { IconDelete } from '../../icons/IconDelete'
import { IconPlay } from '../../icons/IconPlay'
import { IconRobot } from '../../icons/IconRobot'
import { nativeLightStatus, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

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
 * Native peer of web's `CliConfigForm` — the CLI credential LIST. Shows every
 * cached CLI credential grouped by CLI, picks the default per CLI, toggles chip
 * availability, probes models / a live sandbox round-trip, and deletes
 * credentials. Adding is a separate modal flow ({@link CliAddCredentialForm}).
 */
export function CliConfigForm() {
  const { theme } = useNativeTheme()
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

  const mutedBlock = {
    borderRadius: nativeRadii[1],
    backgroundColor: theme.surface.muted,
    paddingHorizontal: nativeSpace[5],
    paddingVertical: nativeSpace[4],
  } as const

  if (!isLoaded) {
    return (
      <View
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: nativeSpace[10] }}
      >
        <Spinner label="Loading CLI agents…" />
      </View>
    )
  }

  if (loadError) {
    return <Alert variant="error">{loadError.message}</Alert>
  }

  if (cliGroups.length === 0) {
    return (
      <Text style={{ fontSize: 14, color: theme.text.secondary }}>
        No CLI credentials yet. Tap the + button to authorise one and use a CLI agent in chat.
      </Text>
    )
  }

  return (
    <ScrollView
      style={{ maxHeight: 560 }}
      contentContainerStyle={{ gap: nativeSpace[8], paddingBottom: nativeSpace[2] }}
      keyboardShouldPersistTaps="handled"
    >
      {cliGroups.map(([cliKey, caches]) => {
        const cli = cliKey as CliTool
        const enabled = enabledClis.includes(cli)
        const modelsState = modelsProbe[cli] ?? { kind: 'idle' }
        return (
          <View
            key={cli}
            style={{
              gap: nativeSpace[4],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.default,
              padding: nativeSpace[5],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpace[3],
                paddingBottom: nativeSpace[3],
                borderBottomWidth: 1,
                borderBottomColor: theme.border.subtle,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
                <IconRobot size={16} color={theme.text.secondary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                  {cliLabel(cli)}
                </Text>
              </View>
              <Button
                size="sm"
                variant={enabled ? 'success' : 'outline'}
                onPress={() => void setCliEnabled(cli, !enabled)}
                accessibilityLabel={enabled ? 'Enabled in chip' : 'Enable in chip'}
              >
                {enabled ? 'Enabled' : 'Enable in chip'}
              </Button>
            </View>

            {caches.map((cache) => {
              const isDefault = activeCliCredentialId === cache.id
              const liveState = liveProbe[cache.id] ?? { kind: 'idle' }
              return (
                <View key={cache.id} style={{ gap: nativeSpace[3] }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: nativeSpace[3],
                    }}
                  >
                    <Text style={{ fontSize: 14, color: theme.text.primary }}>{cache.name}</Text>
                    <View
                      style={{
                        borderRadius: nativeRadii[1],
                        backgroundColor: theme.surface.muted,
                        paddingHorizontal: nativeSpace[3],
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: theme.text.secondary,
                        }}
                      >
                        {cliLabel(cache.cli)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: nativeSpace[3],
                    }}
                  >
                    <Button
                      size="sm"
                      variant={isDefault ? 'success' : 'outline'}
                      onPress={() => {
                        if (!isDefault) void setActiveCli(cli, cache.id)
                      }}
                      accessibilityLabel={isDefault ? 'Default credential' : 'Set as default'}
                    >
                      {isDefault ? <IconCheck size={14} color={nativeLightStatus.done.bg} /> : null}
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: isDefault ? nativeLightStatus.done.bg : theme.accent.primary,
                        }}
                      >
                        {isDefault ? 'Default' : 'Set default'}
                      </Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={modelsState.kind === 'loading'}
                      onPress={() => void runModelsProbe(cli)}
                    >
                      Test (models)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={liveState.kind === 'loading'}
                      onPress={() => void runLiveProbe(cli, cache.id)}
                    >
                      <IconPlay size={14} color={theme.accent.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.accent.primary }}>
                        Test (live)
                      </Text>
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      onPress={() => setPendingDelete(cache)}
                      accessibilityLabel="Delete credential"
                    >
                      <IconDelete size={16} color={nativeLightStatus.stuck.bg} />
                    </Button>
                  </View>

                  {modelsState.kind === 'ok' ? (
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      {modelsState.models.length} model
                      {modelsState.models.length === 1 ? '' : 's'}
                      {modelsState.models.length > 0
                        ? `: ${modelsState.models
                            .slice(0, 5)
                            .map((m) => m.id)
                            .join(', ')}${modelsState.models.length > 5 ? '…' : ''}`
                        : ''}
                    </Text>
                  ) : null}
                  {modelsState.kind === 'error' ? (
                    <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                      {modelsState.message}
                    </Text>
                  ) : null}

                  {liveState.kind === 'loading' ? (
                    <View
                      style={{
                        ...mutedBlock,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: nativeSpace[3],
                      }}
                    >
                      <Spinner size={14} />
                      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                        Booting sandbox — may take 10–30s
                      </Text>
                    </View>
                  ) : null}
                  {liveState.kind === 'result' ? (
                    liveState.result.ok ? (
                      <View style={{ ...mutedBlock, gap: nativeSpace[2] }}>
                        <Text style={{ fontSize: 12, color: theme.text.primary }}>
                          OK · {liveState.result.durationMs}ms
                        </Text>
                        {liveState.result.transcriptHead ? (
                          <ScrollView
                            style={{ maxHeight: 128 }}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            <Text
                              style={{ fontFamily: 'Courier', fontSize: 11, color: theme.text.primary }}
                            >
                              {liveState.result.transcriptHead}
                            </Text>
                          </ScrollView>
                        ) : null}
                      </View>
                    ) : (
                      <View style={{ gap: nativeSpace[2] }}>
                        <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                          Failed · {liveState.result.durationMs}ms
                        </Text>
                        <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                          {liveState.result.error}
                        </Text>
                      </View>
                    )
                  ) : null}
                  {liveState.kind === 'error' ? (
                    <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                      {liveState.message}
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </View>
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
    </ScrollView>
  )
}

export default CliConfigForm
