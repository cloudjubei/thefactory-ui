import type { DeliverySettings } from 'thefactory-tools/types'
import {
  DELIVERY_DEFAULT_BRANCH_TEMPLATE,
  DELIVERY_MERGE_METHODS,
} from 'thefactory-tools/constants'
import {
  deliveryBranchTemplateErrors,
  isGitBranchName,
  processPublishBranchName,
  resolveDeliverySettings,
} from 'thefactory-tools/utils'
import { validateDeliverySettings } from 'thefactory-tools/validations'
import {
  DELIVERY_MERGE_METHOD_LABELS,
  DELIVERY_PREVIEW_SAMPLE,
  DELIVERY_SETTINGS_COPY,
} from './deliverySettingsConstants'
import type {
  DeliveryBranchPreview,
  DeliveryChoiceOption,
  DeliveryDraftProblems,
  DeliveryFormDraft,
  DeliveryMergeChoice,
  DeliveryPrFirstChoice,
  DeliverySettingsInput,
  DeliverySettingsView,
} from './deliverySettingsTypes'

/** A delivery setting read from an untyped record's `delivery`, or `undefined` when it holds none it could keep. */
export function readDeliverySettings(record: unknown): DeliverySettings | undefined {
  const value = (record as { delivery?: unknown } | null | undefined)?.delivery
  return value !== undefined && validateDeliverySettings(value).valid
    ? (value as DeliverySettings)
    : undefined
}

/**
 * A project's metadata with this delivery setting. An empty one drops the key:
 * a project update replaces its metadata whole, so an absent key is none.
 */
export function withDeliverySettings(
  metadata: Record<string, unknown> | undefined,
  setting: DeliverySettings,
): Record<string, unknown> {
  const { delivery: _previous, ...rest } = metadata ?? {}
  return Object.keys(setting).length > 0 ? { ...rest, delivery: setting } : rest
}

/** The form for a saved setting. A group has nothing to inherit, so an unstated PR-first reads as off. */
export function deliveryDraftOf(
  setting: DeliverySettings | undefined,
  ownerKind: DeliverySettingsInput['owner']['kind'],
): DeliveryFormDraft {
  const unstated: DeliveryPrFirstChoice = ownerKind === 'group' ? 'off' : 'inherit'
  const prFirst: DeliveryPrFirstChoice =
    setting?.prFirst === undefined ? unstated : setting.prFirst ? 'on' : 'off'
  return {
    branchTemplate: setting?.branchTemplate ?? '',
    baseBranch: setting?.baseBranch ?? '',
    prFirst,
    mergeMethod: setting?.mergeMethod ?? 'inherit',
  }
}

/**
 * The setting a form saves: its text trimmed, every empty or inherited field
 * left out. A group's "off" is left out too: it is what no setting means.
 */
export function deliverySettingsOfDraft(
  draft: DeliveryFormDraft,
  ownerKind: DeliverySettingsInput['owner']['kind'],
): DeliverySettings {
  const branchTemplate = draft.branchTemplate.trim()
  const baseBranch = draft.baseBranch.trim()
  const prFirst =
    draft.prFirst === 'on'
      ? true
      : draft.prFirst === 'off' && ownerKind === 'project'
        ? false
        : undefined
  return {
    ...(branchTemplate ? { branchTemplate } : {}),
    ...(baseBranch ? { baseBranch } : {}),
    ...(prFirst !== undefined ? { prFirst } : {}),
    ...(draft.mergeMethod !== 'inherit' ? { mergeMethod: draft.mergeMethod } : {}),
  }
}

const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1) + '.'

/** Why the form cannot be saved as it is, field by field. Empty fields are always fine. */
export function deliveryDraftProblems(draft: DeliveryFormDraft): DeliveryDraftProblems {
  const template = draft.branchTemplate.trim()
  const base = draft.baseBranch.trim()
  const templateErrors = template ? deliveryBranchTemplateErrors(template) : []
  return {
    ...(templateErrors.length > 0
      ? { branchTemplate: sentence(templateErrors[0]!.replace(/^branchTemplate /, '')) }
      : {}),
    ...(base && !isGitBranchName(base) ? { baseBranch: DELIVERY_SETTINGS_COPY.badBase } : {}),
  }
}

/** The branch name `template` makes for a sample run, or why it makes none. */
export function deliveryBranchPreview(template: string): DeliveryBranchPreview {
  return processPublishBranchName(template, DELIVERY_PREVIEW_SAMPLE)
}

const onOff = (on: boolean) => (on ? DELIVERY_SETTINGS_COPY.on : DELIVERY_SETTINGS_COPY.off)

function prFirstOptions(
  input: DeliverySettingsInput,
  inherited: DeliverySettings,
): DeliveryChoiceOption<DeliveryPrFirstChoice>[] {
  const own: DeliveryChoiceOption<DeliveryPrFirstChoice>[] = [
    { value: 'on', label: DELIVERY_SETTINGS_COPY.on },
    { value: 'off', label: DELIVERY_SETTINGS_COPY.off },
  ]
  if (input.owner.kind === 'group') return own
  return [
    {
      value: 'inherit',
      label: DELIVERY_SETTINGS_COPY.fromGroup(onOff(inherited.prFirst === true)),
    },
    ...own,
  ]
}

function mergeOptions(
  input: DeliverySettingsInput,
  inherited: DeliverySettings,
): DeliveryChoiceOption<DeliveryMergeChoice>[] {
  const pinned = input.owner.kind === 'project' ? inherited.mergeMethod : undefined
  return [
    {
      value: 'inherit',
      label: pinned
        ? DELIVERY_SETTINGS_COPY.fromGroup(DELIVERY_MERGE_METHOD_LABELS[pinned])
        : DELIVERY_SETTINGS_COPY.repoChoice,
    },
    ...DELIVERY_MERGE_METHODS.map((method) => ({
      value: method,
      label: DELIVERY_MERGE_METHOD_LABELS[method],
    })),
  ]
}

function intro(input: DeliverySettingsInput): string {
  if (input.owner.kind === 'project') return DELIVERY_SETTINGS_COPY.projectIntro(input.title)
  return input.groupType === 'SCOPE'
    ? DELIVERY_SETTINGS_COPY.scopeIntro(input.title)
    : DELIVERY_SETTINGS_COPY.groupIntro(input.title)
}

/** Whether two settings say the same, field by field. */
export function sameDeliverySettings(a: DeliverySettings, b: DeliverySettings): boolean {
  return (
    a.branchTemplate === b.branchTemplate &&
    a.baseBranch === b.baseBranch &&
    a.prFirst === b.prFirst &&
    a.mergeMethod === b.mergeMethod
  )
}

/**
 * The delivery form as Settings shows it: what an empty field falls back to,
 * the branch name the template in use makes for a sample run, why a field
 * cannot be kept, and whether there is anything to save. A project falls back
 * to its main group, a group to the defaults.
 */
export function deliverySettingsView(input: DeliverySettingsInput): DeliverySettingsView {
  const inherited =
    input.owner.kind === 'project' && input.mainGroup?.type === 'MAIN'
      ? (input.mainGroup.delivery ?? {})
      : {}
  const effective = resolveDeliverySettings(
    deliverySettingsOfDraft(input.draft, input.owner.kind),
    { type: 'MAIN', delivery: inherited },
  )
  const problems = deliveryDraftProblems(input.draft)
  const kind = input.owner.kind
  const dirty = !sameDeliverySettings(
    deliverySettingsOfDraft(input.draft, kind),
    deliverySettingsOfDraft(deliveryDraftOf(input.saved, kind), kind),
  )
  const editable = input.owner.kind === 'project' || input.groupType !== 'SCOPE'
  return {
    intro: intro(input),
    editable,
    templatePlaceholder: inherited.branchTemplate ?? DELIVERY_DEFAULT_BRANCH_TEMPLATE,
    basePlaceholder: inherited.baseBranch ?? DELIVERY_SETTINGS_COPY.baseOwnRun,
    preview: deliveryBranchPreview(effective.branchTemplate),
    problems,
    prFirstOptions: prFirstOptions(input, inherited),
    mergeOptions: mergeOptions(input, inherited),
    dirty,
    canSave: editable && dirty && Object.keys(problems).length === 0,
  }
}
