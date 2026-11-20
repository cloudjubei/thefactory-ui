import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  PROCESS_CLEANUP_COPY,
  processCleanupHeadline,
  type DeliveryFormDraft,
  type ProcessPublishEdit,
} from 'thefactory-ui/headless'
import DeliverySettingsPanel from '../../src/native/compound/settings/DeliverySettingsPanel'
import MergeProgressList from '../../src/native/compound/process/MergeProgressList'
import PublicationChip from '../../src/native/compound/process/PublicationChip'
import PublishCard from '../../src/native/compound/process/PublishCard'
import { ProcessCleanupBody } from '../../src/native/compound/process/signoff/ProcessCleanupCard'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
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
} from '../scenes/prFirstDeliveryFixtures'
import type { NativeView } from './views'

const noop = () => undefined
const kept = async () => true

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

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

function Publish({ state, stopping }: { state: PublishState; stopping: boolean }) {
  const [edits, setEdits] = useState<Record<string, ProcessPublishEdit>>(
    () => state.edits ?? Object.fromEntries(state.data.repos.map((r) => [r.projectId, r])),
  )
  return (
    <PublishCard
      view={publishCardView({ ...state, edits })}
      onEdit={(projectId, field, value) =>
        setEdits((was) => ({ ...was, [projectId]: { ...was[projectId]!, [field]: value } }))
      }
      onPublish={noop}
      onStop={noop}
      initialStopping={stopping}
    />
  )
}

function ContextDocCleanup() {
  const { theme } = useNativeTheme()
  return (
    <>
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
        {PROCESS_CLEANUP_COPY.title}
      </Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {processCleanupHeadline(CONTEXT_DOC_CLEANUP.list!)}
      </Text>
      <ProcessCleanupBody cleanup={CONTEXT_DOC_CLEANUP} />
    </>
  )
}

const pick = <T,>(states: Record<string, T>, id: string | null, fallback: string): T =>
  states[id ?? fallback] ?? states[fallback]!

/**
 * PR-first delivery on a phone, on the showcase's fixtures: the delivery form
 * (`?state=` one of the `delivery-settings` scene's), the publish card
 * (`?state=` one of `publish-card`'s, or `stop`), the In review badge
 * (`?state=open|merged|closed|no-pull-request|sign-off`), the merge after
 * Accept (`?state=` one of `merge-progress`'s) and context docs in the cleanup list.
 */
export const PR_FIRST_DELIVERY_VIEWS: NativeView[] = [
  {
    id: 'delivery-settings',
    title: 'Settings: Delivery',
    render: (address) => {
      const id = address.get('state') ?? 'group-default'
      return (
        <Phone>
          <DeliveryForm key={id} state={pick(DELIVERY_FORM_STATES, id, 'group-default')} />
        </Phone>
      )
    },
  },
  {
    id: 'publish-card',
    title: 'Open pull request',
    render: (address) => {
      const id = address.get('state') ?? 'ready'
      return (
        <Phone>
          <Publish key={id} state={pick(PUBLISH_STATES, id, 'ready')} stopping={id === 'stop'} />
        </Phone>
      )
    },
  },
  {
    id: 'publication-badge',
    title: 'In review and the pull request',
    render: (address) => {
      const id = address.get('state') ?? 'open'
      const view = pick(PUBLICATION_STATES, id === 'sign-off' ? 'open' : id, 'open')
      return (
        <Phone>
          <PublicationChip view={view} withBranch={id === 'sign-off'} />
        </Phone>
      )
    },
  },
  {
    id: 'merge-progress',
    title: 'Merging after Accept',
    render: (address) => {
      const id = (address.get('state') ?? 'waiting-for-checks') as MergeStateId
      return (
        <Phone>
          <MergeProgressList
            rows={MERGE_STATES[id] ?? MERGE_STATES['waiting-for-checks']}
            onResolve={noop}
            onOpen={noop}
          />
        </Phone>
      )
    },
  },
  {
    id: 'cleanup-context-docs',
    title: 'Context docs in the cleanup list',
    render: () => (
      <Phone>
        <ContextDocCleanup />
      </Phone>
    ),
  },
]
