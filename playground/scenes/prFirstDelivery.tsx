import { useState, type ReactNode } from 'react'
import {
  PROCESS_CLEANUP_COPY,
  processCleanupHeadline,
  type DeliveryFormDraft,
  type ProcessPublishEdit,
} from 'thefactory-ui/headless'
import {
  DeliverySettingsPanel,
  MergeProgressList,
  PublicationChip,
  PublishCard,
} from 'thefactory-ui/web'
import { ProcessCleanupBody } from '../../src/web/compound/process/signoff/ProcessCleanupCard'
import type { Scene, SceneState } from '../showcase/types'
import {
  CONTEXT_DOC_CLEANUP,
  DELIVERY_FORM_STATES,
  MERGE_STATES,
  PUBLICATION_STATES,
  PUBLISH_STATES,
  deliveryFormDraft,
  deliveryFormView,
  publishCardView,
  type DeliveryFormState,
  type MergeStateId,
  type PublishState,
} from './prFirstDeliveryFixtures'

const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>
const noop = () => undefined
const kept = async () => true

function DeliveryForm({ state }: { state: DeliveryFormState }) {
  const [draft, setDraft] = useState<DeliveryFormDraft>(() => deliveryFormDraft(state))
  return (
    <DeliverySettingsPanel
      view={deliveryFormView(state, draft)}
      draft={draft}
      error={state.error ?? null}
      onChange={setDraft}
      onSave={kept}
      onReset={() => setDraft(deliveryFormDraft(state))}
    />
  )
}

const DELIVERY_STATE_TEXT: Record<string, { title: string; description: string }> = {
  'group-default': {
    title: 'A main group, nothing set',
    description:
      'Off, with the default template previewed. Type in the template to see the name change.',
  },
  'group-pr-first': {
    title: 'A main group, pull request first',
    description: 'Its own template, base branch dev and squash pinned.',
  },
  typing: {
    title: 'Typing a template',
    description: 'The preview follows each key, and Save and Undo changes appear.',
  },
  'bad-template': {
    title: 'A template that would share branches',
    description: 'It needs {ticket} or {runid8}: Save waits and there is no preview.',
  },
  'bad-base': { title: 'A base branch git would refuse', description: 'Said under the field.' },
  'project-inherits': {
    title: 'A project taking its group’s',
    description:
      'Empty fields show what comes from the group, and each switch starts on the group’s answer.',
  },
  'project-overrides': {
    title: 'A project with its own',
    description: 'Its own template, pull requests off and rebase, over the group’s.',
  },
  scope: {
    title: 'On a scope group',
    description: 'A scope group’s delivery reaches no project, so the form is read-only.',
  },
  'title-template': {
    title: 'A pull request title template',
    description:
      'Typed as {ticket} {ticketTitle}: the preview fills it for a sample ticket, and Save appears.',
  },
  'title-inherited': {
    title: 'A project with its own title template',
    description:
      'Its own [{ticket}] {ticketTitle} over the group’s, previewed. Empty, it would take the group’s.',
  },
  'bad-title': {
    title: 'A title template naming something unknown',
    description:
      'Only {ticket} and {ticketTitle} are filled: the reason sits under the field and Save waits. The backend refuses the same.',
  },
  'save-failed': {
    title: 'A save failed',
    description: 'Shown saved at once; when refused it comes back unsaved, with why.',
  },
}

const deliveryStates: SceneState[] = Object.entries(DELIVERY_FORM_STATES).flatMap(([id, state]) => {
  const text = DELIVERY_STATE_TEXT[id]!
  return [
    { id, ...text, render: () => page(<DeliveryForm state={state} />) },
    ...(id === 'group-pr-first' || id === 'project-inherits' || id === 'title-template'
      ? [
          {
            id: `${id}-phone`,
            title: `${text.title}, on a phone`,
            description: 'The small-screen width: the mobile app’s native section follows this.',
            render: () => phone(<DeliveryForm state={state} />),
          },
        ]
      : []),
  ]
})

function Publish({ state, stopping = false }: { state: PublishState; stopping?: boolean }) {
  const [edits, setEdits] = useState<Record<string, ProcessPublishEdit>>(
    () => state.edits ?? Object.fromEntries(state.data.repos.map((r) => [r.projectId, r])),
  )
  const view = publishCardView({ ...state, edits })
  return (
    <PublishCard
      view={view}
      onEdit={(projectId, field, value) =>
        setEdits((was) => ({ ...was, [projectId]: { ...was[projectId]!, [field]: value } }))
      }
      onPublish={noop}
      onStop={noop}
      initialStopping={stopping}
    />
  )
}

const PUBLISH_STATE_TEXT: Record<string, { title: string; description: string }> = {
  ready: {
    title: 'One repo, ready',
    description:
      'The branch the short name makes, the PR title and the account. Edit either field.',
  },
  group: {
    title: 'A group run’s repos',
    description:
      'Each repo with changes gets its own branch and pull request; one with none says so.',
  },
  editing: { title: 'Editing the short name', description: 'The branch name follows it.' },
  'no-branch': {
    title: 'Nothing to name it from',
    description: 'A short name with no words, and an empty title: Publish waits.',
  },
  'no-account': {
    title: 'No account to push with',
    description: 'Publish waits, and the card says where to add one.',
  },
  'two-accounts': {
    title: 'Two accounts',
    description: 'Repos pushed as different accounts: each repo says its own.',
  },
  publishing: {
    title: 'Publishing',
    description: 'Shown at once on the press; the fields lock and a second press does nothing.',
  },
  failed: { title: 'Publishing failed', description: 'Back to the card with why, nothing lost.' },
  notices: {
    title: 'Notices under a repo',
    description:
      'What to look at before publishing — a one-word short name, a PR Text section its template has and it lacks — under each repo. They never stop Open pull request.',
  },
}

const publishStates: SceneState[] = [
  ...Object.entries(PUBLISH_STATES).map(([id, state]) => ({
    id,
    ...PUBLISH_STATE_TEXT[id]!,
    render: () => page(<Publish state={state} />),
  })),
  {
    id: 'ready-phone',
    title: 'One repo, on a phone',
    render: () => phone(<Publish state={PUBLISH_STATES.ready!} />),
  },
  {
    id: 'notices-phone',
    title: 'Notices under a repo, on a phone',
    render: () => phone(<Publish state={PUBLISH_STATES.notices!} />),
  },
  {
    id: 'loading',
    title: 'Reading the repos',
    render: () =>
      page(<PublishCard view={undefined} onEdit={noop} onPublish={noop} onStop={noop} />),
  },
  {
    id: 'read-failed',
    title: 'The repos could not be read',
    render: () =>
      page(
        <PublishCard
          view={undefined}
          readError="The repos to publish could not be read."
          onEdit={noop}
          onPublish={noop}
          onStop={noop}
        />,
      ),
  },
  {
    id: 'stop',
    title: 'Stopping asks first',
    description: 'Stop ends the run, so it always confirms.',
    overlay: true,
    render: () => <Publish state={PUBLISH_STATES.ready!} stopping />,
  },
]

const PUBLICATION_TEXT: Record<keyof typeof PUBLICATION_STATES, string> = {
  open: 'In review: the pull request is open. On the run’s header and each group leg.',
  merged: 'Its pull request was merged.',
  closed: 'Its pull request was closed without merging.',
  'no-pull-request': 'Pushed to a host with no pull requests: the badge, and no link.',
}

const publicationStates: SceneState[] = [
  ...(Object.keys(PUBLICATION_STATES) as (keyof typeof PUBLICATION_STATES)[]).map((id) => ({
    id,
    title: PUBLICATION_STATES[id].badge.label,
    description: PUBLICATION_TEXT[id],
    render: () => page(<PublicationChip view={PUBLICATION_STATES[id]} />),
  })),
  {
    id: 'sign-off',
    title: 'At the sign-off',
    description: 'Above how the work is merged, with the published branch named.',
    render: () =>
      page(
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
          <PublicationChip view={PUBLICATION_STATES.open} withBranch />
        </div>,
      ),
  },
]

const MERGE_TEXT: Record<MergeStateId, { title: string; description: string }> = {
  'bringing-in-base': {
    title: 'Bringing in the base',
    description: 'Accept fetches the base and brings it into the pull request first.',
  },
  'waiting-for-checks': {
    title: 'Waiting for checks',
    description:
      'Waits for the required checks, however long they take; the checks are one click away.',
  },
  merged: { title: 'Merged', description: 'Merged with the repo’s method.' },
  'already-merged': {
    title: 'Already merged',
    description: 'Someone merged it on the host: nothing to do.',
  },
  conflict: {
    title: 'A conflict',
    description: 'The base changed the same lines: Resolve it sends it to an agent, as today.',
  },
  'checks-failed': {
    title: 'Checks failed',
    description: 'Names the checks that failed; the run waits with retry and send to developer.',
  },
  legs: {
    title: 'A group’s legs',
    description: 'In the order they build on each other: one merged, the next waiting for checks.',
  },
}

const mergeStates: SceneState[] = (Object.keys(MERGE_STATES) as MergeStateId[]).map((id) => ({
  id,
  ...MERGE_TEXT[id],
  render: () => page(<MergeProgressList rows={MERGE_STATES[id]} onResolve={noop} onOpen={noop} />),
}))

function ContextDocCleanup() {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4">
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-semibold text-(--text-primary)">
          {PROCESS_CLEANUP_COPY.title}
        </div>
        <div className="text-[12.5px] text-(--text-secondary)">
          {processCleanupHeadline(CONTEXT_DOC_CLEANUP.list!)}
        </div>
      </div>
      <ProcessCleanupBody cleanup={CONTEXT_DOC_CLEANUP} />
    </section>
  )
}

export const PR_FIRST_DELIVERY_SCENES: Scene[] = [
  {
    id: 'delivery-settings',
    title: 'Delivery in Settings',
    component: 'DeliverySettingsPanel',
    group: 'Settings',
    description:
      'A group’s or a project’s delivery, under its sign-off outputs in Settings on all three apps: the branch name template with a live preview, the base branch, pull request first and the merge method. A project’s empty fields take its group’s.',
    states: deliveryStates,
  },
  {
    id: 'publish-card',
    title: 'Open pull request',
    component: 'PublishCard',
    group: 'Process',
    description:
      'The publish stop of a pull-request-first run, in its Needs you card: each repo with its branch name and PR title, both editable, the account it is pushed as, and Publish or Stop. A group run shows every leg on one card.',
    states: publishStates,
  },
  {
    id: 'publication-badge',
    title: 'In review and the pull request',
    component: 'PublicationChip',
    group: 'Process',
    description:
      'A published run’s badge and pull request link, on the run’s header, each group leg and the sign-off.',
    states: publicationStates,
  },
  {
    id: 'merge-progress',
    title: 'Merging after Accept',
    component: 'MergeProgressList',
    group: 'Process',
    description:
      'Each repo’s merge after Accept: bringing in the base, waiting for checks, merged or already merged, a conflict or failed checks, with the existing resolve.',
    states: mergeStates,
  },
  {
    id: 'cleanup-context-docs',
    title: 'Context docs in the cleanup list',
    component: 'ProcessCleanupBody',
    group: 'Process',
    description:
      'Context docs the run’s features pointed to that exist only in the checkout: named as context docs with their reason, and kept unless ticked.',
    states: [
      {
        id: 'unticked',
        title: 'Unticked by default',
        description:
          'One left as the run listed it, one the person ticked, beside the run’s captures.',
        render: () => page(<ContextDocCleanup />),
      },
      { id: 'phone', title: 'On a phone', render: () => phone(<ContextDocCleanup />) },
    ],
  },
]
