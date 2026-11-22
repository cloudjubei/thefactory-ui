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
  type ProcessProofChangeOffer,
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
import FeatureSplitComposer from '../../src/native/compound/process/FeatureSplitComposer'
import { SPLIT_STATES } from '../scenes/featureSplitFixtures'
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
  TRACE_TILE,
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
  VISIBLE_VIDEO_STAYS_OFFER,
} from '../scenes/proofChangeFixtures'
import { FAKE_DATA_VIEWS } from './fakeDataViews'
import { LIVE_CHECK_VIEWS } from './liveCheckViews'
import { PR_FIRST_DELIVERY_VIEWS } from './prFirstDeliveryViews'
import { GROUP_LEG_PUBLISH_VIEWS } from './groupLegPublishViews'
import { TICKET_UPDATE_VIEWS } from './ticketUpdateViews'
import { NAMED_LANDING_VIEWS } from './namedLandingViews'
import { FILE_PREVIEW_VIEWS } from './filePreviewViews'
import { GIT_CREDENTIAL_VIEWS } from './gitCredentialViews'
import { FILE_TREE_VIEWS } from './fileTreeViews'
import { SCRIPT_STEP_VIEWS } from './scriptStepViews'
import { PROJECT_SERVE_SETTINGS_VIEWS } from './projectServeSettingsViews'
import { BUILD_LIMIT_AFTER_SAVE_VIEWS } from './buildLimitAfterSaveViews'
import { PROJECT_CHECK_SETTINGS_VIEWS } from './projectCheckSettingsViews'
import { RETRY_DEFINITIONS_VIEWS } from './retryDefinitionsViews'
import { SIGNOFF_CHIP_VIEWS } from './signoffChipsViews'
import { WAITING_RETRY_NOTE_VIEWS } from './waitingRetryNoteViews'
import { HOST_CHECK_CONSENT_VIEWS } from './hostCheckConsentViews'
import { SUPERSEDED_FILINGS_VIEWS } from './supersededFilingsViews'
import { SPEND_LIMIT_VIEWS } from './spendLimitViews'
import { MERGE_RECOVERY_VIEWS } from './mergeRecoveriesViews'
import { MERGE_BASE_STOP_VIEWS } from './mergeBaseStopViews'
import { SHOWN_FILE_VIEWS } from './shownFileViews'
import { PLAN_WINDOW_VIEWS } from './planWindowViews'
import { SEND_TO_DEVELOPER_VIEWS } from './sendToDeveloperViews'
import { READY_ANSWER_VIEWS } from './readyAnswerViews'
import { COLLEAGUE_REVIEW_VIEWS } from './colleagueReviewViews'
import { SLACK_REVIEW_VIEWS } from './slackReviewViews'
import { REVIEW_MERGE_CHECKS_VIEWS } from './reviewMergeChecksViews'
import { REVIEW_RUN_ROUNDS_VIEWS } from './reviewRunRoundsViews'
import { RUN_WAITS_FOR_VIEWS } from './runWaitsForViews'
import { TICKET_TAB_VIEWS } from './ticketTabsViews'
import { REVIEW_CHAT_SLOT_VIEWS } from './reviewChatSlotViews'
import { REVIEW_GAP_VIEWS } from './reviewGapViews'
import { TICKET_VIEWS } from './ticketViews'
import { TICKET_RUN_VIEWS } from './ticketRunViews'
import { TEST_WITH_ME_VIEWS } from './testWithMeViews'
import { TRY_ON_PHONE_VIEWS } from './tryOnPhoneViews'
import { VARIANT_VIEWS } from './variantViews'
import { APP_NOTE_VIEWS } from './appNotesViews'
import { REMOTE_BROWSER_VIEWS } from './remoteBrowserViews'
import { ALREADY_HANDLED_VIEWS } from './alreadyHandledViews'
import { CHAT_MESSAGING_VIEWS } from './chatMessagingViews'
import { VIDEO_TIMELINE_VIEWS } from './videoTimelineViews'
import { RUN_THROUGH_VIEWS } from './runThroughViews'
import { CHECK_RUN_VIEWS } from './checkRunViews'
import { RUN_THROUGH_ISSUE_REVIEW_VIEWS } from './runThroughIssueReviewViews'
import { EVIDENCE_LINK_VIEWS } from './evidenceLinksViews'
import { AGENT_PAUSE_VIEWS } from './agentPauseViews'
import { TRAINER_SUGGESTION_VIEWS } from './trainerSuggestionViews'
import { GIT_FILE_STATUS_ICON_VIEWS } from './gitFileStatusIconViews'
import { GIT_RENAMED_ROW_VIEWS } from './gitRenamedRowViews'

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

const KEPT_OFFERS: Record<string, ProcessProofChangeOffer> = {
  video: VISIBLE_VIDEO_CHANGE_OFFER,
  'video-stays': VISIBLE_VIDEO_STAYS_OFFER,
}

/**
 * The proof editor of a change that shows on screen, its screens held in the look `?look=`
 * names — or, with `?offer=video`, proven by screens and a video one of which can go, and with
 * `?offer=video-stays` its screens off and its video held.
 */
function KeptScreens({ look, offer }: { look: string | null; offer: string | null }) {
  const kept: ProofChangeKeptLook = KEPT_LOOKS.find((l) => l.id === look)?.id ?? 'reason'
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      <ProofChangeComposer
        offer={(offer && KEPT_OFFERS[offer]) || VISIBLE_CHANGE_OFFER}
        onSend={noop}
        onCancel={noop}
        keptLook={kept}
      />
    </View>
  )
}

/**
 * Moving acceptance points into a follow-up, in the state `?state=` names (start, picked, proof,
 * every-point, unchecked) and the point look `?look=row` switches to.
 */
function FeatureSplit({ state, look }: { state: string | null; look: string | null }) {
  const shown = (state && SPLIT_STATES[state]) || SPLIT_STATES.picked!
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      <FeatureSplitComposer
        key={`${state}-${look}`}
        offer={shown.offer}
        initial={shown.draft}
        pointLook={look === 'row' ? 'row' : 'switch'}
        onSend={noop}
        onCancel={noop}
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

/** Explicit save exercise: the first byte request fails; retry reads the bundled recording. */
function RecordingSaveRetry() {
  const [receipt, setReceipt] = useState('No bytes handed to the fixture host yet.')
  const [routes] = useState(() => {
    let attempts = 0
    const content = '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content'
    return {
      ...RECORDING_ROUTES,
      [content]: (...args: Parameters<NonNullable<(typeof RECORDING_ROUTES)[string]>>) => {
        if (++attempts === 1) throw new Error('Synthetic first-save byte fetch failure')
        return RECORDING_ROUTES[content]!(...args)
      },
    }
  })
  return (
    <OnFixtures routes={routes}>
      <MediaHostProvider value={PLAYER}>
        <View style={{ padding: 16, width: 390, maxWidth: '100%', gap: 8 }}>
          <Text>Save retry exercise: first fetch fails; second loads bundled bytes.</Text>
          <WalkthroughTab
            projectId={VIDEO_PROJECT}
            recordings={[]}
            videoPairs={videoPairViews([VIDEO_NEW_SCREEN])}
            onSaveFile={({ name }) =>
              setReceipt(`Fixture host received ${name}; no disk save performed.`)
            }
          />
          <Text>{receipt}</Text>
        </View>
      </MediaHostProvider>
    </OnFixtures>
  )
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
              recordings={[TRACE_TILE]}
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
          onOpen={noop}
          onPickTab={noop}
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
    render: (address) => <KeptScreens look={address.get('look')} offer={address.get('offer')} />,
  },
  {
    id: 'feature-split',
    title: 'Move to a follow-up',
    render: (address) => <FeatureSplit state={address.get('state')} look={address.get('look')} />,
  },
  {
    id: 'before-after-video',
    title: 'Before/after video',
    render: (address) =>
      address.get('state') === 'save-retry' ? (
        <RecordingSaveRetry />
      ) : (
        <VideoPairs state={address.get('state')} />
      ),
  },
  {
    id: 'request-video',
    title: 'Request changes: Require a before/after video',
    render: () => <RequestVideo />,
  },
  ...VARIANT_VIEWS,
  ...TRY_ON_PHONE_VIEWS,
  ...TEST_WITH_ME_VIEWS,
  ...SCRIPT_STEP_VIEWS,
  ...SPEND_LIMIT_VIEWS,
  ...MERGE_RECOVERY_VIEWS,
  ...MERGE_BASE_STOP_VIEWS,
  ...PROJECT_SERVE_SETTINGS_VIEWS,
  ...BUILD_LIMIT_AFTER_SAVE_VIEWS,
  ...PROJECT_CHECK_SETTINGS_VIEWS,
  ...RETRY_DEFINITIONS_VIEWS,
  ...WAITING_RETRY_NOTE_VIEWS,
  ...HOST_CHECK_CONSENT_VIEWS,
  ...SIGNOFF_CHIP_VIEWS,
  ...SUPERSEDED_FILINGS_VIEWS,
  ...PLAN_WINDOW_VIEWS,
  ...FAKE_DATA_VIEWS,
  ...LIVE_CHECK_VIEWS,
  ...PR_FIRST_DELIVERY_VIEWS,
  ...GROUP_LEG_PUBLISH_VIEWS,
  ...TICKET_UPDATE_VIEWS,
  ...NAMED_LANDING_VIEWS,
  ...FILE_PREVIEW_VIEWS,
  ...GIT_CREDENTIAL_VIEWS,
  ...FILE_TREE_VIEWS,
  ...SHOWN_FILE_VIEWS,
  ...TICKET_VIEWS,
  ...SEND_TO_DEVELOPER_VIEWS,
  ...READY_ANSWER_VIEWS,
  ...COLLEAGUE_REVIEW_VIEWS,
  ...SLACK_REVIEW_VIEWS,
  ...REVIEW_MERGE_CHECKS_VIEWS,
  ...REVIEW_RUN_ROUNDS_VIEWS,
  ...RUN_WAITS_FOR_VIEWS,
  ...TICKET_TAB_VIEWS,
  ...TICKET_RUN_VIEWS,
  ...REVIEW_CHAT_SLOT_VIEWS,
  ...REVIEW_GAP_VIEWS,
  ...ALREADY_HANDLED_VIEWS,
  ...RUN_THROUGH_VIEWS,
  ...CHECK_RUN_VIEWS,
  ...RUN_THROUGH_ISSUE_REVIEW_VIEWS,
  ...EVIDENCE_LINK_VIEWS,
  ...AGENT_PAUSE_VIEWS,
  ...APP_NOTE_VIEWS,
  ...REMOTE_BROWSER_VIEWS,
  ...CHAT_MESSAGING_VIEWS,
  ...VIDEO_TIMELINE_VIEWS,
  ...TRAINER_SUGGESTION_VIEWS,
  ...GIT_FILE_STATUS_ICON_VIEWS,
  ...GIT_RENAMED_ROW_VIEWS,
]
