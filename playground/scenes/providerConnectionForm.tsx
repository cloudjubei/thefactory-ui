import { useState, type ReactNode } from 'react'
import {
  PROVIDER_CONNECTION_FORM_LAYOUT_LABELS,
  PROVIDER_CONNECTION_FORM_LAYOUTS,
  PROVIDER_OAUTH_COPY,
  type ProviderConnectionDraft,
  type ProviderConnectionFormLayout,
  type ProviderConnectionMethod,
  type ProviderOAuthState,
} from 'thefactory-ui/headless'
import { ProviderConnectionsForm, SegmentedControl } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const page = (node: ReactNode) => <div className="w-[560px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const noop = () => {}
const kept = async () => undefined
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
}

const JIRA = { name: 'Acme Jira', provider: 'jira' }
const AZURE = { name: 'Acme boards', provider: 'azure-devops' }

function create({ draft, method, layout, signIn }: FormOptions = {}) {
  return (
    <ProviderConnectionsForm
      mode={{ kind: 'create', onSubmit: kept }}
      onCancel={noop}
      oauth={OAUTH}
      {...(draft ? { initialDraft: draft } : {})}
      {...(method ? { initialMethod: method } : {})}
      {...(layout ? { layout } : {})}
      {...(signIn ? { initialSignIn: signIn } : {})}
    />
  )
}

function edit(tokenSource: 'oauth' | 'api-key') {
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
        },
      }}
      onCancel={noop}
      oauth={OAUTH}
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
]
