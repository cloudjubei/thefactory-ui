import { useEffect, useMemo, useState } from 'react'
import { Linking, ScrollView, Text, View } from 'react-native'
import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import { extractErrorMessage } from '../../../headless/api'
import type { CliAuthCacheEntry, CliReasoningEffort, CliTool, ModelInfo } from '../../../headless/api'
import { useCliConfigs } from '../../../headless'
import type { CliLiveProbeResult } from '../../../headless'
import { loginAwaitsCode, parseLoginUrl } from '../../../headless/utils/cliRunner'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
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
  | { kind: 'ok'; models: ModelInfo[]; efforts: CliReasoningEffort[] }
  | { kind: 'error'; message: string }

type LiveProbeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; result: CliLiveProbeResult }
  | { kind: 'error'; message: string }

type LiveModelsProbeState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string }

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

  const submitReauthCode = () => {
    const code = pasteCode.trim()
    if (!reauth || !code) return
    void submitLoginInput(reauth.loginId, code)
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

            {modelOptions.length > 0 ? (
              <View style={{ gap: nativeSpace[3] }}>
                <View style={{ gap: nativeSpace[1] }}>
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>Default model</Text>
                  <Select
                    value={defaultModel[cli] ?? ''}
                    onValueChange={(v) => void setCliDefaultModel(cli, v || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto (CLI default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto (CLI default)</SelectItem>
                      {modelOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {`${m.label ?? m.id}${m.isDefault ? ' — account default' : ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                {modelsState.kind === 'ok' && modelsState.efforts.length > 0 ? (
                  <View style={{ gap: nativeSpace[1] }}>
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      Reasoning effort
                    </Text>
                    <Select
                      value={effort[cli] ?? ''}
                      onValueChange={(v) => void setCliEffort(cli, v || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default</SelectItem>
                        {modelsState.efforts.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </View>
                ) : null}
                {canRefreshLive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={liveModelsState.kind === 'loading'}
                    onPress={() => void runLiveModelsProbe(cli, groupCredId)}
                    accessibilityLabel="Fetch the live, account-specific model list"
                  >
                    {liveModels ? 'Refresh models' : 'Load live models'}
                  </Button>
                ) : null}
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {liveModels
                    ? `Live list — ${liveModels.length} model${liveModels.length === 1 ? '' : 's'} for this account.`
                    : canRefreshLive
                      ? 'Showing the default list. Load live models for this account.'
                      : 'Showing the default list.'}
                </Text>
                {liveModelsState.kind === 'error' ? (
                  <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                    {liveModelsState.message}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {caches.map((cache) => {
              const isDefault = activeCliCredentialId === cache.id
              const liveState = liveProbe[cache.id] ?? { kind: 'idle' }
              const status = cache.authStatus
              const isReauthing = reauth?.credentialId === cache.id
              const reauthOut = isReauthing ? (loginOutput[reauth.loginId] ?? '') : ''
              const reauthSignInUrl = isReauthing ? parseLoginUrl(reauthOut) : null
              const reauthAwaitsCode = isReauthing ? loginAwaitsCode(reauthOut) : false
              const reauthResult = isReauthing ? loginResults[reauth.loginId] : undefined
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
                    {status ? (
                      status.authenticated ? (
                        <View
                          style={{
                            borderRadius: nativeRadii[1],
                            backgroundColor: theme.surface.muted,
                            paddingHorizontal: nativeSpace[3],
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                            Authenticated
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            borderRadius: nativeRadii[1],
                            backgroundColor: `${nativeLightStatus.stuck.bg}1A`,
                            paddingHorizontal: nativeSpace[3],
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: nativeLightStatus.stuck.bg }}>
                            Needs re-auth
                          </Text>
                        </View>
                      )
                    ) : null}
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
                      size="sm"
                      variant="outline"
                      loading={checking[cache.id]}
                      onPress={() => void runCheckAuth(cache.id)}
                      accessibilityLabel="Check whether this credential is still authenticated"
                    >
                      Check now
                    </Button>
                    <Button
                      size="sm"
                      variant={status && !status.authenticated ? 'success' : 'outline'}
                      disabled={isReauthing}
                      onPress={() => void startReauth(cli, cache)}
                      accessibilityLabel="Re-authenticate this credential in place"
                    >
                      Re-authenticate
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

                  {isReauthing ? (
                    <View
                      style={{
                        gap: nativeSpace[3],
                        borderRadius: nativeRadii[1],
                        borderWidth: 1,
                        borderColor: theme.border.default,
                        backgroundColor: theme.surface.muted,
                        paddingHorizontal: nativeSpace[5],
                        paddingVertical: nativeSpace[4],
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: nativeSpace[3],
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: '500',
                            color: theme.text.primary,
                          }}
                        >
                          Re-authenticating {cliLabel(cache.cli)}…
                        </Text>
                        <Button size="sm" variant="outline" onPress={() => void cancelReauth()}>
                          Cancel
                        </Button>
                      </View>
                      {reauthSignInUrl ? (
                        <Button
                          size="sm"
                          onPress={() => void Linking.openURL(reauthSignInUrl)}
                        >
                          Open the sign-in page to finish
                        </Button>
                      ) : (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: nativeSpace[3],
                          }}
                        >
                          <Spinner size={12} />
                          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                            Starting login…
                          </Text>
                        </View>
                      )}
                      {reauthAwaitsCode ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: nativeSpace[3],
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Input
                              value={pasteCode}
                              onChangeText={setPasteCode}
                              placeholder="Paste the code from the browser"
                              autoCapitalize="none"
                              autoCorrect={false}
                              onSubmitEditing={submitReauthCode}
                            />
                          </View>
                          <Button size="sm" variant="outline" onPress={submitReauthCode}>
                            Submit
                          </Button>
                        </View>
                      ) : null}
                      {reauthResult?.status === 'error' ? (
                        <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
                          {reauthResult.error}
                        </Text>
                      ) : null}
                      {reauthOut ? (
                        <ScrollView
                          style={{ maxHeight: 128 }}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          <Text
                            style={{ fontFamily: 'Courier', fontSize: 11, color: theme.text.secondary }}
                          >
                            {reauthOut}
                          </Text>
                        </ScrollView>
                      ) : null}
                    </View>
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
