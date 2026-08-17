import { useCallback, useEffect, useState } from 'react'

import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import type { ModelInfo } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { useLLMConfigs, type ActivityCliModel } from '../contexts/LLMConfigsContext'
import { deriveCliAuthWarning, type CliAuthWarning } from '../utils/cliRunner'

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
  } = useLLMConfigs()
  const {
    enabledClis,
    activeCli,
    activeCliCredentialId,
    caches,
    cachesByCli,
    defaultModel,
    effort,
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

  const selectionForCli = useCallback(
    (cli: string): ActivityCliModel => ({
      cli: cli as ActivityCliModel['cli'],
      modelId: defaultModel[cli],
      effort: effort[cli] as ActivityCliModel['effort'],
      credentialId: credentialForCli(cli),
    }),
    [defaultModel, effort, credentialForCli],
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
        effort: (cliModel?.effort ?? effort[selectedCli]) as ActivityCliModel['effort'],
        credentialId: cliModel?.credentialId ?? credentialForCli(selectedCli),
      })
    },
    [selectedCli, cliModel, effort, credentialForCli, setActiveRunnerKind, setCliModel],
  )

  const onPickRecentCli = useCallback(
    (model: ActivityCliModel) => {
      setActiveRunnerKind('cli')
      setCliModel({ ...model, credentialId: model.credentialId ?? credentialForCli(model.cli) })
    },
    [credentialForCli, setActiveRunnerKind, setCliModel],
  )

  return {
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
