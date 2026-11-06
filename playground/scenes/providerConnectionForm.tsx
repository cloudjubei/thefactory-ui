import { useState, type ReactNode } from 'react'
import {
  CliConfigsProvider,
  PROVIDER_CONNECTION_FORM_LAYOUT_LABELS,
  PROVIDER_CONNECTION_FORM_LAYOUTS,
  PROVIDER_OAUTH_COPY,
  type JiraCloudIdStatus,
  type ProviderConnectionDraft,
  type ProviderConnectionFormLayout,
  type ProviderConnectionMethod,
  type ProviderOAuthState,
} from 'thefactory-ui/headless'
import { ProviderConnectionsForm, SegmentedControl } from 'thefactory-ui/web'
// Not on the package's public surface: the chat renders it itself.
import CredentialCaptureCard from '../../src/web/compound/chat/CredentialCaptureCard'
import CredentialHelpPanel from '../../src/web/compound/chat/CredentialHelpPanel'
import {
  JIRA_SCOPED_TOKEN_HELP,
  JIRA_TOKEN_HELP,
} from '../../src/headless/utils/credentialCaptureHelpConstants'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import type { Scene, SceneState } from '../showcase/types'
import { Dock } from './askRows'
import { OnFixtures } from './onFixtures'

const page = (node: ReactNode) => <div className="w-[560px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const noop = () => {}
const kept = async () => undefined
const never = () => new Promise<void>(noop)
const OAUTH = {
  start: async () => 'https://auth.atlassian.com/authorize?state=s1',
  finish: async () => undefined,
}
const WAITING: ProviderOAuthState = {
  step: 'waiting',
  page: 'https://auth.atlassian.com/authorize?state=s1',
  error: null,
}

type FormOptions = {
  draft?: Partial<ProviderConnectionDraft>
  method?: ProviderConnectionMethod
  layout?: ProviderConnectionFormLayout
  signIn?: ProviderOAuthState
  cloudIdStatus?: JiraCloudIdStatus
}

const JIRA = { name: 'Acme Jira', provider: 'jira' }
const SITE = 'https://acme.atlassian.net'
const CLOUD_ID = '11111111-2222-4333-8444-555555555555'
const JIRA_FILLED = { ...JIRA, username: 'kamil@example.com', baseUrl: SITE }
const AZURE = { name: 'Acme boards', provider: 'azure-devops' }

function create({ draft, method, layout, signIn, cloudIdStatus }: FormOptions = {}) {
  return (
    <ProviderConnectionsForm
      mode={{ kind: 'create', onSubmit: kept }}
      onCancel={noop}
      oauth={OAUTH}
      {...(draft ? { initialDraft: draft } : {})}
      {...(method ? { initialMethod: method } : {})}
      {...(layout ? { layout } : {})}
      {...(signIn ? { initialSignIn: signIn } : {})}
      {...(cloudIdStatus ? { fixedCloudIdStatus: cloudIdStatus } : {})}
    />
  )
}

type EditOptions = {
  config?: Record<string, string>
  draft?: Partial<ProviderConnectionDraft>
  cloudIdStatus?: JiraCloudIdStatus
}

function edit(
  tokenSource: 'oauth' | 'api-key',
  { config, draft, cloudIdStatus }: EditOptions = {},
) {
  return (
    <ProviderConnectionsForm
      mode={{
        kind: 'edit',
        onSubmit: kept,
        connection: {
          id: 'c1',
          name: 'Acme Jira',
          provider: 'jira',
          tokenSource,
          username: 'kamil@example.com',
          baseUrl: 'https://acme.atlassian.net',
          hasToken: true,
          hasRefreshToken: tokenSource === 'oauth',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          ...(config ? { config } : {}),
        },
      }}
      onCancel={noop}
      oauth={OAUTH}
      {...(draft ? { initialDraft: draft } : {})}
      fixedCloudIdStatus={cloudIdStatus ?? 'idle'}
    />
  )
}

/** The three ways of offering sign-in on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<ProviderConnectionFormLayout>('choice')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as ProviderConnectionFormLayout)}
        options={PROVIDER_CONNECTION_FORM_LAYOUTS.map((value) => ({
          value,
          label: PROVIDER_CONNECTION_FORM_LAYOUT_LABELS[value],
        }))}
      />
      <div key={layout}>{create({ layout, draft: JIRA })}</div>
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<ProviderConnectionFormLayout, string> = {
  choice:
    'The default that ships. Two choices above the fields, opening on API token: a token always works, and sign-in needs the backend set up.',
  'button-first':
    'The Connect button above, then the token fields under “or”: everything in sight, and the longest form.',
  'link-below':
    'The token form as it was, with a quiet link to sign in instead: the shortest, and the easiest to miss.',
}

const layoutStates: SceneState[] = PROVIDER_CONNECTION_FORM_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: PROVIDER_CONNECTION_FORM_LAYOUT_LABELS[layout],
    description: LAYOUT_DESCRIPTIONS[layout],
    render: () => page(create({ layout, draft: JIRA })),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${PROVIDER_CONNECTION_FORM_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native form follows this.',
    render: () => phone(create({ layout, draft: JIRA })),
  },
])

const TICKET_CARD: CredentialCapture = {
  id: 'cap-ticket',
  purpose: 'Read and move the tickets for this story',
  provider: 'ticket-connection',
  preset: 'jira',
  status: 'requested',
  requestedAt: '2026-11-06T09:00:00.000Z',
}

const CARD_FILLED = {
  name: 'Acme Jira',
  username: 'kamil@example.com',
  baseUrl: SITE,
}

function Card({
  values,
  cloudIdStatus = 'idle',
}: {
  values?: Record<string, string>
  cloudIdStatus?: JiraCloudIdStatus
}) {
  return (
    <OnFixtures>
      <CliConfigsProvider>
        <Dock>
          <CredentialCaptureCard
            capture={TICKET_CARD}
            onSubmit={never}
            onCancel={never}
            fixedCloudIdStatus={cloudIdStatus}
            {...(values ? { initialValues: values } : {})}
          />
        </Dock>
      </CliConfigsProvider>
    </OnFixtures>
  )
}

export const PROVIDER_CONNECTION_FORM_SCENES: Scene[] = [
  {
    id: 'provider-connection-form',
    title: 'Ticket connection form',
    component: 'ProviderConnectionsForm',
    group: 'Settings',
    description:
      'Adding a ticket connection in Settings → Tickets on all three apps: GitHub Issues, Jira or Azure DevOps with a token, and Connect with GitHub or Jira in the browser. A token is never shown back: blank on edit keeps it. Three ways of offering sign-in; two choices ship.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three ways of offering sign-in, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'jira-scoped',
        title: 'A token with scopes',
        description:
          'What a new Jira connection opens on: the kind of token that can post and move tickets. It says which scopes it needs.',
        render: () => page(create({ draft: JIRA, cloudIdStatus: 'idle' })),
      },
      {
        id: 'jira-scoped-finding',
        title: 'Finding the cloud id',
        description: 'Once the site URL is in, the backend asks the site. Nobody hunts for it.',
        render: () => page(create({ draft: JIRA_FILLED, cloudIdStatus: 'finding' })),
      },
      {
        id: 'jira-scoped-found',
        title: 'The cloud id found',
        render: () =>
          page(
            create({
              draft: { ...JIRA_FILLED, cloudId: CLOUD_ID, token: 'sample-token' },
              cloudIdStatus: 'found',
            }),
          ),
      },
      {
        id: 'jira-scoped-not-found',
        title: 'The site did not say',
        description: 'The field stays open to fill in by hand, and says where the id is.',
        render: () => page(create({ draft: JIRA_FILLED, cloudIdStatus: 'failed' })),
      },
      {
        id: 'jira-scoped-bad-id',
        title: 'A cloud id typed wrong',
        render: () =>
          page(create({ draft: { ...JIRA_FILLED, cloudId: 'acme' }, cloudIdStatus: 'idle' })),
      },
      {
        id: 'jira-scoped-bad-site',
        title: 'A site a token with scopes cannot reach',
        description: 'Scoped tokens route through Atlassian by cloud id, so only its sites work.',
        render: () =>
          page(
            create({
              draft: { ...JIRA_FILLED, baseUrl: 'https://jira.acme.com' },
              cloudIdStatus: 'idle',
            }),
          ),
      },
      {
        id: 'jira-classic',
        title: 'A classic token',
        description: 'No cloud id, and it says what a classic token cannot do.',
        render: () => page(create({ draft: { ...JIRA_FILLED, tokenType: 'classic' } })),
      },
      {
        id: 'jira-switch-to-scoped',
        title: 'Switching a connection to a token with scopes',
        description:
          'The same connection, so every project and group bound to it stays bound. A new token type needs a new token, so the field is no longer optional.',
        render: () =>
          page(
            edit('api-key', {
              draft: { tokenType: 'scoped', cloudId: CLOUD_ID },
              cloudIdStatus: 'found',
            }),
          ),
      },
      {
        id: 'jira-edit-scoped',
        title: 'Editing a token with scopes',
        description: 'Nothing of the token comes back: blank keeps it.',
        render: () =>
          page(edit('api-key', { config: { jiraApiTokenMode: 'scoped', cloudId: CLOUD_ID } })),
      },
      {
        id: 'azure-devops',
        title: 'Azure DevOps',
        description: 'An organization or project URL and a PAT. It has no sign-in.',
        render: () => page(create({ draft: AZURE })),
      },
      {
        id: 'azure-devops-filled',
        title: 'Azure DevOps, ready to add',
        render: () =>
          page(
            create({
              draft: {
                ...AZURE,
                baseUrl: 'https://dev.azure.com/acme/Platform',
                token: 'sample-token',
              },
            }),
          ),
      },
      {
        id: 'azure-devops-bad-url',
        title: 'A URL the connector would refuse',
        render: () =>
          page(create({ draft: { ...AZURE, baseUrl: 'http://dev.azure.com/acme/a/b' } })),
      },
      {
        id: 'sign-in-github',
        title: 'Connect with GitHub',
        description: 'Only a name is needed.',
        render: () =>
          page(create({ method: 'oauth', draft: { name: 'My GitHub', provider: 'github' } })),
      },
      {
        id: 'sign-in-jira',
        title: 'Connect with Jira',
        description: 'The backend needs the Jira cloud id to choose the site.',
        render: () => page(create({ method: 'oauth', draft: JIRA })),
      },
      {
        id: 'sign-in-not-set-up',
        title: 'Sign-in not set up on the backend',
        description:
          'No route says so ahead of time: it shows on trying, and the token path stays.',
        render: () =>
          page(
            create({
              method: 'oauth',
              draft: JIRA,
              signIn: { step: 'ready', error: PROVIDER_OAUTH_COPY.notSetUp },
            }),
          ),
      },
      {
        id: 'sign-in-waiting',
        title: 'Finishing in the browser',
        description:
          'The page the browser ends on differs by host, so the person pastes its address. It goes to the backend and is not kept.',
        render: () => page(create({ draft: JIRA, signIn: WAITING })),
      },
      {
        id: 'sign-in-unreadable',
        title: 'A paste with no result in it',
        render: () =>
          page(
            create({
              draft: JIRA,
              signIn: { ...WAITING, error: PROVIDER_OAUTH_COPY.unreadable },
            }),
          ),
      },
      {
        id: 'sign-in-refused',
        title: 'The provider refused',
        render: () =>
          page(
            create({
              method: 'oauth',
              draft: JIRA,
              signIn: { step: 'ready', error: PROVIDER_OAUTH_COPY.refused('access_denied') },
            }),
          ),
      },
      {
        id: 'edit-token',
        title: 'Editing a token connection',
        description: 'The stored token is not shown: blank keeps it.',
        render: () => page(edit('api-key')),
      },
      {
        id: 'edit-signed-in',
        title: 'Editing a signed-in connection',
        description: 'Only its name: its token and site are the provider’s.',
        render: () => page(edit('oauth')),
      },
    ],
  },
  {
    id: 'ticket-connection-card',
    title: 'Connect a tracker card',
    component: 'CredentialCaptureCard',
    group: 'Chat',
    description:
      'An agent asks for a ticket connection in a chat, on all three apps. The same token type as Settings, and the same cloud id found from the site, with the steps to make the token under the fields. The token goes straight to the backend and never into the chat.',
    states: [
      {
        id: 'with-scopes',
        title: 'A token with scopes',
        description: 'The steps name each scope the token needs.',
        render: () => <Card />,
      },
      {
        id: 'finding',
        title: 'Finding the cloud id',
        render: () => <Card values={CARD_FILLED} cloudIdStatus="finding" />,
      },
      {
        id: 'found',
        title: 'The cloud id found',
        render: () => <Card values={{ ...CARD_FILLED, cloudId: CLOUD_ID }} cloudIdStatus="found" />,
      },
      {
        id: 'not-found',
        title: 'The site did not say',
        render: () => <Card values={CARD_FILLED} cloudIdStatus="failed" />,
      },
      {
        id: 'classic',
        title: 'A classic token',
        description: 'The classic steps, saying what a classic token cannot do.',
        render: () => <Card values={{ ...CARD_FILLED, tokenType: 'classic' }} />,
      },
      {
        id: 'steps-with-scopes',
        title: 'The steps for a token with scopes',
        description: 'Each scope by name, and what boards and sprints need on top.',
        render: () => (
          <Dock>
            <CredentialHelpPanel help={JIRA_SCOPED_TOKEN_HELP} startOpen />
          </Dock>
        ),
      },
      {
        id: 'steps-classic',
        title: 'The steps for a classic token',
        render: () => (
          <Dock>
            <CredentialHelpPanel help={JIRA_TOKEN_HELP} startOpen />
          </Dock>
        ),
      },
    ],
  },
]
