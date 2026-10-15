import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getPrice, type ChatContext } from '../../headless/api'
import { ModelChip as ModelChipBase, type ModelChipMode } from './ModelChip'
import {
  useActivityChipCli,
  useAgentRunChipCli,
  useLLMConfigs,
  type ActivityCliModel,
} from '../../headless'
import { useChatChipCli, type ChatChipCliOverrides } from '../../headless/hooks/useChatChipCli'

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
  /**
   * `activity` mode only: the embedded app's background jobs run only on an API model (a
   * `requiresApi` activity, e.g. knowledge-analyze). Disables the CLI segment + forces API display.
   */
  apiOnly?: boolean
  /** Hover callout for the disabled CLI segment when {@link apiOnly}; falls back to a default. */
  apiOnlyReason?: string
  /**
   * Run the chip as a CHOOSER for something else — a run about to start —
   * rather than as the chat's own binding: it seeds from the chat, shows
   * `overrideModel`, and reports picks through `onOverrideModel` without ever
   * changing what the conversation runs on.
   */
  overrideModel?: string | undefined
  onOverrideModel?: (modelId: string) => void
  /**
   * The CLI picked for that run, when it differs from the chat's. Paired with
   * {@link onOverrideModel}: without it, choosing a different CLI in chooser
   * mode fell through to the chat binding and silently moved the CONVERSATION
   * onto another agent.
   */
  overrideCli?: string | undefined
  onOverrideCli?: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  /** The API was picked for that run, over the chat's CLI. */
  overrideApi?: boolean
  /**
   * Switching the chooser to the API reports here. Without it the toggle fell
   * through to the chat binding and detached the CONVERSATION's agent.
   */
  onOverrideApi?: () => void
  /** A line the picker opens with — when a pick takes effect, say. */
  note?: string
}

const ACTIVITY_API_ONLY_REASON =
  'This app’s background jobs run only on an API model — CLI agents aren’t supported here. Pick an API config.'

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
  /** The API config a run works on — what a chooser shows on its API side. */
  runConfig: ModelChipLlmWiring['activeConfig']
}

/**
 * The API side a chat chip offers. As a chooser for a run it shows the API
 * config runs work on, with nothing to pick: picking here would change the
 * chat's own model, and a run cannot carry an API config of its own.
 */
function chooserApiSide(
  llm: ModelChipLlmWiring,
  chooser: boolean,
): Pick<ModelChipLlmWiring, 'activeConfig' | 'recents' | 'configs'> {
  return chooser
    ? { activeConfig: llm.runConfig, recents: [], configs: [] }
    : { activeConfig: llm.activeConfig, recents: llm.recents, configs: llm.configs }
}

/**
 * CLI-aware leaf: mounted only when a `chatContext` is present, so the shared
 * `useChatChipCli` wiring (which requires a context) is never called
 * conditionally — the per-chat CLI runner binding, or a chooser for a run.
 */
function ModelChipWithCli({
  chatContext,
  llm,
  note,
  ...overrides
}: {
  chatContext: ChatContext
  llm: ModelChipLlmWiring
  note?: string
} & ChatChipCliOverrides) {
  const cli = useChatChipCli(chatContext, overrides)
  const api = chooserApiSide(llm, cli.chooser)

  return (
    <ModelChipBase
      provider={llm.provider}
      model={cli.useCli ? cli.selectedCliModelId : llm.model}
      className={llm.className}
      editable={llm.editable}
      mode={llm.mode}
      activeConfig={api.activeConfig}
      recents={api.recents}
      configs={api.configs}
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
      authWarning={cli.authWarning}
      cliSwitchError={cli.cliSwitchError}
      {...(note ? { note } : {})}
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
  apiOnly,
  apiOnlyReason,
}: {
  llm: ModelChipLlmWiring
  cliModel: ActivityCliModel | null
  setCliModel: (model: ActivityCliModel | null) => void
  recentCliModels: ActivityCliModel[]
  apiOnly?: boolean
  apiOnlyReason?: string
}) {
  const cli = useActivityChipCli(cliModel, setCliModel, recentCliModels)
  // For an API-only app, ignore any (global) CLI selection: the chip shows + uses the API config,
  // matching useProjectDataBridge, which omits the CLI model for these apps.
  const useCli = apiOnly ? false : cli.useCli

  return (
    <ModelChipBase
      provider={llm.provider}
      model={useCli ? cli.selectedCliModelId : llm.model}
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
      onToggleUseCli={cli.onToggleUseCli}
      enabledClis={cli.enabledClis}
      activeCli={cli.selectedCli}
      onPickCli={cli.onPickCli}
      cliModels={cli.cliModels}
      onPickCliModel={cli.onPickCliModel}
      recentCliModels={cli.recentCliModels}
      onPickRecentCli={cli.onPickRecentCli}
      authWarning={useCli ? cli.authWarning : undefined}
      cliDisabled={apiOnly}
      cliDisabledReason={apiOnly ? (apiOnlyReason ?? ACTIVITY_API_ONLY_REASON) : undefined}
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
      authWarning={cli.authWarning}
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
  apiOnly,
  apiOnlyReason,
  overrideModel,
  onOverrideModel,
  overrideCli,
  onOverrideCli,
  overrideApi,
  onOverrideApi,
  note,
}: ModelChipConnectedProps) {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const {
    configs,
    activeChatConfig,
    activeAgentRunConfig,
    activeActivityConfig,
    recentChatConfigs,
    recentAgentRunConfigs,
    recentActivityConfigs,
    setActiveChat,
    setActiveAgentRun,
    setActiveActivity,
    setActiveRunnerKind,
    activeActivityCliModel,
    setActiveActivityCliModel,
    recentActivityCliModels,
  } = useLLMConfigs()

  // Each mode drives its OWN persisted selection: chat → activeChatConfig, activity → activeActivityConfig
  // (the model background jobs run on; `useProjectDataBridge` sends it as the activity `llmConfigId`),
  // agent-run → activeAgentRunConfig (the Run button). The activity chip falls back to DISPLAY the
  // agent-run config until one is picked — mirroring the bridge's `activeActivityConfigId ?? activeAgentRunConfigId`.
  const activeConfig =
    mode === 'chat'
      ? activeChatConfig
      : mode === 'activity'
        ? (activeActivityConfig ?? activeAgentRunConfig)
        : activeAgentRunConfig
  const recents =
    mode === 'chat'
      ? recentChatConfigs
      : mode === 'activity'
        ? recentActivityConfigs
        : recentAgentRunConfigs

  const onPick = useCallback(
    (id: string) => {
      if (mode === 'chat') return setActiveChat(id)
      if (mode === 'activity') return setActiveActivity(id)
      return setActiveAgentRun(id)
    },
    [mode, setActiveChat, setActiveActivity, setActiveAgentRun],
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

  const baseRunConfig = useMemo(
    () =>
      activeAgentRunConfig
        ? {
            id: activeAgentRunConfig.id,
            name: activeAgentRunConfig.name,
            provider: activeAgentRunConfig.provider,
            model: activeAgentRunConfig.model,
          }
        : null,
    [activeAgentRunConfig],
  )

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
    runConfig: baseRunConfig,
    recents: baseRecents,
    configs: baseConfigs,
    onPick,
    onOpenSettings,
  }

  if (chatContext) {
    return (
      <ModelChipWithCli
        chatContext={chatContext}
        llm={llm}
        overrideModel={overrideModel}
        {...(onOverrideModel ? { onOverrideModel } : {})}
        overrideCli={overrideCli}
        {...(onOverrideCli ? { onOverrideCli } : {})}
        {...(overrideApi ? { overrideApi } : {})}
        {...(onOverrideApi ? { onOverrideApi } : {})}
        {...(note ? { note } : {})}
      />
    )
  }

  if (mode === 'activity') {
    return (
      <ModelChipActivityCli
        llm={llm}
        cliModel={activeActivityCliModel}
        setCliModel={setActiveActivityCliModel}
        recentCliModels={recentActivityCliModels}
        apiOnly={apiOnly}
        apiOnlyReason={apiOnlyReason}
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
