import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import { getPrice, type ChatContext, type ModelInfo } from '../../headless/api'
import { ModelChip as ModelChipBase, type ModelChipMode } from './ModelChip'
import {
  useActivityChipCli,
  useAgentRunChipCli,
  useCliConfigs,
  useChatCliRunner,
  useLLMConfigs,
  type ActivityCliModel,
} from '../../headless'

export type ModelChipConnectedProps = {
  provider?: string
  model?: string
  className?: string
  editable?: boolean
  mode?: ModelChipMode
  /**
   * The chat this chip controls. Required to surface the API/CLI toggle: the
   * CLI runner is a per-chat binding. When omitted, the chip stays LLM-only.
   */
  chatContext?: ChatContext
}

type ModelChipLlmWiring = {
  provider?: string
  model?: string
  className?: string
  editable: boolean
  mode: ModelChipMode
  activeConfig: { id: string; name?: string; provider?: string; model?: string } | null
  recents: Array<{ id: string; name?: string; provider?: string; model?: string }>
  configs: Array<{ id: string; name?: string; provider?: string; model?: string }>
  onPick: (id: string) => void
  onOpenSettings: () => void
}

/**
 * CLI-aware leaf: mounted only when a `chatContext` is present, so the
 * `useChatCliRunner` hook (which requires a context) is never called
 * conditionally. Wires the per-chat CLI runner binding + CLI model probing on
 * top of the shared LLM wiring.
 */
function ModelChipWithCli({
  chatContext,
  llm,
}: {
  chatContext: ChatContext
  llm: ModelChipLlmWiring
}) {
  const {
    enabledClis,
    activeCli,
    activeCliCredentialId,
    cachesByCli,
    defaultModel,
    effort,
    probeModels,
    cachedLiveModels,
  } = useCliConfigs()
  const { cliRunner, attach, detach } = useChatCliRunner(chatContext)

  // The credential that belongs to `cli` — the global active one when it's for
  // this CLI, else this CLI's first cached credential. Using the global active
  // credential for a different CLI attaches a mismatched auth cache and the run
  // errors out immediately.
  const credentialForCli = useCallback(
    (cli: string): string | undefined => {
      if (cli === activeCli && activeCliCredentialId) return activeCliCredentialId
      return cachesByCli[cli]?.[0]?.id
    },
    [activeCli, activeCliCredentialId, cachesByCli],
  )

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])

  const useCli = !!cliRunner
  const selectedCli = cliRunner?.tool ?? activeCli ?? null
  const selectedCliModelId = cliRunner?.model ?? (selectedCli ? defaultModel[selectedCli] : undefined)
  const credentialId = cliRunner?.credentialId ?? activeCliCredentialId ?? undefined
  // No UI path binds an `apiKeyCredentialId` to a CLI runner yet, so this is
  // 'subscription' in practice — the 'api-key' arm is latent forward-compat.
  const isApiKeyChat = !!cliRunner?.apiKeyCredentialId
  // Prefer the account-aware live list the user fetched in settings; fall back to
  // the static catalogue. An API-key chat must NOT reuse the live list (it's keyed
  // by + already filtered for the subscription credential) or it could never
  // re-offer api-key-only models — fall back to the auth-blind static list.
  const liveModels =
    !isApiKeyChat && selectedCli && credentialId
      ? (cachedLiveModels(selectedCli as Parameters<typeof cachedLiveModels>[0], credentialId) ??
        undefined)
      : undefined
  // Hide models this chat's credential can't drive (e.g. codex's API-key-only
  // `gpt-5-codex` on a subscription chat, which the CLI rejects with HTTP 400).
  const effectiveCliModels = visibleCliModelsForAuth(
    liveModels ?? cliModels,
    isApiKeyChat ? 'api-key' : 'subscription',
  )

  useEffect(() => {
    if (!useCli || !selectedCli) {
      setCliModels([])
      return
    }
    let cancelled = false
    void probeModels(selectedCli as Parameters<typeof probeModels>[0])
      .then(({ models }) => {
        if (!cancelled) setCliModels(models)
      })
      .catch(() => {
        if (!cancelled) setCliModels([])
      })
    return () => {
      cancelled = true
    }
  }, [useCli, selectedCli, probeModels])

  const onToggleUseCli = useCallback(
    (next: boolean) => {
      if (next) {
        const tool = activeCli ?? enabledClis[0]
        if (!tool) return
        void attach({
          tool,
          credentialId: credentialForCli(tool),
          model: defaultModel[tool],
          effort: effort[tool],
        })
      } else {
        void detach()
      }
    },
    [activeCli, enabledClis, credentialForCli, defaultModel, effort, attach, detach],
  )

  const onPickCli = useCallback(
    (cli: string) => {
      void attach({
        tool: cli,
        credentialId: credentialForCli(cli),
        model: defaultModel[cli],
        effort: effort[cli],
      })
    },
    [credentialForCli, defaultModel, effort, attach],
  )

  const onPickCliModel = useCallback(
    (modelId: string) => {
      if (!selectedCli) return
      void attach({
        tool: selectedCli,
        credentialId: cliRunner?.credentialId ?? credentialForCli(selectedCli),
        apiKeyCredentialId: cliRunner?.apiKeyCredentialId,
        model: modelId,
        effort: cliRunner?.effort ?? effort[selectedCli],
      })
    },
    [selectedCli, cliRunner, credentialForCli, effort, attach],
  )

  return (
    <ModelChipBase
      provider={llm.provider}
      model={useCli ? selectedCliModelId : llm.model}
      className={llm.className}
      editable={llm.editable}
      mode={llm.mode}
      activeConfig={llm.activeConfig}
      recents={llm.recents}
      configs={llm.configs}
      onPick={llm.onPick}
      onOpenSettings={llm.onOpenSettings}
      getPrice={getPrice}
      useCli={useCli}
      onToggleUseCli={onToggleUseCli}
      enabledClis={enabledClis}
      activeCli={selectedCli}
      onPickCli={onPickCli}
      cliModels={effectiveCliModels}
      onPickCliModel={onPickCliModel}
    />
  )
}

/**
 * CLI-aware leaf for the activity chip: same enabled-CLI / model-catalogue /
 * live-model wiring as the chat leaf, but the selection is the persisted
 * `activeActivityCliModel` (sent verbatim as the `runActivity` `cliModel`
 * body) instead of a per-chat runner binding. Activities always run on a
 * subscription credential — the backend resolves it, falling back to the
 * CLI's active login.
 */
function ModelChipActivityCli({
  llm,
  cliModel,
  setCliModel,
  recentCliModels,
}: {
  llm: ModelChipLlmWiring
  cliModel: ActivityCliModel | null
  setCliModel: (model: ActivityCliModel | null) => void
  recentCliModels: ActivityCliModel[]
}) {
  const cli = useActivityChipCli(cliModel, setCliModel, recentCliModels)

  return (
    <ModelChipBase
      provider={llm.provider}
      model={cli.useCli ? cli.selectedCliModelId : llm.model}
      className={llm.className}
      editable={llm.editable}
      mode={llm.mode}
      activeConfig={llm.activeConfig}
      recents={llm.recents}
      configs={llm.configs}
      onPick={llm.onPick}
      onOpenSettings={llm.onOpenSettings}
      getPrice={getPrice}
      useCli={cli.useCli}
      onToggleUseCli={cli.onToggleUseCli}
      enabledClis={cli.enabledClis}
      activeCli={cli.selectedCli}
      onPickCli={cli.onPickCli}
      cliModels={cli.cliModels}
      onPickCliModel={cli.onPickCliModel}
      recentCliModels={cli.recentCliModels}
      onPickRecentCli={cli.onPickRecentCli}
    />
  )
}

/**
 * CLI-aware leaf for the agent-run (Run button) chip: the API/CLI toggle is
 * backed by the per-user-global `activeRunnerKind` + the persisted agent-run CLI
 * pick. Picking an API config (`onPickApi`) also flips the runner back to API —
 * this chip is the explicit selector, unlike Settings → LLM which never flips it.
 */
function ModelChipAgentRunCli({
  llm,
  onPickApi,
}: {
  llm: ModelChipLlmWiring
  onPickApi: (id: string) => void
}) {
  const cli = useAgentRunChipCli()

  return (
    <ModelChipBase
      provider={llm.provider}
      model={cli.useCli ? cli.selectedCliModelId : llm.model}
      className={llm.className}
      editable={llm.editable}
      mode={llm.mode}
      activeConfig={llm.activeConfig}
      recents={llm.recents}
      configs={llm.configs}
      onPick={onPickApi}
      onOpenSettings={llm.onOpenSettings}
      getPrice={getPrice}
      useCli={cli.useCli}
      onToggleUseCli={cli.onToggleUseCli}
      enabledClis={cli.enabledClis}
      activeCli={cli.selectedCli}
      onPickCli={cli.onPickCli}
      cliModels={cli.cliModels}
      onPickCliModel={cli.onPickCliModel}
      recentCliModels={cli.recentCliModels}
      onPickRecentCli={cli.onPickRecentCli}
    />
  )
}

/**
 * Connected `ModelChip` for browser clients: wires the LLM-config selection
 * (active / recents / configs) from `useLLMConfigs` and the "open LLM
 * settings" navigation into the presentational `ModelChip`. When a
 * `chatContext` is supplied, also surfaces the per-chat API/CLI toggle; in
 * `activity` mode the toggle is backed by the persisted activity CLI selection
 * instead.
 */
export default function ModelChipConnected({
  provider,
  model,
  className,
  editable = false,
  mode = 'chat',
  chatContext,
}: ModelChipConnectedProps) {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const {
    configs,
    activeChatConfig,
    activeAgentRunConfig,
    recentChatConfigs,
    recentAgentRunConfigs,
    setActiveChat,
    setActiveAgentRun,
    setActiveRunnerKind,
    activeActivityCliModel,
    setActiveActivityCliModel,
    recentActivityCliModels,
  } = useLLMConfigs()

  // The activity chip (background jobs) mirrors the "active agent" — the agent-run config
  // the user picks in Settings ("Activate Agent") — so it shows that model + its recents,
  // not a separate, sparse activity-only track with no Settings UI. (Activities already
  // resolve to the agent-run config via useProjectDataBridge's
  // `activeActivityConfigId ?? activeAgentRunConfigId` fallback.)
  const activeConfig = mode === 'chat' ? activeChatConfig : activeAgentRunConfig
  const recents = mode === 'chat' ? recentChatConfigs : recentAgentRunConfigs

  const onPick = useCallback(
    (id: string) => (mode === 'chat' ? setActiveChat(id) : setActiveAgentRun(id)),
    [mode, setActiveChat, setActiveAgentRun],
  )

  // Picking an API config in the agent-run chip also makes API the active runner
  // (the chip is the explicit selector). Settings → LLM uses `setActiveAgentRun`
  // alone, so it never flips a CLI-active Run button.
  const onPickAgentRunApi = useCallback(
    (id: string) => {
      setActiveAgentRun(id)
      setActiveRunnerKind('api')
    },
    [setActiveAgentRun, setActiveRunnerKind],
  )

  const onOpenSettings = useCallback(() => {
    if (projectId) navigate(`/projects/${projectId}/settings?tab=llms`)
    else navigate('/settings?tab=llms')
  }, [navigate, projectId])

  const baseActive = useMemo(
    () =>
      activeConfig
        ? {
            id: activeConfig.id,
            name: activeConfig.name,
            provider: activeConfig.provider,
            model: activeConfig.model,
          }
        : null,
    [activeConfig],
  )

  const baseRecents = useMemo(
    () =>
      recents.map((c) => ({
        id: c.id,
        name: c.name,
        provider: c.provider,
        model: c.model,
      })),
    [recents],
  )

  const baseConfigs = useMemo(
    () =>
      configs.map((c) => ({
        id: c.id,
        name: c.name,
        provider: c.provider,
        model: c.model,
      })),
    [configs],
  )

  const llm: ModelChipLlmWiring = {
    provider,
    model,
    className,
    editable,
    mode,
    activeConfig: baseActive,
    recents: baseRecents,
    configs: baseConfigs,
    onPick,
    onOpenSettings,
  }

  if (chatContext) {
    return <ModelChipWithCli chatContext={chatContext} llm={llm} />
  }

  if (mode === 'activity') {
    return (
      <ModelChipActivityCli
        llm={llm}
        cliModel={activeActivityCliModel}
        setCliModel={setActiveActivityCliModel}
        recentCliModels={recentActivityCliModels}
      />
    )
  }

  if (mode === 'agentRun') {
    return <ModelChipAgentRunCli llm={llm} onPickApi={onPickAgentRunApi} />
  }

  return (
    <ModelChipBase
      provider={provider}
      model={model}
      className={className}
      editable={editable}
      mode={mode}
      activeConfig={baseActive}
      recents={baseRecents}
      configs={baseConfigs}
      onPick={onPick}
      onOpenSettings={onOpenSettings}
      getPrice={getPrice}
    />
  )
}
