import type { DeliveryMergeMethod, DeliverySettings } from 'thefactory-tools/types'
import type { SignOffOutputOwner } from './signOffOutputSettingsTypes'

/** The project or the group whose delivery settings these are. */
export type DeliveryOwner = SignOffOutputOwner

/** Whether pull requests come first: as the group says (a project only), on, or off. */
export type DeliveryPrFirstChoice = 'inherit' | 'on' | 'off'

/** How Accept merges: as the group or the repo decides, or one method pinned. */
export type DeliveryMergeChoice = DeliveryMergeMethod | 'inherit'

/** What the delivery form holds. Empty text takes what comes from above. */
export interface DeliveryFormDraft {
  branchTemplate: string
  baseBranch: string
  prFirst: DeliveryPrFirstChoice
  mergeMethod: DeliveryMergeChoice
}

/** One answer of a switch, with its words. */
export interface DeliveryChoiceOption<T extends string> {
  value: T
  label: string
}

/** Why a field cannot be saved as it is. */
export interface DeliveryDraftProblems {
  branchTemplate?: string
  baseBranch?: string
}

/** The main group a project's settings fall back to. */
export interface DeliveryMainGroup {
  title: string
  type: 'MAIN' | 'SCOPE'
  delivery?: DeliverySettings
}

/** A branch name the template makes for a sample run, or why it makes none. */
export type DeliveryBranchPreview = { branch: string } | { error: string }

/** What `deliverySettingsView` is read from. */
export interface DeliverySettingsInput {
  owner: DeliveryOwner
  title: string
  /** The group's type, when the owner is a group. */
  groupType?: 'MAIN' | 'SCOPE'
  saved: DeliverySettings | undefined
  draft: DeliveryFormDraft
  /** The project's main group, when the owner is a project. */
  mainGroup?: DeliveryMainGroup
}

/** The delivery form as Settings shows it. */
export interface DeliverySettingsView {
  intro: string
  /** A scope group's delivery reaches nobody, so it is read-only. */
  editable: boolean
  templatePlaceholder: string
  basePlaceholder: string
  /** The template in use, filled for a sample run. */
  preview: DeliveryBranchPreview
  problems: DeliveryDraftProblems
  prFirstOptions: DeliveryChoiceOption<DeliveryPrFirstChoice>[]
  mergeOptions: DeliveryChoiceOption<DeliveryMergeChoice>[]
  /** The form differs from what is saved. */
  dirty: boolean
  canSave: boolean
}
