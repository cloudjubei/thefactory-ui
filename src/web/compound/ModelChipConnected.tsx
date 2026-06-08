import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getPrice, type ChatContext, type ModelInfo } from '../../headless/api'
import { ModelChip as ModelChipBase, type ModelChipMode } from './ModelChip'
import { useCliConfigs, useChatCliRunner, useLLMConfigs } from '../../headless'

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
  const { enabledClis, activeCli, activeCliCredentialId, probeModels } = useCliConfigs()
  const { cliRunner, attach, detach } = useChatCliRunner(chatContext)

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])
  const [selectedCliModelId, setSelectedCliModelId] = useState<string | undefined>(undefined)

  const useCli = !!cliRunner
  const selectedCli = cliRunner?.tool ?? activeCli ?? null

  useEffect(() => {
    if (!useCli || !selectedCli) {
      setCliModels([])
      return
    }
    let cancelled = false
    void probeModels(selectedCli as Parameters<typeof probeModels>[0])
      .then((models) => {
        if (cancelled) return
        setCliModels(models)
        setSelectedCliModelId((prev) =>
          prev && models.some((m) => m.id === prev) ? prev : models[0]?.id,
        )
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
        void attach({ tool, credentialId: activeCliCredentialId ?? undefined })
      } else {
        void detach()
      }
    },
    [activeCli, enabledClis, activeCliCredentialId, attach, detach],
  )

  const onPickCli = useCallback(
    (cli: string) => {
      void attach({ tool: cli, credentialId: activeCliCredentialId ?? undefined })
    },
    [activeCliCredentialId, attach],
  )

  const onPickCliModel = useCallback((modelId: string) => {
    setSelectedCliModelId(modelId)
  }, [])

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
      cliModels={cliModels}
      onPickCliModel={onPickCliModel}
    />
  )
}

/**
 * Connected `ModelChip` for browser clients: wires the LLM-config selection
 * (active / recents / configs) from `useLLMConfigs` and the "open LLM
 * settings" navigation into the presentational `ModelChip`. When a
 * `chatContext` is supplied, also surfaces the per-chat API/CLI toggle.
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
  } = useLLMConfigs()

  const activeConfig = mode === 'chat' ? activeChatConfig : activeAgentRunConfig
  const recents = mode === 'chat' ? recentChatConfigs : recentAgentRunConfigs

  const onPick = useCallback(
    (id: string) => (mode === 'chat' ? setActiveChat(id) : setActiveAgentRun(id)),
    [mode, setActiveChat, setActiveAgentRun],
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
