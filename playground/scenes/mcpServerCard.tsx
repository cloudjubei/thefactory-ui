import { useState } from 'react'
import {
  CliConfigsProvider,
  MCP_SERVER_AUTH_HINTS,
  MCP_SERVER_AUTH_LABELS,
  MCP_SERVER_AUTH_ORDER,
} from 'thefactory-ui/headless'
import { Button, Field, Input, SegmentedControl } from 'thefactory-ui/web'
// Not on the package's public surface: the chat renders them itself.
import CaptureCardShell from '../../src/web/compound/chat/CaptureCardShell'
import CredentialCaptureCard from '../../src/web/compound/chat/CredentialCaptureCard'
import McpServerSignInStep from '../../src/web/compound/chat/McpServerSignInStep'
import {
  CAPTURE_CANCEL_LABEL,
  MCP_CAPTURE_PRIVACY_NOTE,
  MCP_CAPTURE_SUBMIT_LABEL,
} from '../../src/headless/utils/credentialCaptureConstants'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import type { McpServerAuthType } from '../../src/headless/utils/mcpServersTypes'
import type { Scene } from '../showcase/types'
import { Dock } from './askRows'
import { OnFixtures } from './onFixtures'

const noop = () => {}
const never = () => new Promise<void>(noop)

const LINEAR = { name: 'Linear', url: 'https://mcp.linear.app/mcp', scope: 'project' as const }

const CARD: CredentialCapture = {
  id: 'cap-server',
  purpose: 'Read the tickets for this story',
  provider: 'mcp-server',
  projectId: 'osc-web',
  groupId: 'osc',
  status: 'requested',
  requestedAt: '2026-11-06T09:00:00.000Z',
  mcpServer: LINEAR,
}

const SIGNING_IN: CredentialCapture = { ...CARD, mcpServer: { ...LINEAR, serverId: 'linear' } }

const SIGN_IN_PAGE = 'https://linear.app/oauth/authorize?client_id=overseer'

function Card({
  capture = CARD,
  values,
}: {
  capture?: CredentialCapture
  values?: Record<string, string>
}) {
  return (
    <OnFixtures>
      <CliConfigsProvider>
        <Dock>
          <CredentialCaptureCard
            capture={capture}
            onSubmit={never}
            onCancel={never}
            {...(values ? { initialValues: values } : {})}
          />
        </Dock>
      </CliConfigsProvider>
    </OnFixtures>
  )
}

function SignIn({ pendingUrl, error }: { pendingUrl?: string; error?: string }) {
  return (
    <Dock>
      <CaptureCardShell capture={SIGNING_IN}>
        <McpServerSignInStep
          url={LINEAR.url}
          pendingUrl={pendingUrl}
          busy={false}
          error={error ?? null}
          onSignIn={noop}
          onOpenPage={noop}
          onCancel={noop}
        />
      </CaptureCardShell>
    </Dock>
  )
}

function FormFooter() {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="ghost">
        {CAPTURE_CANCEL_LABEL}
      </Button>
      <Button type="button" size="sm">
        {MCP_CAPTURE_SUBMIT_LABEL}
      </Button>
    </div>
  )
}

/** Not built: Settings' three-way control in place of the list. */
function WithButtons() {
  const [authType, setAuthType] = useState<McpServerAuthType>('oauth')
  return (
    <Dock>
      <CaptureCardShell capture={CARD}>
        <div className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-(--text-secondary)">{MCP_CAPTURE_PRIVACY_NOTE}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Name">
              <Input size="sm" defaultValue={LINEAR.name} />
            </Field>
            <Field label="URL">
              <Input size="sm" defaultValue={LINEAR.url} />
            </Field>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Sign-in</span>
            <SegmentedControl
              ariaLabel="Sign-in"
              value={authType}
              onChange={(next) => setAuthType(next as McpServerAuthType)}
              options={MCP_SERVER_AUTH_ORDER.map((value) => ({
                value,
                label: MCP_SERVER_AUTH_LABELS[value],
              }))}
            />
            <span className="text-xs opacity-60">{MCP_SERVER_AUTH_HINTS[authType]}</span>
          </div>
          <FormFooter />
        </div>
      </CaptureCardShell>
    </Dock>
  )
}

/** Not built: the suggestion as a line, with its fields behind Change. */
function WithSummary() {
  return (
    <Dock>
      <CaptureCardShell capture={CARD}>
        <div className="border-t border-amber-500/40 px-3 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-(--text-secondary)">{MCP_CAPTURE_PRIVACY_NOTE}</p>
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{LINEAR.name}</span>
              <span className="truncate text-[12px] text-(--text-secondary)">{LINEAR.url}</span>
            </span>
            <Button type="button" size="sm" variant="outline">
              Change
            </Button>
          </div>
          <FormFooter />
        </div>
      </CaptureCardShell>
    </Dock>
  )
}

export const MCP_SERVER_CARD_SCENES: Scene[] = [
  {
    id: 'mcp-server-card',
    title: 'Connect a server card',
    component: 'CredentialCaptureCard, McpServerSignInStep',
    group: 'Chat',
    description:
      'An agent asks to connect an MCP server with requestMcpServer: a card in the composer’s place on all three apps, with no approval in front of it. The name and URL it suggests are editable, with the sign-in type; a browser sign-in moves the card to Sign in, a token goes in a write-only field. The agent learns only what was connected and how it stands. Whether the server only reads stays in Settings. Three layouts to pick from; the list ships.',
    states: [
      {
        id: 'layout-list',
        title: 'Sign-in as a list',
        description:
          'The default: every field comes from the one form spec the card family shares.',
        render: () => <Card />,
      },
      {
        id: 'layout-buttons',
        title: 'Sign-in as buttons',
        description: 'Settings’ three-way control, with its hint. Taller on a phone.',
        render: () => <WithButtons />,
      },
      {
        id: 'layout-summary',
        title: 'Suggestion first',
        description:
          'The suggestion as a line with Change. Shorter, but the fields are one step away.',
        render: () => <WithSummary />,
      },
      {
        id: 'token',
        title: 'A token',
        description: 'The token field is write-only and appears only for a token sign-in.',
        render: () => <Card values={{ authType: 'bearer' }} />,
      },
      {
        id: 'no-sign-in',
        title: 'No sign-in',
        render: () => <Card values={{ authType: 'none' }} />,
      },
      {
        id: 'on-the-group',
        title: 'Kept on the main group',
        description: 'A project chat chooses between the project and its main group.',
        render: () => <Card capture={{ ...CARD, mcpServer: { ...LINEAR, scope: 'group' } }} />,
      },
      {
        id: 'group-chat',
        title: 'In a group chat',
        description: 'One owner, so no choice: the same goes for a project with no main group.',
        render: () => (
          <Card
            capture={{
              ...CARD,
              projectId: undefined,
              mcpServer: { ...LINEAR, scope: 'group' },
            }}
          />
        ),
      },
      {
        id: 'nothing-suggested',
        title: 'Nothing suggested',
        render: () => <Card capture={{ ...CARD, mcpServer: { scope: 'project' } }} />,
      },
      {
        id: 'bad-address',
        title: 'An address that would be refused',
        description: 'Said at once when the agent suggested it, in Settings’ words.',
        render: () => (
          <Card
            capture={{
              ...CARD,
              mcpServer: { ...LINEAR, url: 'http://mcp.linear.app/mcp' },
            }}
          />
        ),
      },
      {
        id: 'sign-in',
        title: 'Sign in',
        description: 'The server is added; the agent goes on waiting until the sign-in finishes.',
        render: () => <SignIn />,
      },
      {
        id: 'sign-in-waiting',
        title: 'Finishing in the browser',
        description: 'The backend answers the card when the browser comes back.',
        render: () => <SignIn pendingUrl={SIGN_IN_PAGE} />,
      },
      {
        id: 'sign-in-failed',
        title: 'The sign-in could not start',
        render: () => <SignIn error="Could not start the sign-in." />,
      },
    ],
  },
]
