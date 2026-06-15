import { useCallback, useEffect, useRef, useState } from 'react'

import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import type { ModelInfo } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import type { ActivityCliModel } from '../contexts/LLMConfigsContext'

/** The `ModelChip` CLI props derived from the persisted activity CLI selection. */
export type ActivityChipCliWiring = {
  useCli: boolean
  selectedCli: string | null
  selectedCliModelId: string | undefined
  enabledClis: string[]
  cliModels: ModelInfo[]
  /** Recently-selected CLI agent+model picks, most-recent first, for the chip's recents list. */
  recentCliModels: ActivityCliModel[]
  onToggleUseCli: (next: boolean) => void
  onPickCli: (cli: string) => void
  onPickCliModel: (modelId: string) => void
  /** Apply a recents entry as the activity CLI selection. */
  onPickRecentCli: (model: ActivityCliModel) => void
}

/**
 * Shared activity-chip CLI wiring: turns the persisted `activeActivityCliModel`
 * selection into the `ModelChip` CLI props (API/CLI toggle, CLI list, model
 * list), backed by `useCliConfigs`. The web + native connected `ModelChip` both
 * drive the activity CLI selection through this hook so the two clients stay
 * identical — only the chip rendering differs. Activities always run on a
 * subscription credential (the backend resolves it, falling back to the CLI's
 * active login), so the model list is filtered for `'subscription'`.
 */
export function useActivityChipCli(
  cliModel: ActivityCliModel | null,
  setCliModel: (model: ActivityCliModel | null) => void,
  recentCliModels: ActivityCliModel[] = [],
): ActivityChipCliWiring {
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

  const credentialForCli = useCallback(
    (cli: string): string | undefined => {
      if (cli === activeCli && activeCliCredentialId) return activeCliCredentialId
      return cachesByCli[cli]?.[0]?.id
    },
    [activeCli, activeCliCredentialId, cachesByCli],
  )

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])

  const useCli = !!cliModel
  const selectedCli = cliModel?.cli ?? activeCli ?? null
  const selectedCliModelId = cliModel?.modelId
  const credentialId = cliModel?.credentialId ?? activeCliCredentialId ?? undefined
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

  // Follow the active CLI agent: when it CHANGES during the session while the chip
  // is in CLI mode, retarget the activity selection to the new agent (preferring its
  // most-recent model pick, else its default). Read recents via a ref so the effect
  // depends ONLY on a real `activeCli` change — not on every recents update (which
  // would churn the effect) — and anchor on the first non-null `activeCli` so the
  // initial async load of CliConfigs does NOT override the persisted selection.
  const recentRef = useRef(recentCliModels)
  recentRef.current = recentCliModels
  const anchoredCli = useRef<string | null>(null)
  const anchored = useRef(false)
  useEffect(() => {
    if (!anchored.current) {
      if (activeCli) {
        anchored.current = true
        anchoredCli.current = activeCli
      }
      return
    }
    if (anchoredCli.current === activeCli) return
    anchoredCli.current = activeCli
    if (!cliModel || !activeCli || cliModel.cli === activeCli) return
    const recalled = recentRef.current.find((m) => m.cli === activeCli)
    setCliModel(recalled ?? selectionForCli(activeCli))
  }, [activeCli, cliModel, selectionForCli, setCliModel])

  const onToggleUseCli = useCallback(
    (next: boolean) => {
      if (next) {
        const tool = activeCli ?? enabledClis[0]
        if (!tool) return
        setCliModel(selectionForCli(tool))
      } else {
        setCliModel(null)
      }
    },
    [activeCli, enabledClis, selectionForCli, setCliModel],
  )

  const onPickCli = useCallback(
    (cli: string) => {
      setCliModel(selectionForCli(cli))
    },
    [selectionForCli, setCliModel],
  )

  const onPickCliModel = useCallback(
    (modelId: string) => {
      if (!selectedCli) return
      setCliModel({
        cli: selectedCli as ActivityCliModel['cli'],
        modelId,
        effort: (cliModel?.effort ?? effort[selectedCli]) as ActivityCliModel['effort'],
        credentialId: cliModel?.credentialId ?? credentialForCli(selectedCli),
      })
    },
    [selectedCli, cliModel, effort, credentialForCli, setCliModel],
  )

  const onPickRecentCli = useCallback(
    (model: ActivityCliModel) => {
      setCliModel({ ...model, credentialId: model.credentialId ?? credentialForCli(model.cli) })
    },
    [credentialForCli, setCliModel],
  )

  return {
    useCli,
    selectedCli,
    selectedCliModelId,
    enabledClis,
    cliModels: effectiveCliModels,
    recentCliModels,
    onToggleUseCli,
    onPickCli,
    onPickCliModel,
    onPickRecentCli,
  }
}
