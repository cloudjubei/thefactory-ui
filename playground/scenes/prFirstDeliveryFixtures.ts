import type {
  DeliverySettings,
  ProcessCleanupList,
  ProcessRunPublication,
} from 'thefactory-tools/types'
import { PROCESS_CLEANUP_HOST_REASONS } from 'thefactory-tools/constants'
import {
  deliveryDraftOf,
  deliverySettingsView,
  processMergeRows,
  processPublicationView,
  processPublishEdits,
  processPublishView,
  type DeliveryFormDraft,
  type DeliveryMainGroup,
  type DeliveryOwner,
  type ProcessDeliveryData,
  type ProcessDeliveryRepo,
  type ProcessMergeProgress,
  type ProcessPublishEdit,
  type UseProcessCleanup,
} from 'thefactory-ui/headless'

export const DELIVERY_GROUP: DeliveryOwner = { kind: 'group', groupId: 'shop' }
export const DELIVERY_PROJECT: DeliveryOwner = { kind: 'project', projectId: 'shop-web' }

export const DELIVERY_FULL: DeliverySettings = {
  branchTemplate: 'feature/{ticket}-{short}',
  baseBranch: 'dev',
  prFirst: true,
  mergeMethod: 'squash',
}

export const DELIVERY_MAIN_GROUP: DeliveryMainGroup = {
  title: 'Shop',
  type: 'MAIN',
  delivery: DELIVERY_FULL,
}

/** One state of the delivery form: who owns it, what is saved and what is typed. */
export type DeliveryFormState = {
  owner: DeliveryOwner
  saved?: DeliverySettings
  draft?: DeliveryFormDraft
  scope?: boolean
  error?: string
}

export const DELIVERY_FORM_STATES: Record<string, DeliveryFormState> = {
  'group-default': { owner: DELIVERY_GROUP },
  'group-pr-first': { owner: DELIVERY_GROUP, saved: DELIVERY_FULL },
  typing: {
    owner: DELIVERY_GROUP,
    saved: DELIVERY_FULL,
    draft: { ...deliveryDraftOf(DELIVERY_FULL, 'group'), branchTemplate: 'fix/{ticket}' },
  },
  'bad-template': {
    owner: DELIVERY_GROUP,
    draft: { ...deliveryDraftOf(undefined, 'group'), branchTemplate: 'feature/{short}' },
  },
  'bad-base': {
    owner: DELIVERY_GROUP,
    draft: { ...deliveryDraftOf(undefined, 'group'), baseBranch: 'dev branch' },
  },
  'project-inherits': { owner: DELIVERY_PROJECT },
  'project-overrides': {
    owner: DELIVERY_PROJECT,
    saved: { branchTemplate: 'web/{ticket}', prFirst: false, mergeMethod: 'rebase' },
  },
  scope: { owner: DELIVERY_GROUP, scope: true },
  'save-failed': {
    owner: DELIVERY_GROUP,
    draft: { ...deliveryDraftOf(DELIVERY_FULL, 'group'), baseBranch: 'main' },
    saved: DELIVERY_FULL,
    error: 'The backend is temporarily unavailable. Try again in a moment.',
  },
}

/** The form's view for one state. */
export function deliveryFormView(state: DeliveryFormState, draft: DeliveryFormDraft) {
  const project = state.owner.kind === 'project'
  return deliverySettingsView({
    owner: state.owner,
    title: project ? 'Shop web' : state.scope ? 'Checkout team' : 'Shop',
    ...(project
      ? { mainGroup: DELIVERY_MAIN_GROUP }
      : { groupType: state.scope ? 'SCOPE' : 'MAIN' }),
    saved: state.saved,
    draft,
  })
}

export const deliveryFormDraft = (state: DeliveryFormState): DeliveryFormDraft =>
  state.draft ?? deliveryDraftOf(state.saved, state.owner.kind)

const RUN_WEB = '9e36e753-36eb-4fcc-81b6-381974fae2b2'
const RUN_API = '4c1d2e3f-0a9b-4c8d-9e7f-6a5b4c3d2e1f'

export const PUBLICATION: ProcessRunPublication = {
  remoteBranch: 'feature/abc-123-add-dark-mode',
  localBranch: 'feature/abc-123-add-dark-mode',
  sha: '5f2c9e1a7b3d4c6e8f0a1b2c3d4e5f6a7b8c9d0e',
  onto: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  pullRequest: {
    url: 'https://github.com/example/shop-web/pull/42',
    number: 42,
    provider: 'github',
  },
  status: 'open',
  at: Date.parse('2026-11-17T09:00:00.000Z'),
}

const API_PUBLICATION: ProcessRunPublication = {
  ...PUBLICATION,
  remoteBranch: 'feature/abc-123-dark-mode-tokens',
  localBranch: 'feature/abc-123-dark-mode-tokens',
  pullRequest: {
    url: 'https://github.com/example/shop-api/pull/17',
    number: 17,
    provider: 'github',
  },
}

const WEB: ProcessDeliveryRepo = {
  runId: RUN_WEB,
  projectId: 'shop-web',
  legId: 'shop-web',
  name: 'Shop web',
  ticket: 'ABC-123',
  branchTemplate: 'feature/{ticket}-{short}',
  short: 'add-dark-mode',
  prTitle: 'Add a dark mode to the storefront',
  baseBranch: 'dev',
  account: 'shop-bot (GitHub)',
  changed: true,
}

const API: ProcessDeliveryRepo = {
  ...WEB,
  runId: RUN_API,
  projectId: 'shop-api',
  legId: 'shop-api',
  name: 'Shop API',
  short: 'dark-mode-tokens',
  prTitle: 'Serve the dark mode colour tokens',
}

const DOCS: ProcessDeliveryRepo = {
  ...WEB,
  runId: RUN_API,
  projectId: 'shop-docs',
  legId: 'shop-docs',
  name: 'Shop docs',
  short: '',
  prTitle: '',
  changed: false,
}

/** One state of the publish card. */
export type PublishState = {
  data: ProcessDeliveryData
  edits?: Record<string, ProcessPublishEdit>
  publishing?: boolean
  error?: string
}

export const PUBLISH_STATES: Record<string, PublishState> = {
  ready: { data: { repos: [WEB] } },
  group: { data: { repos: [API, WEB, DOCS] } },
  editing: {
    data: { repos: [WEB] },
    edits: { 'shop-web': { short: 'Night theme toggle', prTitle: 'Add a night theme toggle' } },
  },
  'no-branch': {
    data: { repos: [WEB] },
    edits: { 'shop-web': { short: '!!', prTitle: '' } },
  },
  'no-account': { data: { repos: [{ ...WEB, account: undefined }] } },
  'two-accounts': { data: { repos: [API, { ...WEB, account: 'shop-web-bot (GitHub)' }] } },
  publishing: { data: { repos: [WEB] }, publishing: true },
  failed: {
    data: { repos: [WEB] },
    error: 'Someone else pushed to feature/abc-123-add-dark-mode. Nothing was published.',
  },
}

export function publishCardView(state: PublishState) {
  return processPublishView(state.data, state.edits ?? processPublishEdits(state.data), {
    publishing: state.publishing ?? false,
    ...(state.error ? { error: state.error } : {}),
  })
}

export const PUBLICATION_STATES = {
  open: processPublicationView(PUBLICATION)!,
  merged: processPublicationView({ ...PUBLICATION, status: 'merged' })!,
  closed: processPublicationView({ ...PUBLICATION, status: 'closed' })!,
  'no-pull-request': processPublicationView({
    remoteBranch: PUBLICATION.remoteBranch,
    localBranch: PUBLICATION.localBranch,
    sha: PUBLICATION.sha,
    onto: PUBLICATION.onto,
    status: 'open',
    at: PUBLICATION.at,
  })!,
}

const merging = (
  repo: ProcessDeliveryRepo,
  publication: ProcessRunPublication,
  merge: Omit<ProcessMergeProgress, 'at'>,
): ProcessDeliveryRepo => ({ ...repo, publication, merge: { ...merge, at: PUBLICATION.at } })

const CHECKS = 'https://github.com/example/shop-web/pull/42/checks'

export const MERGE_STATES = {
  'bringing-in-base': processMergeRows({
    repos: [merging(WEB, PUBLICATION, { phase: 'bringing-in-base', method: 'squash' })],
  }),
  'waiting-for-checks': processMergeRows({
    repos: [merging(WEB, PUBLICATION, { phase: 'waiting-for-checks', checksUrl: CHECKS })],
  }),
  merged: processMergeRows({
    repos: [merging(WEB, { ...PUBLICATION, status: 'merged' }, { phase: 'merged' })],
  }),
  'already-merged': processMergeRows({
    repos: [merging(WEB, { ...PUBLICATION, status: 'merged' }, { phase: 'already-merged' })],
  }),
  conflict: processMergeRows({ repos: [merging(WEB, PUBLICATION, { phase: 'conflict' })] }),
  'checks-failed': processMergeRows({
    repos: [
      merging(WEB, PUBLICATION, {
        phase: 'checks-failed',
        checksUrl: CHECKS,
        failedChecks: ['build', 'e2e'],
      }),
    ],
  }),
  legs: processMergeRows({
    repos: [
      merging(API, { ...API_PUBLICATION, status: 'merged' }, { phase: 'merged' }),
      merging(WEB, PUBLICATION, { phase: 'waiting-for-checks', checksUrl: CHECKS }),
    ],
  }),
}

export type MergeStateId = keyof typeof MERGE_STATES

const cleanupOf = (list: ProcessCleanupList): UseProcessCleanup => ({
  list,
  loadError: null,
  actionError: null,
  busy: false,
  setItemSelected: async () => {},
  setOff: async () => {},
})

/** A cleanup list with two context docs the run found untracked: unticked, with their reason. */
export const CONTEXT_DOC_CLEANUP = cleanupOf({
  runId: RUN_WEB,
  off: false,
  hasStep: true,
  items: [
    {
      id: 'path::docs/dark-mode-plan.md',
      kind: 'path',
      ref: 'docs/dark-mode-plan.md',
      label: 'docs/dark-mode-plan.md',
      reason: PROCESS_CLEANUP_HOST_REASONS.contextDoc,
      registeredBy: 'host',
      defaultSelected: false,
      selected: false,
    },
    {
      id: 'path::notes/colour-audit.md',
      kind: 'path',
      ref: 'notes/colour-audit.md',
      label: 'notes/colour-audit.md',
      reason: PROCESS_CLEANUP_HOST_REASONS.contextDoc,
      registeredBy: 'host',
      defaultSelected: false,
      selected: true,
    },
    {
      id: 'path::.factory/evidence/run-1',
      kind: 'path',
      ref: '.factory/evidence/run-1',
      label: 'Screen captures of this run',
      reason: PROCESS_CLEANUP_HOST_REASONS.evidence,
      registeredBy: 'host',
      defaultSelected: true,
      selected: true,
    },
  ],
})
