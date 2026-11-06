import { useState } from 'react'
import {
  CONNECTOR_NEW_ITEMS_EVENT,
  connectorNewItemsIndicator,
  DEFAULT_APP_SETTINGS,
  inkBadgeLook,
  navRowTitle,
  ProviderConnectionsProvider,
  type ConnectorNewItems,
} from 'thefactory-ui/headless'
import type { ExternalItem, GetProviderConnectionResponse } from 'thefactory-ui/headless/api'
import {
  Button,
  DotBadge,
  ImportTicketsModal,
  Modal,
  NavIndicator,
  ProviderConnectionsSettings,
  SegmentedControl,
} from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import { Heard, OnFixtures, type FixtureRoutes } from './onFixtures'

const AT = '2026-11-06T09:00:00.000Z'
const LOOK = inkBadgeLook(DEFAULT_APP_SETTINGS.userPreferences)
const BADGE_COLORS = DEFAULT_APP_SETTINGS.notifications.badgeColors

const JIRA: GetProviderConnectionResponse = {
  id: 'conn-jira',
  name: 'Acme Jira',
  provider: 'jira',
  username: 'kamil@acme.com',
  tokenSource: 'oauth',
  baseUrl: 'https://acme.atlassian.net',
  createdAt: AT,
  updatedAt: AT,
  hasToken: true,
  hasRefreshToken: true,
}

const GITHUB: GetProviderConnectionResponse = {
  id: 'conn-github',
  name: 'GitHub',
  provider: 'github',
  tokenSource: 'api-key',
  createdAt: AT,
  updatedAt: AT,
  hasToken: true,
  hasRefreshToken: false,
}

const TENANT = '["jira","https://acme.atlassian.net","cloud-1"]'

const ticket = (key: string, title: string, status = 'To Do'): ExternalItem => ({
  provider: 'jira',
  externalId: key,
  sourceTenant: TENANT,
  sourceItemId: `id-${key}`,
  title,
  description: '',
  status,
})

const ASSIGNED: ExternalItem[] = [
  ticket('OSC-418', 'Renewal date on the plan page'),
  ticket('OSC-421', 'Weekly review email skips Mondays'),
  ticket('OSC-422', 'Export a plan as PDF', 'In Progress'),
]

const counts = (connectionId: string, newCount: number, uncertainCount = 0): ConnectorNewItems => ({
  connectionId,
  identityEpoch: `epoch-${connectionId}`,
  newCount,
  uncertainCount,
  polledAt: AT,
})

function routesFor(jira: ConnectorNewItems): FixtureRoutes {
  return {
    '/api/v1/provider-connections': () => [JIRA, GITHUB],
    '/api/v1/provider-connections/new-items': () => [jira, counts(GITHUB.id, 0)],
    '/api/v1/provider-connections/{id}/assigned-items': () => ASSIGNED,
    'POST /api/v1/provider-connections/{id}/seen': ({ id }) => counts(id ?? '', 0),
  }
}

function Settings({ jira, live }: { jira: ConnectorNewItems; live?: ConnectorNewItems }) {
  return (
    <OnFixtures routes={routesFor(jira)}>
      <ProviderConnectionsProvider>
        <div className="w-[860px] max-w-full p-4">
          {live ? (
            <Heard events={[{ event: CONNECTOR_NEW_ITEMS_EVENT, data: live }]}>
              <ProviderConnectionsSettings />
            </Heard>
          ) : (
            <ProviderConnectionsSettings />
          )}
        </div>
      </ProviderConnectionsProvider>
    </OnFixtures>
  )
}

function Opened() {
  return (
    <OnFixtures routes={routesFor(counts(JIRA.id, 3))}>
      <ProviderConnectionsProvider>
        <div className="w-[860px] max-w-full p-4">
          <ProviderConnectionsSettings />
        </div>
        <Modal isOpen onClose={() => {}} title={`Import tickets · ${JIRA.name}`}>
          <ImportTicketsModal connection={JIRA} onClose={() => {}} />
        </Modal>
      </ProviderConnectionsProvider>
    </OnFixtures>
  )
}

type BadgeLayout = 'count' | 'words' | 'dot'

const BADGE_LAYOUTS: readonly BadgeLayout[] = ['count', 'words', 'dot']

const BADGE_LAYOUT_LABELS: Record<BadgeLayout, string> = {
  count: 'Count (ships)',
  words: 'Words',
  dot: 'Dot only',
}

const BADGE_LAYOUT_NOTES: Record<BadgeLayout, string> = {
  count:
    'The default that ships: the number in the person’s requests colour and badge look, as on the sidebar; a dot when tickets only may be new.',
  words:
    'The count in the label. Plain, but the button grows and the words change as tickets come in.',
  dot: 'One dot for anything new, the count only in the tooltip. Quietest, but says nothing of how many.',
}

const SAMPLES: readonly { label: string; counts: ConnectorNewItems }[] = [
  { label: '3 new', counts: counts(JIRA.id, 3) },
  { label: '2 new, 1 may be new', counts: counts(JIRA.id, 2, 1) },
  { label: 'Only may be new', counts: counts(JIRA.id, 0, 2) },
  { label: 'Nothing new', counts: counts(JIRA.id, 0) },
]

function words({ newCount, uncertainCount }: ConnectorNewItems): string {
  if (newCount > 0) return ` · ${newCount} new`
  if (uncertainCount > 0) return ' · may be new'
  return ''
}

function Sample({ layout, value }: { layout: BadgeLayout; value: ConnectorNewItems }) {
  const badge = connectorNewItemsIndicator(value)
  return (
    <Button
      variant="secondary"
      size="sm"
      className="whitespace-nowrap"
      title={navRowTitle('Import tickets', badge)}
    >
      {layout === 'words' ? `Import tickets${words(value)}` : 'Import tickets'}
      {layout === 'count' && (
        <span className="-my-1 flex">
          <NavIndicator indicator={badge} badgeColors={BADGE_COLORS} look={LOOK} />
        </span>
      )}
      {layout === 'dot' && badge.kind !== 'none' && (
        <DotBadge className="w-2 h-2" colorClass="bg-(--color-brand-600)" />
      )}
    </Button>
  )
}

function Samples({ layout }: { layout: BadgeLayout }) {
  return (
    <div className="grid w-[860px] max-w-full grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 p-4 text-sm">
      {SAMPLES.map(({ label, counts: value }) => (
        <div key={label} className="contents">
          <span className="text-(--text-secondary)">{label}</span>
          <span>
            <Sample layout={layout} value={value} />
          </span>
        </div>
      ))}
    </div>
  )
}

function ChooseBadgeLayout() {
  const [layout, setLayout] = useState<BadgeLayout>('count')
  return (
    <div className="flex flex-col gap-2 pt-4">
      <div className="px-4">
        <SegmentedControl
          ariaLabel="Badge"
          value={layout}
          onChange={(next) => setLayout(next as BadgeLayout)}
          options={BADGE_LAYOUTS.map((value) => ({ value, label: BADGE_LAYOUT_LABELS[value] }))}
        />
      </div>
      <Samples layout={layout} />
    </div>
  )
}

export const TICKET_NEW_ITEMS_SCENES: Scene[] = [
  {
    id: 'ticket-new-items',
    title: 'New tickets on Import tickets',
    component: 'ProviderConnectionsSettings · connectorNewItemsIndicator',
    group: 'Settings',
    description:
      'A connection a project or group uses is read in the background every few minutes. Import tickets shows how many assigned tickets are new since the person last opened it — the same badge on web, desktop and phone. A number counts only tickets definitely not shown before; tickets the connection cannot tell apart for sure show a dot and say “may be new” in the tooltip, never as part of the number. Opening Import tickets marks the listed tickets seen and the badge goes.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a badge',
        description: 'Three badges to compare on the same counts. Count ships.',
        render: () => <ChooseBadgeLayout />,
      },
      ...BADGE_LAYOUTS.map((layout) => ({
        id: `layout-${layout}`,
        title: BADGE_LAYOUT_LABELS[layout],
        description: BADGE_LAYOUT_NOTES[layout],
        render: () => <Samples layout={layout} />,
      })),
      {
        id: 'new',
        title: 'New tickets',
        description: 'Three tickets assigned since Import tickets was last opened.',
        render: () => <Settings jira={counts(JIRA.id, 3)} />,
      },
      {
        id: 'new-and-maybe',
        title: 'New, and some may be new',
        description: 'The number counts the two that are new; the tooltip adds “1 may be new”.',
        render: () => <Settings jira={counts(JIRA.id, 2, 1)} />,
      },
      {
        id: 'maybe-only',
        title: 'Only may be new',
        description:
          'The connection could not prove which tickets were shown before: a dot, no number.',
        render: () => <Settings jira={counts(JIRA.id, 0, 2)} />,
      },
      {
        id: 'nothing-new',
        title: 'Nothing new',
        description: 'Every assigned ticket was shown before: no badge.',
        render: () => <Settings jira={counts(JIRA.id, 0)} />,
      },
      {
        id: 'arrives-live',
        title: 'A new ticket arrives',
        description: 'Nothing new at first; the background read finds one and the badge shows it.',
        render: () => <Settings jira={counts(JIRA.id, 0)} live={counts(JIRA.id, 1)} />,
      },
      {
        id: 'opened',
        title: 'Import tickets opened',
        description:
          'The listed tickets are marked seen as they show, so the badge behind the dialog goes.',
        overlay: true,
        render: () => <Opened />,
      },
    ],
  },
]
