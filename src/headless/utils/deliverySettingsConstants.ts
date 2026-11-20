import type { DeliveryMergeMethod } from 'thefactory-tools/types'
import type { DeliveryFormDraft } from './deliverySettingsTypes'

/** A sample run the branch template is previewed with. */
export const DELIVERY_PREVIEW_SAMPLE = {
  ticket: 'ABC-123',
  ticketTitle: 'Add dark mode',
  short: 'add dark mode',
  runId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
} as const

export const DELIVERY_EMPTY_DRAFT: DeliveryFormDraft = {
  branchTemplate: '',
  baseBranch: '',
  prFirst: 'inherit',
  mergeMethod: 'inherit',
  prTitleTemplate: '',
}

export const DELIVERY_MERGE_METHOD_LABELS: Record<DeliveryMergeMethod, string> = {
  squash: 'Squash',
  merge: 'Merge',
  rebase: 'Rebase',
}

export const DELIVERY_SETTINGS_COPY = {
  heading: 'Delivery',
  groupIntro: (title: string) =>
    `How work in ${title}’s projects is published for review and merged. A project can change any of these.`,
  projectIntro: (title: string) =>
    `How ${title}’s work is published for review and merged. Anything left empty comes from its group.`,
  scopeIntro: (title: string) =>
    `${title} is a scope group, so its delivery reaches no project. Set it on the main group or the project.`,
  templateField: 'Branch name',
  templateHint: 'Use {ticket}, {short} and {runid8}. It needs {ticket} or {runid8}.',
  previewLabel: 'Preview',
  baseField: 'Base branch',
  baseHint: 'Where the work is published and merged.',
  baseOwnRun: 'The run’s own base',
  prFirstField: 'Pull request first',
  prFirstHint:
    'Publish one commit with a pull request before sign-off. Accept then merges that pull request.',
  titleField: 'PR title',
  titleHint: 'Use {ticket} and {ticketTitle}.',
  titleNone: 'The PR Text’s title, else the story’s',
  mergeField: 'Merge method',
  mergeHint: 'How Accept merges the pull request.',
  repoChoice: 'Repo’s choice',
  fromGroup: (value: string) => `Group: ${value}`,
  on: 'On',
  off: 'Off',
  save: 'Save',
  reset: 'Undo changes',
  loading: 'Loading…',
  saveFailed: 'The delivery settings could not be saved.',
  badBase: 'Not a valid branch name.',
} as const
