import { useCallback, useEffect, useState } from 'react'

import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import type { CliReasoningEffort, ModelInfo } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { useLLMConfigs, type ActivityCliModel } from '../contexts/LLMConfigsContext'
import { deriveCliAuthWarning, type CliAuthWarning } from '../utils/cliRunner'
import type { ModelEffortSwitch } from '../utils/modelEffortTypes'
import { useModelEffort } from './useModelEffort'

/** The `ModelChip` CLI props derived from the agent-run (Run button) selection. */
export type AgentRunChipCliWiring = {
  useCli: boolean
  selectedCli: string | null
  selectedCliModelId: string | undefined
  enabledClis: string[]
  cliModels: ModelInfo[]
  recentCliModels: ActivityCliModel[]
  /** Whether the selected CLI credential needs re-auth (for the chip's warning badge). */
  authWarning: CliAuthWarning
  onToggleUseCli: (next: boolean) => void
  onPickCli: (cli: string) => void
  onPickCliModel: (modelId: string) => void
  onPickRecentCli: (model: ActivityCliModel) => void
  /** The effort switch for the side agent runs work on: the CLI model, or the API config. */
  effort: ModelEffortSwitch
}

/**
 * Agent-run (Run button) CLI wiring for the `ModelChip` — the sibling of
 * {@link useActivityChipCli}, but driven by the `activeRunnerKind` discriminator
 * instead of "CLI-non-null-wins":
 *   - `useCli` reflects `activeRunnerKind === 'cli'`, NOT whether a CLI pick
 *     exists — so toggling back to API PRESERVES the CLI pick for a quick flip.
 *   - the toggle is the ONLY thing that flips `activeRunnerKind`; Settings → LLM
 *     never does (changing the API agent there can't knock a CLI run to API).
 *   - there is no follow-the-active-CLI effect: changing the default CLI in
 *     Settings does not retarget the Run button.
 * Agent runs resolve a subscription credential server-side, so the model list is
 * filtered for `'subscription'`.
 */
export function useAgentRunChipCli(): AgentRunChipCliWiring {
  const {
    activeRunnerKind,
    setActiveRunnerKind,
    activeAgentRunCliModel: cliModel,
    setActiveAgentRunCliModel: setCliModel,
    recentAgentRunCliModels: recentCliModels,
    activeAgentRunConfig,
    activeAgentRunApiEffort,
    setActiveAgentRunApiEffort,
  } = useLLMConfigs()
  const {
    enabledClis,
    activeCli,
    activeCliCredentialId,
    caches,
    cachesByCli,
    defaultModel,
    effort,
    modelEffort,
    probeModels,
    cachedLiveModels,
  } = useCliConfigs()

  const credentialForCli = useCallback(
    (cli: string): string | undefined => {
      if (cli === activeCli && activeCliCredentialId) return activeCliCredentialId
      return cachesByCli[cli]?.[0]?.id
    },
    [activeCli, activeCliCredentialId, cachesByCli],
  )

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])
  const [cliLevels, setCliLevels] = useState<string[]>([])

  const useCli = activeRunnerKind === 'cli'
  const selectedCli = cliModel?.cli ?? activeCli ?? null
  const selectedCliModelId = cliModel?.modelId
  const credentialId = cliModel?.credentialId ?? activeCliCredentialId ?? undefined
  const authWarning = useCli ? deriveCliAuthWarning(credentialId, caches) : { needsReauth: false }
  const liveModels =
    selectedCli && credentialId
      ? (cachedLiveModels(selectedCli as Parameters<typeof cachedLiveModels>[0], credentialId) ??
        undefined)
      : undefined
  const effectiveCliModels = visibleCliModelsForAuth(liveModels ?? cliModels, 'subscription')

  useEffect(() => {
    if (!useCli || !selectedCli) {
      setCliModels([])
      setCliLevels([])
      return
    }
    let cancelled = false
    void probeModels(selectedCli as Parameters<typeof probeModels>[0])
      .then(({ models, efforts }) => {
        if (cancelled) return
        setCliModels(models)
        setCliLevels(efforts)
      })
      .catch(() => {
        if (cancelled) return
        setCliModels([])
        setCliLevels([])
      })
    return () => {
      cancelled = true
    }
  }, [useCli, selectedCli, probeModels])

  const selectionForCli = useCallback(
    (cli: string): ActivityCliModel => ({
      cli: cli as ActivityCliModel['cli'],
      modelId: defaultModel[cli],
      credentialId: credentialForCli(cli),
    }),
    [defaultModel, credentialForCli],
  )

  const onToggleUseCli = useCallback(
    (next: boolean) => {
      if (next) {
        // Resolve the CLI to run BEFORE flipping: if none is available (no
        // prior pick, no active CLI, none enabled), do NOT switch to CLI — that
        // would strand the Run button in 'cli' with no model (mirrors the
        // `if (!tool) return` guard in useActivityChipCli / ModelChipWithCli).
        const tool = cliModel?.cli ?? activeCli ?? enabledClis[0]
        if (!tool) return
        setActiveRunnerKind('cli')
        // Seed a CLI pick the first time CLI is enabled; keep the existing one otherwise.
        if (!cliModel) setCliModel(selectionForCli(tool))
      } else {
        // Flip back to API WITHOUT clearing the CLI pick (so a re-toggle restores it).
        setActiveRunnerKind('api')
      }
    },
    [cliModel, activeCli, enabledClis, selectionForCli, setActiveRunnerKind, setCliModel],
  )

  const onPickCli = useCallback(
    (cli: string) => {
      setActiveRunnerKind('cli')
      setCliModel(selectionForCli(cli))
    },
    [selectionForCli, setActiveRunnerKind, setCliModel],
  )

  const onPickCliModel = useCallback(
    (modelId: string) => {
      if (!selectedCli) return
      setActiveRunnerKind('cli')
      setCliModel({
        cli: selectedCli as ActivityCliModel['cli'],
        modelId,
        ...(cliModel?.effort ? { effort: cliModel.effort } : {}),
        credentialId: cliModel?.credentialId ?? credentialForCli(selectedCli),
      })
    },
    [selectedCli, cliModel, credentialForCli, setActiveRunnerKind, setCliModel],
  )

  const onPickRecentCli = useCallback(
    (model: ActivityCliModel) => {
      setActiveRunnerKind('cli')
      setCliModel({ ...model, credentialId: model.credentialId ?? credentialForCli(model.cli) })
    },
    [credentialForCli, setActiveRunnerKind, setCliModel],
  )

  const onPickEffort = useCallback(
    (next: CliReasoningEffort | undefined) => {
      if (useCli && cliModel) {
        const { effort: _kept, ...rest } = cliModel
        setCliModel(next ? { ...rest, effort: next } : rest)
        return
      }
      setActiveAgentRunApiEffort(next ?? null)
    },
    [useCli, cliModel, setCliModel, setActiveAgentRunApiEffort],
  )
  const effortSwitch = useModelEffort(
    useCli
      ? {
          runner: 'cli',
          ...(selectedCliModelId ? { modelId: selectedCliModelId } : {}),
          models: effectiveCliModels,
          cliLevels,
          ...(cliModel?.effort ? { choice: cliModel.effort } : {}),
          ...(selectedCli && selectedCliModelId
            ? { modelDefault: modelEffort[selectedCli]?.[selectedCliModelId] }
            : {}),
          ...(selectedCli ? { cliDefault: effort[selectedCli] } : {}),
        }
      : {
          runner: 'api',
          ...(activeAgentRunConfig
            ? { provider: activeAgentRunConfig.provider, model: activeAgentRunConfig.model }
            : {}),
          ...(activeAgentRunApiEffort ? { choice: activeAgentRunApiEffort } : {}),
          ...(activeAgentRunConfig?.defaultEffort
            ? { configDefault: activeAgentRunConfig.defaultEffort }
            : {}),
        },
    onPickEffort,
  )

  return {
    effort: effortSwitch,
    useCli,
    selectedCli,
    selectedCliModelId,
    enabledClis,
    cliModels: effectiveCliModels,
    recentCliModels,
    authWarning,
    onToggleUseCli,
    onPickCli,
    onPickCliModel,
    onPickRecentCli,
  }
}
