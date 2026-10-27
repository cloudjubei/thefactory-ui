import { cliLabel, shortCliModelLabel } from './cliRunner'
import {
  MODEL_CHIP_OFF,
  MODEL_CHIP_PICK_MODEL,
  MODEL_CHIP_PICK_PROVIDER,
  MODEL_CHIP_PICK_TITLE,
  MODEL_CHIP_PROVIDER_LABELS,
  MODEL_CHIP_REAUTH_FALLBACK,
  MODEL_CHIP_UNKNOWN_PROVIDER,
  MODEL_CHIP_UNKNOWN_TITLE,
} from './modelChipConstants'
import type {
  ChatChipCliInput,
  ChatChipCliSelection,
  ModelChipConfigLike,
  ModelChipLabel,
  ModelChipLabelInput,
} from './modelChipTypes'
import { modelDisplayName } from './runModel'

/** A provider key as a person reads it: `openai` → `OpenAI`; an unknown one as given. */
export function modelChipProviderLabel(provider?: string): string {
  if (!provider) return ''
  return MODEL_CHIP_PROVIDER_LABELS[provider.toLowerCase()] ?? provider
}

/**
 * What a model chip says, the same on every client: the provider (or CLI) and
 * the model by its name (`claude-opus-5-5` → `Opus 5.5`) on two short lines,
 * and both in full as its title — the lines are
 * cut to the chip's width, the title never is. A chip switched off says Off.
 */
export function modelChipLabel(input: ModelChipLabelInput): ModelChipLabel {
  if (input.off) return { provider: '', model: MODEL_CHIP_OFF, title: MODEL_CHIP_OFF }
  let provider = modelChipProviderLabel(input.provider)
  let id = input.model ?? ''
  if ((!provider || !id) && input.activeConfig) {
    provider = modelChipProviderLabel(input.activeConfig.provider)
    id = input.activeConfig.model ?? ''
  }
  if (input.useCli) {
    provider = cliLabel(input.activeCli)
    id = input.model ?? ''
  }
  const named = id ? input.cliModels?.find((m) => m.id === id)?.label : undefined
  const model = named ? shortCliModelLabel(named) : id ? modelDisplayName(id) : ''
  const shown = [provider, model].filter(Boolean).join(' · ')
  const base = shown || (input.editable ? MODEL_CHIP_PICK_TITLE : MODEL_CHIP_UNKNOWN_TITLE)
  return {
    provider: provider || (input.editable ? MODEL_CHIP_PICK_PROVIDER : MODEL_CHIP_UNKNOWN_PROVIDER),
    model: model || (input.editable ? MODEL_CHIP_PICK_MODEL : ''),
    title:
      input.reauthMessage !== undefined
        ? `${base} — ${input.reauthMessage || MODEL_CHIP_REAUTH_FALLBACK}; re-authenticate in Settings`
        : base,
  }
}

/**
 * The config a selection runs on: the chosen one while it still exists, else
 * the first config — the one a send falls back to. A chosen id that was
 * deleted, or never chosen on this device, must not leave the chip blank while
 * the chat runs on something.
 */
export function activeLlmConfig<T extends ModelChipConfigLike & { id: string }>(
  configs: readonly T[],
  chosenId: string | null,
): T | null {
  return (chosenId ? configs.find((c) => c.id === chosenId) : undefined) ?? configs[0] ?? null
}

/**
 * The CLI side a chat's model chip shows. As the chat's own binding: its CLI
 * and model, else the active CLI at its default. As a chooser for a run about
 * to start: the run's picked CLI and model, seeded from the chat, never written
 * back to it. Pure.
 */
export function chatChipCliSelection(input: ChatChipCliInput): ChatChipCliSelection {
  const { cliRunner, overrideCli, overrideModel, defaultModel } = input
  const selectedCli = overrideCli ?? cliRunner?.tool ?? input.activeCli ?? null
  return {
    useCli: input.overrideApi !== true && (!!cliRunner || overrideCli !== undefined),
    selectedCli,
    selectedCliModelId:
      overrideModel ??
      (overrideCli ? defaultModel[overrideCli] : cliRunner?.model) ??
      (selectedCli ? defaultModel[selectedCli] : undefined),
    credentialId: cliRunner?.credentialId ?? input.activeCliCredentialId ?? undefined,
  }
}
