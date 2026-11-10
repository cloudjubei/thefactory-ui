import { useRef, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  CliConfigsProvider,
  FilesProvider,
  SIGN_OFF_OUTPUT_COPY,
  TICKET_TRANSITION_STANDING,
  groupTicketsView,
  requestProofChoices,
  signOffOutputSettingViews,
  ticketPostView,
  signOffTemplateChoices,
  type GroupConstellationLayout,
  type GroupHomeLayout,
  type GroupTicketsLayout,
  type ProofChangeKeptLook,
  type ProviderOAuthActions,
  type TicketStatusList,
  type TicketTransitionStanding,
} from 'thefactory-ui/headless'
import GroupHomeConnected from '../../src/native/compound/GroupHomeConnected'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import ProjectDefaultCapsField from '../../src/native/compound/projects/ProjectDefaultCapsField'
import TicketTransitionField from '../../src/native/compound/projects/TicketTransitionField'
import TicketPostNote from '../../src/native/compound/process/signoff/TicketPostNote'
import ParkNoteComposer from '../../src/native/compound/process/ParkNoteComposer'
import ProofChangeComposer from '../../src/native/compound/process/ProofChangeComposer'
import ProviderConnectionsForm from '../../src/native/compound/settings/ProviderConnectionsForm'
import SignOffOutputSettingsPanel from '../../src/native/compound/settings/SignOffOutputSettingsPanel'
import CaptureCardShell from '../../src/native/compound/chat/CaptureCardShell'
import { MediaHostProvider } from '../../src/native/compound/chat/signoff/MediaHostContext'
import WalkthroughTab from '../../src/native/compound/chat/signoff/WalkthroughTab'
import CredentialCaptureCard from '../../src/native/compound/chat/CredentialCaptureCard'
import McpServerSignInStep from '../../src/native/compound/chat/McpServerSignInStep'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { IconSave } from '../../src/native/icons'
import { Button } from '../../src/native/primitives/Button'
import Field from '../../src/native/primitives/Field'
import { Input } from '../../src/native/primitives/Input'
import { FAKE_GROUP_ID, MEMBERS } from '../../src/fakeBackend/fixtures/projects'
import { FAKE_GROUP_STATUS_AT } from '../../src/fakeBackend/fixtures/projectsGroups'
import {
  RECORDING_ROUTES,
  VIDEO_COUNTED,
  VIDEO_NEW_SCREEN,
  VIDEO_NOT_COUNTED,
  VIDEO_PROJECT,
  VIDEO_REQUESTED,
  videoPairViews,
} from '../scenes/beforeAfterVideoFixtures'
import { ticketsState } from '../scenes/groupTicketsFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import {
  KEPT_LOOKS,
  VISIBLE_CHANGE_OFFER,
  VISIBLE_VIDEO_CHANGE_OFFER,
} from '../scenes/proofChangeFixtures'
import { FAKE_DATA_VIEWS } from './fakeDataViews'
import { SCRIPTED_VIEWS } from './scriptedViews'
import { VARIANT_VIEWS } from './variantViews'

const noop = () => {}
const AT = Date.parse(FAKE_GROUP_STATUS_AT)
const PROJECTS = MEMBERS.map(({ id, title }) => ({ id, title }))

/** A native panel at its address: `?view=<id>`, on the same fixtures as the showcase. */
export type NativeView = {
  id: string
  title: string
  render: (address: URLSearchParams) => ReactNode
}

function Line({ children, testID }: { children: ReactNode; testID: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text testID={testID} style={{ fontSize: 12, padding: 8, color: theme.text.secondary }}>
      {children}
    </Text>
  )
}

/**
 * The project editor's limits with the rest of the form above them and Save below, in a band of
 * its own: mobile's `ProjectManagerModal`, blocking the way it is asked to.
 */
function ProjectLimits() {
  const { theme } = useNativeTheme()
  const [metadata, setMetadata] = useState<Record<string, unknown>>({
    icon: 'folder',
    processDefaultCaps: { spendUsdCap: 10, maxIterations: 2 },
  })
  const [capsError, setCapsError] = useState<string>()
  const [saved, setSaved] = useState('Nothing saved yet')
  const form = useRef<ScrollView>(null)
  const capsAt = useRef(0)
  const save = () => {
    if (capsError) {
      form.current?.scrollTo({ y: capsAt.current })
      return
    }
    setSaved(`Saved: ${JSON.stringify(metadata.processDefaultCaps ?? null)}`)
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={form} style={{ flex: 1 }}>
        <View style={{ gap: 16, padding: 16 }}>
          <Field label="Title">
            <Input value="TheFactory UI" onChangeText={noop} />
          </Field>
          <Field label="Description">
            <Input value="The shared UI package." onChangeText={noop} />
          </Field>
          <View style={{ height: 720, borderRadius: 8, backgroundColor: theme.surface.muted }} />
          <View onLayout={(event) => (capsAt.current = event.nativeEvent.layout.y)}>
            <ProjectDefaultCapsField
              metadata={metadata}
              onChange={setMetadata}
              onErrorChange={setCapsError}
            />
          </View>
          <View style={{ height: 720, borderRadius: 8, backgroundColor: theme.surface.muted }} />
        </View>
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
        }}
      >
        <Line testID="saved">{saved}</Line>
        <Button variant="secondary" size="icon" onPress={save} accessibilityLabel="Save">
          <IconSave size={18} />
        </Button>
      </View>
    </View>
  )
}

const SAMPLE_OUTPUTS = [
  { label: 'Release note', templateNoteId: 'release', perRepo: false },
  { label: 'PR Text', templateNoteId: 'gone', perRepo: true },
]
const SAMPLE_NOTES = [{ id: 'release', label: 'Release note template', kind: 'note' }]

function SignOffOutputs() {
  return (
    <View style={{ padding: 16 }}>
      <SignOffOutputSettingsPanel
        views={signOffOutputSettingViews({
          own: SAMPLE_OUTPUTS,
          ownNotes: SAMPLE_NOTES,
          mainGroup: {
            id: 'osc',
            title: 'OSC',
            type: 'MAIN',
            signOffOutputs: [{ label: 'Slack Message', templateNoteId: 'slack', perRepo: false }],
          },
          groupNotes: [{ id: 'slack', label: 'Slack post template', kind: 'note' }],
          notesRead: true,
        })}
        own={SAMPLE_OUTPUTS}
        choices={signOffTemplateChoices(SAMPLE_NOTES)}
        noNotes={SIGN_OFF_OUTPUT_COPY.noNotesProject}
        intro={SIGN_OFF_OUTPUT_COPY.projectIntro('OSC web')}
        canAdd
        error={null}
        busy={false}
        onSave={async () => true}
        onRemove={async () => true}
      />
    </View>
  )
}

const TICKET_STATUSES: Record<string, TicketStatusList> = {
  ready: { kind: 'ready', statuses: ['Done', 'In Progress', 'In Review', 'To Do'] },
  reading: { kind: 'reading' },
  failed: {
    kind: 'failed',
    reason: 'This token cannot read Jira statuses. It needs the read:jira-work scope.',
  },
  github: { kind: 'ready', statuses: ['open', 'closed'] },
}

function TicketTransition({
  standing,
  list,
}: {
  standing: TicketTransitionStanding
  list: string | null
}) {
  const [value, setValue] = useState(list === 'github' ? 'closed' : 'Done')
  return (
    <View style={{ padding: 16 }}>
      <TicketTransitionField
        value={value}
        onChange={setValue}
        statuses={TICKET_STATUSES[list ?? 'ready'] ?? TICKET_STATUSES.ready!}
        standing={standing}
        {...(list === 'github' ? { provider: 'github' } : {})}
      />
    </View>
  )
}

const POST_VIEW = ticketPostView({
  tickets: [{ provider: 'jira', externalId: 'ENG-214', posts: true }],
  comment: 'Signed off: Renewal date on the plan page.\n\n- Show it on the plan page',
  transition: 'Done',
})
const HELD_VIEW = ticketPostView({
  tickets: [
    {
      provider: 'jira',
      externalId: 'ENG-214',
      posts: false,
      why: 'Connector write-back is off, so nothing is posted',
    },
  ],
})

function TicketPost({ held, open }: { held: boolean; open: boolean }) {
  const view = held ? HELD_VIEW : POST_VIEW
  return (
    <View style={{ padding: 16 }}>
      {view ? <TicketPostNote view={view} startOpen={open} /> : null}
    </View>
  )
}

function SwitchTokenForm() {
  return (
    <View style={{ padding: 16 }}>
      <ProviderConnectionsForm
        mode={{
          kind: 'edit',
          onSubmit: async () => undefined,
          connection: {
            id: 'c1',
            name: 'Acme Jira',
            provider: 'jira',
            username: 'kamil@example.com',
            baseUrl: 'https://acme.atlassian.net',
            hasToken: true,
            hasRefreshToken: false,
            config: {
              jiraApiTokenMode: 'scoped',
              cloudId: '11111111-2222-4333-8444-555555555555',
            },
            createdAt: '2026-11-01T00:00:00.000Z',
            updatedAt: '2026-11-01T00:00:00.000Z',
          },
        }}
        onCancel={noop}
        fixedCloudIdStatus="idle"
      />
    </View>
  )
}

const OAUTH: ProviderOAuthActions = {
  setup: { github: true, jira: true },
  start: async () => ({
    page: 'https://auth.atlassian.com/authorize?state=s1',
    signInId: 'sign-in-1',
  }),
  read: async () => ({ signInId: 'sign-in-1', status: 'waiting' }),
  withdraw: async () => undefined,
  onReport: () => noop,
  onReconnect: () => noop,
}

/** The proof editor of a change that shows on screen, its screens held in the look `?look=` names. */
function KeptScreens({ look, video }: { look: string | null; video: boolean }) {
  const kept: ProofChangeKeptLook = KEPT_LOOKS.find((l) => l.id === look)?.id ?? 'reason'
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      <ProofChangeComposer
        offer={video ? VISIBLE_VIDEO_CHANGE_OFFER : VISIBLE_CHANGE_OFFER}
        onSend={noop}
        onCancel={noop}
        keptLook={kept}
      />
    </View>
  )
}

/** The host's player, as the app hands it to the review surfaces: here, the browser's own. */
const PLAYER = {
  renderVideo: (dataUri: string) => (
    <video
      src={dataUri}
      controls
      playsInline
      style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
    />
  ),
}

/** The proof's recording pairs by `?state=`: counted, not-counted or new-screen. */
const VIDEO_PAIR_STATES = {
  counted: [VIDEO_COUNTED],
  'not-counted': [VIDEO_NOT_COUNTED, VIDEO_COUNTED],
  'new-screen': [VIDEO_NEW_SCREEN],
}

function VideoPairs({ state }: { state: string | null }) {
  const pairs =
    VIDEO_PAIR_STATES[(state ?? 'counted') as keyof typeof VIDEO_PAIR_STATES] ??
    VIDEO_PAIR_STATES.counted
  return (
    <OnFixtures routes={RECORDING_ROUTES}>
      <MediaHostProvider value={PLAYER}>
        <ScrollView>
          <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
            <WalkthroughTab
              projectId={VIDEO_PROJECT}
              recordings={[]}
              videoPairs={videoPairViews(pairs)}
            />
          </View>
        </ScrollView>
      </MediaHostProvider>
    </OnFixtures>
  )
}

function RequestVideo() {
  return (
    <OnFixtures>
      <FilesProvider>
        <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
          <ParkNoteComposer
            proofChoices={requestProofChoices()}
            proofPreset={VIDEO_REQUESTED}
            onSend={noop}
            onCancel={noop}
          />
        </View>
      </FilesProvider>
    </OnFixtures>
  )
}

function ConnectionForm() {
  return (
    <View style={{ padding: 16 }}>
      <ProviderConnectionsForm
        mode={{ kind: 'create', onSubmit: async () => undefined }}
        onCancel={noop}
        oauth={OAUTH}
      />
    </View>
  )
}

function SignedInForm() {
  return (
    <View style={{ padding: 16 }}>
      <ProviderConnectionsForm
        mode={{
          kind: 'edit',
          onSubmit: async () => undefined,
          connection: {
            id: 'c1',
            name: 'Acme Jira',
            provider: 'jira',
            tokenSource: 'oauth',
            baseUrl: 'https://acme.atlassian.net',
            hasToken: true,
            hasRefreshToken: true,
            createdAt: '2026-11-01T00:00:00.000Z',
            updatedAt: '2026-11-01T00:00:00.000Z',
          },
        }}
        onCancel={noop}
        oauth={OAUTH}
        fixedCloudIdStatus="idle"
      />
    </View>
  )
}

const LINEAR = { name: 'Linear', url: 'https://mcp.linear.app/mcp', scope: 'project' as const }

const SERVER_CARD: CredentialCapture = {
  id: 'cap-server',
  purpose: 'Read the tickets for this story',
  provider: 'mcp-server',
  projectId: 'osc-web',
  groupId: 'osc',
  status: 'requested',
  requestedAt: '2026-11-06T09:00:00.000Z',
  mcpServer: LINEAR,
}

const idle = () => new Promise<void>(noop)

export const NATIVE_VIEWS: readonly NativeView[] = [
  {
    id: 'group-home',
    title: 'Group home',
    render: (address) => (
      <OnFixtures>
        <GroupHomeConnected
          groupId={FAKE_GROUP_ID}
          title="Overseer"
          typeTag="MAIN"
          projects={PROJECTS}
          layout={(address.get('layout') ?? 'needs-you-first') as GroupHomeLayout}
          constellationLayout={(address.get('deps') ?? 'layers') as GroupConstellationLayout}
          now={AT}
          onSelectProject={noop}
          onSelectRun={noop}
          onSelectGroupRun={noop}
        />
      </OnFixtures>
    ),
  },
  {
    id: 'project-limits',
    title: 'Project default limits',
    render: () => <ProjectLimits />,
  },
  {
    id: 'server-card',
    title: 'Connect a server card',
    render: (address) => (
      <OnFixtures>
        <CliConfigsProvider>
          <View style={{ padding: 16 }}>
            <CredentialCaptureCard
              capture={SERVER_CARD}
              onSubmit={idle}
              onCancel={idle}
              initialValues={{ authType: address.get('auth') ?? 'oauth' }}
            />
          </View>
        </CliConfigsProvider>
      </OnFixtures>
    ),
  },
  {
    id: 'server-card-sign-in',
    title: 'Connect a server card: Sign in',
    render: (address) => (
      <View style={{ padding: 16 }}>
        <CaptureCardShell
          capture={{ ...SERVER_CARD, mcpServer: { ...LINEAR, serverId: 'linear' } }}
        >
          <McpServerSignInStep
            url={LINEAR.url}
            pendingUrl={address.get('pending') ?? undefined}
            busy={false}
            error={null}
            onSignIn={noop}
            onOpenPage={noop}
            onCancel={noop}
          />
        </CaptureCardShell>
      </View>
    ),
  },
  {
    id: 'sign-off-outputs',
    title: 'Sign-off outputs',
    render: () => <SignOffOutputs />,
  },
  {
    id: 'ticket-post',
    title: 'What sign-off will post',
    render: (address) => (
      <TicketPost held={address.get('held') === '1'} open={address.get('open') === '1'} />
    ),
  },
  {
    id: 'jira-token-form',
    title: 'A Jira token with scopes',
    render: () => <SwitchTokenForm />,
  },
  {
    id: 'signed-in-connection',
    title: 'A signed-in connection, with Reconnect',
    render: () => <SignedInForm />,
  },
  {
    id: 'ticket-transition',
    title: 'Sign-off status',
    render: (address) => (
      <TicketTransition
        list={address.get('list')}
        standing={
          address.get('standing') === 'moves'
            ? TICKET_TRANSITION_STANDING.moves
            : TICKET_TRANSITION_STANDING.off
        }
      />
    ),
  },
  {
    id: 'group-tickets',
    title: 'Tickets tab',
    render: (address) => (
      <ScrollView>
        <GroupTicketsList
          view={groupTicketsView(ticketsState())}
          query=""
          onQueryChange={noop}
          onDiscuss={noop}
          onPlan={noop}
          onOpenStory={noop}
          onOpenSettings={noop}
          onRetry={noop}
          onLoadMore={noop}
          layout={(address.get('layout') ?? 'sections') as GroupTicketsLayout}
        />
      </ScrollView>
    ),
  },
  {
    id: 'connection-form',
    title: 'Ticket connection form',
    render: () => <ConnectionForm />,
  },
  {
    id: 'proof-change-keeps-screens',
    title: 'Screens stay on a visible change',
    render: (address) => (
      <KeptScreens look={address.get('look')} video={address.get('offer') === 'video'} />
    ),
  },
  {
    id: 'before-after-video',
    title: 'Before/after video',
    render: (address) => <VideoPairs state={address.get('state')} />,
  },
  {
    id: 'request-video',
    title: 'Request changes: Require a before/after video',
    render: () => <RequestVideo />,
  },
  ...VARIANT_VIEWS,
  ...SCRIPTED_VIEWS,
  ...FAKE_DATA_VIEWS,
]
