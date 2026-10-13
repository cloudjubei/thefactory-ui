import { useCallback, useEffect, useState } from 'react'

import { visibleCliModelsForAuth } from 'thefactory-tools/utils'

import type { ChatContext, ModelInfo } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { deriveCliAuthWarning, type CliAuthWarning } from '../utils/cliRunner'
import { chatChipCliSelection } from '../utils/modelChip'
import { useChatCliRunner } from './useChatCliRunner'

/** A chat chip's run picks, when it chooses for a run about to start rather than for the chat. */
export type ChatChipCliOverrides = {
  /** Show THIS model instead of the chat's, without changing the chat. */
  overrideModel?: string | undefined
  /** Picking a model calls this instead of re-binding the chat's runner. */
  onOverrideModel?: (modelId: string) => void
  /** Show THIS CLI instead of the chat's, without changing the chat. */
  overrideCli?: string | undefined
  /** Picking a CLI calls this instead of re-binding the chat's runner. */
  onOverrideCli?: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  /** The API was picked for the run, over the chat's CLI. */
  overrideApi?: boolean
  /** Switching to the API calls this instead of detaching the chat's runner. */
  onOverrideApi?: () => void
}

/** The `ModelChip` CLI props of a chat's chip. */
export type ChatChipCliWiring = {
  /** The chip chooses for a run about to start, not for the chat. */
  chooser: boolean
  useCli: boolean
  selectedCli: string | null
  selectedCliModelId: string | undefined
  enabledClis: string[]
  cliModels: ModelInfo[]
  authWarning: CliAuthWarning
  /** Why the last switch between API and CLI failed. */
  cliSwitchError: string | null
  onToggleUseCli: (next: boolean) => void
  onPickCli: (cli: string) => void
  onPickCliModel: (modelId: string) => void
}

/**
 * Shared chat-chip CLI wiring: the chat's own CLI binding — attached, switched
 * and detached through the backend — or, given {@link ChatChipCliOverrides}, a
 * chooser for a run about to start that seeds from the chat and reports every
 * pick — the API or a CLI, a model — without ever changing what the
 * conversation runs on. The web and native
 * connected chips both use it, so the two behave the same; only rendering
 * differs.
 */
export function useChatChipCli(
  chatContext: ChatContext,
  overrides: ChatChipCliOverrides = {},
): ChatChipCliWiring {
  const { overrideModel, onOverrideModel, overrideCli, onOverrideCli, overrideApi, onOverrideApi } =
    overrides
  const chooser = onOverrideCli !== undefined
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
  const { cliRunner, attach, detach } = useChatCliRunner(chatContext)

  const credentialForCli = useCallback(
    (cli: string): string | undefined => {
      if (cli === activeCli && activeCliCredentialId) return activeCliCredentialId
      return cachesByCli[cli]?.[0]?.id
    },
    [activeCli, activeCliCredentialId, cachesByCli],
  )

  const [cliModels, setCliModels] = useState<ModelInfo[]>([])

  const { useCli, selectedCli, selectedCliModelId, credentialId } = chatChipCliSelection({
    cliRunner: cliRunner ?? null,
    activeCli: activeCli ?? null,
    activeCliCredentialId: activeCliCredentialId ?? null,
    defaultModel,
    ...(overrideModel !== undefined ? { overrideModel } : {}),
    ...(overrideCli !== undefined ? { overrideCli } : {}),
    ...(overrideApi ? { overrideApi } : {}),
  })
  const authWarning = useCli ? deriveCliAuthWarning(credentialId, caches) : { needsReauth: false }
  const isApiKeyChat = !!cliRunner?.apiKeyCredentialId
  const liveModels =
    !isApiKeyChat && selectedCli && credentialId
      ? (cachedLiveModels(selectedCli as Parameters<typeof cachedLiveModels>[0], credentialId) ??
        undefined)
      : undefined
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

  const [cliSwitchError, setCliSwitchError] = useState<string | null>(null)

  const onToggleUseCli = useCallback(
    (next: boolean) => {
      setCliSwitchError(null)
      if (next) {
        const tool = cliRunner?.tool ?? activeCli ?? enabledClis[0]
        if (!tool) {
          setCliSwitchError('No CLI agent is enabled. Enable one in Settings → CLI Agents.')
          return
        }
        if (onOverrideCli) {
          onOverrideCli(tool, credentialForCli(tool), defaultModel[tool])
          return
        }
        void attach({
          tool,
          credentialId: credentialForCli(tool),
          model: defaultModel[tool],
          effort: effort[tool],
        }).catch((err: unknown) =>
          setCliSwitchError(err instanceof Error ? err.message : String(err)),
        )
      } else if (onOverrideCli) {
        onOverrideApi?.()
      } else {
        void detach().catch((err: unknown) =>
          setCliSwitchError(err instanceof Error ? err.message : String(err)),
        )
      }
    },
    [
      cliRunner,
      activeCli,
      enabledClis,
      credentialForCli,
      defaultModel,
      effort,
      attach,
      detach,
      onOverrideCli,
      onOverrideApi,
    ],
  )

  const onPickCli = useCallback(
    (cli: string) => {
      setCliSwitchError(null)
      if (onOverrideCli) {
        onOverrideCli(cli, credentialForCli(cli), defaultModel[cli])
        return
      }
      void attach({
        tool: cli,
        credentialId: credentialForCli(cli),
        model: defaultModel[cli],
        effort: effort[cli],
      })
    },
    [credentialForCli, defaultModel, effort, attach, onOverrideCli],
  )

  const onPickCliModel = useCallback(
    (modelId: string) => {
      if (!selectedCli) return
      if (onOverrideModel) {
        onOverrideModel(modelId)
        return
      }
      void attach({
        tool: selectedCli,
        credentialId: cliRunner?.credentialId ?? credentialForCli(selectedCli),
        apiKeyCredentialId: cliRunner?.apiKeyCredentialId,
        model: modelId,
        effort: cliRunner?.effort ?? effort[selectedCli],
      })
    },
    [selectedCli, cliRunner, credentialForCli, effort, attach, onOverrideModel],
  )

  return {
    chooser,
    useCli,
    selectedCli,
    selectedCliModelId,
    enabledClis,
    cliModels: effectiveCliModels,
    authWarning,
    cliSwitchError,
    onToggleUseCli,
    onPickCli,
    onPickCliModel,
  }
}
