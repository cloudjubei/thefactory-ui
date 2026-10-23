import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ModelChoice } from 'thefactory-tools/types'
import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import type { CliReasoningEffort, CliTool, ModelInfo } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { useLLMConfigs } from '../contexts/LLMConfigsContext'
import { deriveCliAuthWarning } from '../utils/cliRunner'
import {
  projectOverviewApiChoice,
  projectOverviewCliChoice,
  projectOverviewCliModelChoice,
  projectOverviewEffortChoice,
  projectOverviewModelView,
  projectOverviewSwitch,
} from '../utils/projectOverviewModel'
import type {
  ProjectOverviewModelChipWiring,
  ProjectOverviewModelConfig,
} from '../utils/projectOverviewModelTypes'
import { useModelEffort } from './useModelEffort'
import { useProjectOverviewModelSetting } from './useProjectOverviewModelSetting'

/**
 * The model that writes every project's overview, wired for the shared model chip: Off, every stored API config —
 * with a key or without — and every CLI switched on with its models, read from and written to the user-global
 * setting. The web and native fields both take it, so the two clients stay identical.
 */
export function useProjectOverviewModelChip(): ProjectOverviewModelChipWiring {
  const setting = useProjectOverviewModelSetting()
  const { setModel } = setting
  const { configs: llmConfigs, isLoaded } = useLLMConfigs()
  const {
    enabledClis,
    activeCli,
    activeCliCredentialId,
    caches,
    cachesByCli,
    defaultModel,
    effort: cliEffort,
    modelEffort,
    probeModels,
    cachedLiveModels,
  } = useCliConfigs()

  const configs = useMemo(
    () =>
      llmConfigs.flatMap((c): ProjectOverviewModelConfig[] =>
        c.id
          ? [
              {
                id: c.id,
                name: c.name,
                provider: c.provider,
                model: c.model,
                ...(c.defaultEffort ? { defaultEffort: c.defaultEffort } : {}),
              },
            ]
          : [],
      ),
    [llmConfigs],
  )
  const view = projectOverviewModelView(setting.model, configs, enabledClis)
  const stored = view.off ? null : setting.model

  const credentialForCli = useCallback(
    (cli: string): string | undefined => {
      if (cli === activeCli && activeCliCredentialId) return activeCliCredentialId
      return cachesByCli[cli]?.[0]?.id
    },
    [activeCli, activeCliCredentialId, cachesByCli],
  )

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])
  const [cliLevels, setCliLevels] = useState<string[]>([])
  const cli = view.cli
  const credentialId = cli ? (view.credentialId ?? credentialForCli(cli)) : undefined
  const liveModels =
    cli && credentialId ? cachedLiveModels(cli as CliTool, credentialId) : undefined
  const effectiveCliModels = visibleCliModelsForAuth(liveModels ?? cliModels, 'subscription')
  const cliModelId = view.cliModelId ?? (cli ? defaultModel[cli] : undefined)

  useEffect(() => {
    if (!cli) {
      setCliModels([])
      setCliLevels([])
      return
    }
    let cancelled = false
    void probeModels(cli as CliTool)
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
  }, [cli, probeModels])

  const [switchError, setSwitchError] = useState<string | null>(null)
  const choose = useCallback(
    (next: ModelChoice | null) => {
      setSwitchError(null)
      void setModel(next)
    },
    [setModel],
  )

  const onPickOff = useCallback(() => choose(null), [choose])
  const onPickConfig = useCallback(
    (llmConfigId: string) => choose(projectOverviewApiChoice(llmConfigId)),
    [choose],
  )
  const onPickCli = useCallback((next: string) => choose(projectOverviewCliChoice(next)), [choose])
  const onToggleUseCli = useCallback(
    (next: boolean) => {
      const picked = projectOverviewSwitch(next, {
        activeConfig: view.activeConfig,
        configs,
        activeCli,
        enabledClis,
      })
      if ('choice' in picked) choose(picked.choice)
      else setSwitchError(picked.error)
    },
    [activeCli, enabledClis, view.activeConfig, configs, choose],
  )
  const onPickCliModel = useCallback(
    (modelId: string) => {
      if (cli) choose(projectOverviewCliModelChoice(stored, cli, modelId))
    },
    [cli, stored, choose],
  )
  const onPickEffort = useCallback(
    (next: CliReasoningEffort | undefined) => {
      if (stored) choose(projectOverviewEffortChoice(stored, next))
    },
    [stored, choose],
  )

  const effort = useModelEffort(
    view.useCli
      ? {
          runner: 'cli',
          ...(cliModelId ? { modelId: cliModelId } : {}),
          models: effectiveCliModels,
          cliLevels,
          ...(view.effort ? { choice: view.effort } : {}),
          ...(cli && cliModelId ? { modelDefault: modelEffort[cli]?.[cliModelId] } : {}),
          ...(cli ? { cliDefault: cliEffort[cli] } : {}),
        }
      : {
          runner: 'api',
          ...(view.activeConfig
            ? { provider: view.activeConfig.provider, model: view.activeConfig.model }
            : {}),
          ...(view.effort ? { choice: view.effort } : {}),
          ...(view.activeConfig?.defaultEffort
            ? { configDefault: view.activeConfig.defaultEffort }
            : {}),
        },
    onPickEffort,
  )

  return {
    loading: setting.loading || !isLoaded,
    off: view.off,
    onPickOff,
    configs,
    activeConfig: view.activeConfig,
    onPickConfig,
    useCli: view.useCli,
    onToggleUseCli,
    enabledClis,
    activeCli: cli,
    onPickCli,
    cliModels: effectiveCliModels,
    cliModelId,
    onPickCliModel,
    authWarning: view.useCli ? deriveCliAuthWarning(credentialId, caches) : { needsReauth: false },
    effort,
    switchError,
  }
}
