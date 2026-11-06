import { useRef, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  CliConfigsProvider,
  SIGN_OFF_OUTPUT_COPY,
  TICKET_TRANSITION_STANDING,
  groupTicketsView,
  signOffOutputSettingViews,
  signOffTemplateChoices,
  type GroupConstellationLayout,
  type GroupHomeLayout,
  type GroupTicketsLayout,
  type TicketTransitionStanding,
} from 'thefactory-ui/headless'
import GroupHomeConnected from '../../src/native/compound/GroupHomeConnected'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import ProjectDefaultCapsField from '../../src/native/compound/projects/ProjectDefaultCapsField'
import TicketTransitionField from '../../src/native/compound/projects/TicketTransitionField'
import ProviderConnectionsForm from '../../src/native/compound/settings/ProviderConnectionsForm'
import SignOffOutputSettingsPanel from '../../src/native/compound/settings/SignOffOutputSettingsPanel'
import CaptureCardShell from '../../src/native/compound/chat/CaptureCardShell'
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
import { ticketsState } from '../scenes/groupTicketsFixtures'
import { OnFixtures } from '../scenes/onFixtures'

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

function TicketTransition({ standing }: { standing: TicketTransitionStanding }) {
  const [value, setValue] = useState('31')
  return (
    <View style={{ padding: 16 }}>
      <TicketTransitionField value={value} onChange={setValue} standing={standing} />
    </View>
  )
}

function ConnectionForm() {
  return (
    <View style={{ padding: 16 }}>
      <ProviderConnectionsForm
        mode={{ kind: 'create', onSubmit: async () => undefined }}
        onCancel={noop}
        oauth={{
          start: async () => 'https://auth.atlassian.com/authorize?state=s1',
          finish: async () => undefined,
        }}
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
    id: 'ticket-transition',
    title: 'Sign-off transition',
    render: (address) => (
      <TicketTransition
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
]
