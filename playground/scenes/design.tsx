import type { ReactNode } from 'react'
import { designPlaygroundUrl, parseDesignPlaygroundManifest } from 'thefactory-tools/utils'
import type {
  DesignIndex,
  DesignProposal,
  DesignProposalEntry,
  DesignSource,
  DesignTidyPlan,
  DesignVersion,
} from '../../src/headless/api'
import type { DesignActions, DesignSelection, DesignShown } from '../../src/headless'
// Not on the package's public surface: the Design tab's page and its parts draw only what they
// are given; the showcase reaches into the source for them.
import { toolAskCardView } from '../../src/headless/utils/toolAskCard'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import { DesignAskSummaryBox } from '../../src/web/compound/design/DesignAskBox'
import DesignPage from '../../src/web/compound/design/DesignPage'
import DesignPlayground, {
  type DesignPlaygroundProps,
} from '../../src/web/compound/design/DesignPlayground'
import DesignProposals from '../../src/web/compound/design/DesignProposals'
import type { DesignCellRef } from '../../src/web/compound/design/DesignScreenGrid'
import { playgroundMessage } from '../showcase/registry'
import type { Scene } from '../showcase/types'

const noop = () => {}
const done = () => Promise.resolve(undefined as never)
const DAY = 86_400_000
const T0 = 1_760_000_000_000
const at = (days: number) => ({ createdAt: T0 + days * DAY, updatedAt: T0 + days * DAY })

const ACTIONS = new Proxy({} as DesignActions, { get: () => done })

type Block = { x: number; y: number; w: number; h: number; fill: string; dashed?: boolean }

/** A schematic screen as an SVG data address — fixed shapes, so every load draws the same. */
function mock(blocks: Block[], dark = false): string {
  const bg = dark ? '#111827' : '#ffffff'
  const rects = blocks
    .map(
      (b) =>
        `<rect x="${b.x * 4}" y="${b.y * 3}" width="${b.w * 4}" height="${b.h * 3}" rx="6" fill="${b.fill}"${
          b.dashed ? ' stroke="#d97706" stroke-dasharray="6 4" stroke-width="2"' : ''
        }/>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="${bg}"/>${rects}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const bar = (dark = false): Block => ({
  x: 0,
  y: 0,
  w: 100,
  h: 11,
  fill: dark ? '#1f2937' : '#e9edf2',
})
const row = (y: number, dark = false): Block => ({
  x: 5,
  y,
  w: 90,
  h: 10,
  fill: dark ? '#374151' : '#f1f4f8',
})
const chip: Block = { x: 68, y: 3, w: 26, h: 6, fill: '#cffafe' }
const cta: Block = { x: 66, y: 86, w: 28, h: 9, fill: '#0369a1' }
const fresh = (y: number): Block => ({ x: 5, y, w: 90, h: 14, fill: '#fef3c7', dashed: true })
const card = (x: number, y: number): Block => ({ x, y, w: 43, h: 30, fill: '#f1f4f8' })

/** Every picture the sample design shows, by the file name its source names. */
const PICTURES: Record<string, string> = {
  'setup-v1.png': mock([bar(), row(18), row(31), cta]),
  'setup-v2.png': mock([bar(), row(18), row(31), row(44), cta]),
  'setup-dark.png': mock([bar(true), row(18, true), row(31, true), row(44, true), cta], true),
  'setup-empty.png': mock([bar(), cta]),
  'setup-faction.png': mock([bar(), chip, row(18), row(31), row(44), fresh(58), cta]),
  'roster-v2.png': mock([
    bar(),
    row(18),
    row(30),
    row(42),
    row(54),
    { ...cta, x: 5, y: 88, w: 20, h: 8 },
  ]),
  'roster-faction.png': mock([
    bar(),
    chip,
    row(18),
    row(30),
    row(42),
    row(54),
    { x: 80, y: 31, w: 12, h: 5, fill: '#fef3c7', dashed: true },
  ]),
  'picker.png': mock([
    bar(),
    { x: 5, y: 18, w: 90, h: 12, fill: '#cffafe' },
    { x: 5, y: 33, w: 90, h: 12, fill: '#cffafe' },
    { x: 74, y: 88, w: 20, h: 8, fill: '#0369a1' },
  ]),
  'grid-setup.png': mock([bar(), chip, card(5, 18), card(52, 18), card(5, 52), card(52, 52), cta]),
  'grid-roster.png': mock([
    bar(),
    chip,
    { x: 5, y: 18, w: 28, h: 32, fill: '#f1f4f8' },
    { x: 36, y: 18, w: 28, h: 32, fill: '#f1f4f8' },
    { x: 67, y: 18, w: 28, h: 32, fill: '#f1f4f8' },
  ]),
  'chip-light.png': mock([{ x: 20, y: 40, w: 60, h: 20, fill: '#cffafe' }]),
  'chip-dark.png': mock([{ x: 20, y: 40, w: 60, h: 20, fill: '#155e75' }], true),
  'console-visual.png': mock(
    [
      { x: 0, y: 0, w: 100, h: 100, fill: '#052e16' },
      { x: 8, y: 10, w: 40, h: 8, fill: '#22c55e' },
      { x: 8, y: 30, w: 84, h: 50, fill: '#14532d' },
    ],
    true,
  ),
  'console-readable.png': mock([
    { x: 8, y: 10, w: 40, h: 8, fill: '#166534' },
    { x: 8, y: 30, w: 84, h: 50, fill: '#dcfce7' },
  ]),
  'manual-visual.png': mock([
    { x: 0, y: 0, w: 100, h: 100, fill: '#fef3c7' },
    { x: 8, y: 10, w: 60, h: 10, fill: '#92400e' },
    { x: 8, y: 30, w: 40, h: 50, fill: '#fde68a' },
  ]),
  'manual-readable.png': mock([
    { x: 8, y: 10, w: 60, h: 10, fill: '#78350f' },
    { x: 8, y: 30, w: 84, h: 50, fill: '#fffbeb' },
  ]),
}

const png = (name: string): DesignSource => ({
  type: 'blob',
  sha256: Array.from(name, (c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64),
  mediaType: 'image/png',
  bytes: 2048,
  originalName: name,
})

const srcOf = (shown: DesignShown): string | undefined =>
  shown.source.type === 'blob' ? PICTURES[shown.source.originalName] : undefined

const version = (
  id: string,
  stateId: string,
  variant: string,
  number: number,
  file: string,
  day: number,
  proposalId?: string,
): DesignVersion => ({
  id,
  stateId,
  variant,
  number,
  source: png(file),
  origin: { by: proposalId ? 'agent' : 'run' },
  ...(proposalId ? { proposalId } : {}),
  createdAt: T0 + day * DAY,
})

const entry = (
  id: string,
  target: DesignProposalEntry['target'],
  variant: string,
  file: string,
  over: Partial<DesignProposalEntry> = {},
): DesignProposalEntry => ({
  id,
  target,
  variant,
  source: png(file),
  links: [],
  pieces: [],
  ...over,
})

const FACTION: DesignProposal = {
  id: 'faction',
  appId: 'army',
  title: 'Faction cards in the builder',
  status: 'open',
  origin: { by: 'run', runId: 'r16' },
  entries: [
    entry(
      'f-setup',
      { screenId: 'setup', stateId: 'loaded' },
      'Light · Desktop',
      'setup-faction.png',
      {
        links: [
          { x: 0.66, y: 0.86, w: 0.28, h: 0.09, label: 'Edit roster', toEntryId: 'f-roster' },
          { x: 0.68, y: 0.03, w: 0.26, h: 0.06, label: 'Faction chip', toEntryId: 'f-picker' },
        ],
        pieces: [
          { x: 0.68, y: 0.03, w: 0.26, h: 0.06, pieceId: 'chip' },
          { x: 0.05, y: 0.58, w: 0.9, h: 0.14, pieceId: 'chip' },
        ],
      },
    ),
    entry(
      'f-roster',
      { screenId: 'roster', stateId: 'full' },
      'Light · Desktop',
      'roster-faction.png',
      {
        links: [
          { x: 0.68, y: 0.03, w: 0.26, h: 0.06, label: 'Change faction', toEntryId: 'f-picker' },
        ],
        pieces: [{ x: 0.68, y: 0.03, w: 0.26, h: 0.06, pieceId: 'chip' }],
      },
    ),
    entry(
      'f-picker',
      { screenName: 'Faction picker', stateName: 'Open' },
      'Light · Desktop',
      'picker.png',
      {
        links: [{ x: 0.74, y: 0.88, w: 0.2, h: 0.08, label: 'Done', toEntryId: 'f-roster' }],
      },
    ),
  ],
  pieces: [{ id: 'chip', label: 'Faction chip / card' }],
  ...at(6),
}

const LOOKS: DesignProposal[] = [
  {
    id: 'compact',
    appId: 'army',
    title: 'Compact list look',
    question: 'How should the builder look?',
    status: 'accepted',
    origin: { by: 'agent', chatContextId: 'chat' },
    entries: [
      entry(
        'c-setup',
        { screenId: 'setup', stateId: 'loaded' },
        'Light · Desktop',
        'setup-v1.png',
        { accepted: true },
      ),
    ],
    pieces: [],
    ...at(1),
    decidedAt: T0 + 1 * DAY,
  },
  {
    id: 'grid',
    appId: 'army',
    title: 'Card grid look',
    question: 'How should the builder look?',
    status: 'alternative',
    origin: { by: 'agent', chatContextId: 'chat' },
    entries: [
      entry(
        'g-setup',
        { screenId: 'setup', stateId: 'loaded' },
        'Light · Desktop',
        'grid-setup.png',
      ),
      entry(
        'g-roster',
        { screenId: 'roster', stateId: 'full' },
        'Light · Desktop',
        'grid-roster.png',
      ),
    ],
    pieces: [],
    ...at(1),
    decidedAt: T0 + 1 * DAY,
  },
]

const DIRECTIONS = (chosen?: 'console' | 'manual'): DesignProposal[] =>
  (['console', 'manual'] as const).map((d, i) => ({
    id: `dir-${d}`,
    appId: 'army',
    title: `Draft 00 · ${d === 'console' ? 'Tactical Console' : 'Field Manual'}`,
    question: 'Which direction for Draft 00?',
    status: chosen === undefined || chosen === d ? ('open' as const) : ('alternative' as const),
    origin: { by: 'agent' as const, chatContextId: 'chat' },
    entries: [
      entry(`${d}-visual`, {}, 'Visual', `${d}-visual.png`, {
        caseQuery: `?direction=${d}&mode=visual`,
      }),
      entry(`${d}-readable`, {}, 'Max readability', `${d}-readable.png`, {
        caseQuery: `?direction=${d}&mode=readable`,
      }),
    ],
    pieces: [],
    ...at(7 + i * 0.01),
  }))

const TIDY: DesignTidyPlan = {
  id: 'tidy',
  origin: { by: 'agent', chatContextId: 'chat' },
  status: 'open',
  moves: [
    {
      id: 'm1',
      kind: 'merge-apps',
      title: 'One app for the game',
      from: ['viewer'],
      to: { id: 'army' },
      why: 'Both are views of the same web app; their screens move under it.',
      decision: 'accept',
    },
    {
      id: 'm2',
      kind: 'fold-history',
      title: 'The setup screen, filed twice',
      from: ['empty'],
      to: { id: 'loaded' },
      why: 'Each was the current look at one sign-off. The newest stays current, the rest become its history.',
    },
    {
      id: 'm3',
      kind: 'remove-duplicate',
      title: 'One file filed twice',
      from: ['v-dup'],
      to: { id: 'v-setup-1' },
      why: 'Same file on two states; it keeps one place.',
      decision: 'leave',
    },
  ],
  ...at(8),
}

/**
 * A re-capture drew 'Army loaded' as Desktop · Visual and Phone · Visual, beside the old captures'
 * labels and the same state filed again at phone width.
 */
function recaptured(): DesignIndex {
  const index = sample()
  return {
    ...index,
    states: [
      ...index.states,
      { id: 'loaded-phone', screenId: 'setup', name: 'Army loaded — phone width', ...at(3) },
    ],
    versions: [
      ...index.versions,
      version('v-old-web', 'loaded', 'web:app:.', 1, 'setup-web.png', 2),
      version('v-old-default', 'loaded', 'Default', 1, 'setup-default.png', 3),
      version('v-old-phone', 'loaded-phone', 'Default', 1, 'setup-phone.png', 3),
      version('v-visual', 'loaded', 'Desktop · Visual', 1, 'setup-visual.png', 9),
      version('v-visual-phone', 'loaded', 'Phone · Visual', 1, 'setup-visual-phone.png', 9),
    ],
    tidyPlans: [
      {
        id: 'tidy-recapture',
        origin: { by: 'agent', chatContextId: 'chat' },
        status: 'open',
        moves: [
          {
            id: 'f1',
            kind: 'fold-versions',
            title: 'Old captures of Army loaded',
            from: ['v-old-web', 'v-old-default'],
            to: { id: 'loaded', name: 'Desktop · Visual' },
            why: 'The re-capture drew this state as Desktop · Visual; the old labels’ images are its history.',
            decision: 'accept',
          },
          {
            id: 'f2',
            kind: 'fold-versions',
            title: 'Army loaded, filed again at phone width',
            from: ['v-old-phone'],
            to: { id: 'loaded', name: 'Phone · Visual' },
            why: 'The same state at phone width; the empty state goes once its image moves.',
            decision: 'accept',
          },
        ],
        ...at(9),
      },
    ],
  }
}

/** WarGames' army builder: three screens, a shared component, versions, and proposals waiting. */
function sample(over: Partial<DesignIndex> = {}): DesignIndex {
  return {
    version: 2,
    apps: [
      { id: 'army', name: 'Army builder', kind: 'product', aliases: [], ...at(0) },
      { id: 'viewer', name: 'Matchup viewer', kind: 'product', aliases: [], ...at(0) },
    ],
    screens: [
      {
        id: 'setup',
        appId: 'army',
        name: 'Army setup',
        kind: 'screen',
        description: 'Choose a faction and start an army.',
        aliases: [],
        uses: ['chip'],
        variants: ['Light · Desktop', 'Dark · Desktop'],
        ...at(0),
      },
      {
        id: 'roster',
        appId: 'army',
        name: 'Roster editor',
        kind: 'screen',
        aliases: [],
        uses: ['chip'],
        variants: ['Light · Desktop'],
        ...at(0),
      },
      {
        id: 'chip',
        appId: 'army',
        name: 'Faction chip',
        kind: 'component',
        group: 'Chips and tones',
        description: 'The faction an army plays, everywhere it shows.',
        aliases: [],
        uses: [],
        variants: ['Light', 'Dark'],
        ...at(0),
      },
      {
        id: 'standings',
        appId: 'viewer',
        name: 'Standings',
        kind: 'screen',
        aliases: [],
        uses: [],
        variants: [],
        ...at(0),
      },
    ],
    states: [
      {
        id: 'loaded',
        screenId: 'setup',
        name: 'Army loaded',
        description: 'Three units picked.',
        address: '?scene=army-setup&state=loaded',
        ...at(0),
      },
      { id: 'empty', screenId: 'setup', name: 'No army yet', ...at(0) },
      { id: 'full', screenId: 'roster', name: 'Full roster', ...at(0) },
      { id: 'chip-default', screenId: 'chip', name: 'Picked', ...at(0) },
    ],
    versions: [
      version('v-setup-1', 'loaded', 'Light · Desktop', 1, 'setup-v1.png', 1, 'compact'),
      version('v-setup-2', 'loaded', 'Light · Desktop', 2, 'setup-v2.png', 4),
      version('v-setup-dark', 'loaded', 'Dark · Desktop', 1, 'setup-dark.png', 4),
      version('v-empty', 'empty', 'Light · Desktop', 1, 'setup-empty.png', 2),
      version('v-dup', 'empty', 'Dark · Desktop', 1, 'setup-v1.png', 2),
      version('v-roster', 'full', 'Light · Desktop', 2, 'roster-v2.png', 4),
      version('v-chip-l', 'chip-default', 'Light', 1, 'chip-light.png', 3),
      version('v-chip-d', 'chip-default', 'Dark', 1, 'chip-dark.png', 3),
    ],
    proposals: [FACTION, ...LOOKS],
    tidyPlans: [],
    ...over,
  }
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[820px] min-h-0 flex-col rounded-lg border border-(--border-subtle)">
      {children}
    </div>
  )
}

function page(index: DesignIndex, selection: DesignSelection, cell?: DesignCellRef) {
  return (
    <Frame>
      <DesignPage
        index={index}
        selection={selection}
        cell={cell}
        onCell={noop}
        onNavigate={noop}
        srcOf={srcOf}
        actions={ACTIONS}
        run={async () => true}
        onOpen={noop}
        onCompare={noop}
        onDiscuss={noop}
      />
    </Frame>
  )
}

/** The Overseer's own design: the run header saved from the playground once, the run page beside it. */
const PLAY_INDEX: DesignIndex = {
  version: 2,
  apps: [{ id: 'ui', name: 'Overseer', kind: 'product', aliases: [], ...at(0) }],
  screens: [
    {
      id: 'run-page',
      appId: 'ui',
      name: 'Process run page',
      kind: 'screen',
      aliases: [],
      uses: ['run-header'],
      variants: [],
      ...at(0),
    },
    {
      id: 'run-header',
      appId: 'ui',
      name: 'Run header',
      kind: 'component',
      aliases: [],
      uses: [],
      variants: ['Light · Desktop', 'Dark · Desktop', 'Light · Phone', 'Dark · Phone'],
      ...at(0),
    },
  ],
  states: [
    {
      id: 'top-level',
      screenId: 'run-header',
      name: 'Top-level run',
      address: 'scene=run-header&level=top&unread=false',
      ...at(1),
    },
  ],
  versions: [],
  proposals: [],
  tidyPlans: [],
}

/** The Design tab on its Playground, framing this very showcase's play pages. */
function playground(over: Partial<DesignPlaygroundProps> = {}) {
  const scenes = parseDesignPlaygroundManifest(playgroundMessage())!.scenes
  return (
    <Frame>
      <DesignPage
        index={PLAY_INDEX}
        selection={{ appId: 'ui', tab: 'playground' }}
        cell={undefined}
        onCell={noop}
        onNavigate={noop}
        srcOf={srcOf}
        actions={ACTIONS}
        run={async () => true}
        onOpen={noop}
        onCompare={noop}
        onDiscuss={noop}
        playgroundSlot={
          <DesignPlayground
            index={PLAY_INDEX}
            appId="ui"
            status={{ status: 'ready', sha: 'abc1234', dirty: false }}
            frameSrc={(address, theme) => designPlaygroundUrl('', address ?? '', theme)}
            scenes={scenes}
            initial={{ address: 'scene=run-header&level=nested&unread=true' }}
            onRetry={noop}
            onSave={async () => undefined}
            onOpenProposal={noop}
            {...over}
          />
        }
      />
    </Frame>
  )
}

function proposals(
  index: DesignIndex,
  proposalId: string,
  over: { initialView?: 'compare' | 'flow'; initialPiece?: string } = {},
) {
  return (
    <DesignProposals
      index={index}
      appId="army"
      proposal={index.proposals.find((p) => p.id === proposalId)}
      onSelect={noop}
      srcOf={srcOf}
      onOpen={noop}
      onCompare={noop}
      onAccept={done}
      onKeep={done}
      onChoose={done}
      onSendBack={done}
      onFile={done}
      {...over}
    />
  )
}

const LOOSE: DesignProposal = {
  id: 'loose',
  appId: 'army',
  title: 'Two screenshots from the chat',
  status: 'open',
  origin: { by: 'agent', chatContextId: 'chat' },
  entries: [
    entry('l1', {}, 'Light · Desktop', 'grid-setup.png'),
    entry(
      'l2',
      { screenId: 'roster', stateName: 'Empty roster' },
      'Light · Desktop',
      'grid-roster.png',
    ),
  ],
  pieces: [],
  ...at(9),
}

function askCard(tool: string, args: Record<string, unknown>) {
  const view = toolAskCardView({ label: tool, toolName: tool, args })
  const body = view.body.kind === 'design' ? view.body : undefined
  return (
    <div className="max-w-xl">
      <ToolAskCard view={view} busy={false} onApprove={noop} onDeny={noop} onLater={noop}>
        {body ? (
          <DesignAskSummaryBox
            index={sample()}
            entries={body.entries}
            newScreens={body.newScreens}
          />
        ) : null}
      </ToolAskCard>
    </div>
  )
}

export const DESIGN_SCENES: Scene[] = [
  {
    id: 'design-current',
    title: 'Design · current design',
    component: 'DesignPage',
    group: 'Design',
    kind: 'screen',
    description:
      'An app’s current design: each screen’s look now, and how many cells wait on a proposal. Nothing changes until a proposal is accepted.',
    states: [
      {
        id: 'overview',
        title: 'Every screen of the app',
        render: () => page(sample(), { appId: 'army', tab: 'current' }),
      },
      {
        id: 'screen',
        title: 'One screen, states × variants',
        description: 'Approved, changed (a proposal waits to replace it), new and missing cells.',
        render: () => page(sample(), { appId: 'army', tab: 'current', screenId: 'setup' }),
      },
      {
        id: 'screen-cell',
        title: 'A changed cell selected',
        description:
          'Approve this version, compare with the current one, its history and its address.',
        render: () =>
          page(
            sample(),
            { appId: 'army', tab: 'current', screenId: 'setup' },
            { stateId: 'loaded', variant: 'Light · Desktop' },
          ),
      },
      {
        id: 'component',
        title: 'A component, and where it is used',
        render: () =>
          page(
            sample(),
            { appId: 'army', tab: 'current', screenId: 'chip' },
            { stateId: 'chip-default', variant: 'Dark' },
          ),
      },
      {
        id: 'empty',
        title: 'No apps yet',
        render: () =>
          page(sample({ apps: [], screens: [], states: [], versions: [], proposals: [] }), {
            tab: 'current',
          }),
      },
    ],
  },
  {
    id: 'design-proposals',
    title: 'Design · proposals',
    component: 'DesignProposals',
    group: 'Design',
    kind: 'screen',
    description:
      'Everything not accepted yet, apart from the current design: grouped as waiting, answers to one question, or decided; compared with what is current or clicked through.',
    states: [
      {
        id: 'compare',
        title: 'A run’s proposal compared with what is current',
        render: () => page(sample(), { appId: 'army', tab: 'proposals', proposalId: 'faction' }),
      },
      {
        id: 'click-through',
        title: 'Clicked through its links',
        render: () => proposals(sample(), 'faction', { initialView: 'flow' }),
      },
      {
        id: 'shared-piece',
        title: 'A shared piece highlighted',
        render: () => proposals(sample(), 'faction', { initialPiece: 'chip' }),
      },
      {
        id: 'alternative',
        title: 'An alternative answer to a question',
        render: () => proposals(sample(), 'grid'),
      },
      {
        id: 'unfiled',
        title: 'An image not filed yet',
        description: 'It cannot be accepted until it is filed as a state of a screen.',
        render: () => proposals(sample({ proposals: [LOOSE, FACTION] }), 'loose'),
      },
      {
        id: 'sent-back',
        title: 'Sent back with a note',
        render: () =>
          proposals(
            sample({
              proposals: [
                { ...LOOSE, status: 'sent-back', note: 'Use the faction colours on the cards.' },
                FACTION,
              ],
            }),
            'loose',
          ),
      },
      {
        id: 'accepted',
        title: 'Accepted',
        render: () =>
          proposals(
            sample({
              proposals: [
                {
                  ...FACTION,
                  status: 'accepted',
                  entries: FACTION.entries.map((e) => ({ ...e, accepted: true })),
                },
              ],
            }),
            'faction',
          ),
      },
      {
        id: 'draft-cases',
        title: 'An HTML draft’s directions to choose between',
        description:
          'Each direction a row, each variant a column; choosing one keeps the others as alternatives.',
        render: () => proposals(sample({ proposals: DIRECTIONS() }), 'dir-console'),
      },
      {
        id: 'draft-chosen',
        title: 'A direction chosen, the other kept',
        render: () => proposals(sample({ proposals: DIRECTIONS('console') }), 'dir-console'),
      },
      {
        id: 'empty',
        title: 'No proposals',
        render: () => proposals(sample({ proposals: [] }), 'none'),
      },
    ],
  },
  {
    id: 'design-history',
    title: 'Design · history',
    component: 'DesignHistory',
    group: 'Design',
    kind: 'screen',
    description:
      'Every version each screen had, newest first; an earlier one comes back as a new proposal.',
    states: [
      {
        id: 'versions',
        title: 'Versions by screen and state',
        render: () => page(sample(), { appId: 'army', tab: 'history' }),
      },
    ],
  },
  {
    id: 'design-tidy',
    title: 'Design · tidy-up plan',
    component: 'DesignTidy',
    group: 'Design',
    kind: 'screen',
    description:
      'An agent’s plan of where each app, screen and version belongs; each move accepted or left, then applied.',
    states: [
      {
        id: 'plan',
        title: 'Moves to decide',
        render: () => page(sample({ tidyPlans: [TIDY] }), { appId: 'army', tab: 'tidy' }),
      },
      {
        id: 'older-images',
        title: 'Older images as history',
        description:
          'After a re-capture: the old labels’ images, and a state filed again at phone width, become history of the new variants.',
        render: () => page(recaptured(), { appId: 'army', tab: 'tidy' }),
      },
      {
        id: 'cannot-apply',
        title: 'An accepted move that cannot be applied',
        description: 'Merging screens of two apps before their apps are merged.',
        render: () =>
          page(
            sample({
              tidyPlans: [
                {
                  ...TIDY,
                  moves: [
                    {
                      id: 'm9',
                      kind: 'merge-screens',
                      title: 'Standings into setup',
                      from: ['standings'],
                      to: { id: 'setup' },
                      why: 'Same table.',
                      decision: 'accept',
                    },
                  ],
                },
              ],
            }),
            { appId: 'army', tab: 'tidy' },
          ),
      },
      {
        id: 'none',
        title: 'No plan',
        render: () => page(sample(), { appId: 'army', tab: 'tidy' }),
      },
    ],
  },
  {
    id: 'design-playground',
    title: 'Design · Playground',
    component: 'DesignPlayground (DesignPage)',
    group: 'Design',
    kind: 'screen',
    wide: true,
    description:
      'The project’s own showcase, live in a frame: a scene picked at the side, set by the controls it declares, in light or dark, on desktop or phone. Moving the controls changes nothing; Save as a state captures what is shown in every variant and proposes it, and every later sign-off captures it again.',
    states: [
      {
        id: 'live',
        title: 'A scene set by its controls',
        description:
          'The run header of a nested run with news in its chat: its presets, its two controls, theme and device, and the address it is at.',
        render: () => playground(),
      },
      {
        id: 'dark-phone',
        title: 'Dark, on a phone',
        description: 'The run’s model chip with a change waiting, dark, at a phone’s width.',
        render: () =>
          playground({
            initial: {
              address: 'scene=run-model-chip&run=pending&picker=false',
              theme: 'dark',
              device: 'phone',
            },
          }),
      },
      {
        id: 'save-new',
        title: 'Save as a new state',
        description:
          'The name a preset suggests and where it is filed: the scene’s own component first, any other screen after.',
        overlay: true,
        render: () =>
          playground({
            initial: { address: 'scene=run-header&level=nested&unread=false' },
            initialSaveOpen: true,
          }),
      },
      {
        id: 'save-existing',
        title: 'Save what is a state already',
        description:
          'The controls are the state “Top-level run”: saving adds a new version of it, not a second state.',
        overlay: true,
        render: () =>
          playground({
            initial: { address: 'scene=run-header&level=top&unread=false' },
            initialSaveOpen: true,
          }),
      },
      {
        id: 'saved',
        title: 'Saved',
        description: 'Where it went, and the way to its proposal.',
        render: () =>
          playground({ initialSaved: { proposalId: 'p1', where: 'Components › Run header' } }),
      },
      {
        id: 'building',
        title: 'Building',
        description: 'The playground is built from the checkout the first time it is opened.',
        render: () => playground({ status: { status: 'building' } }),
      },
      {
        id: 'failed',
        title: 'The build failed',
        description: 'Why, in the build’s own words, and a way to try again.',
        render: () =>
          playground({
            status: {
              status: 'failed',
              error: "The app's package.json has no script 'playground:build'.",
            },
          }),
      },
    ],
  },
  {
    id: 'design-ask-card',
    title: 'Design · an agent files designs',
    component: 'ToolAskCard + DesignAskBox',
    group: 'Design',
    description:
      'An agent’s design ask in the chat, in names: the screen it found, the states it replaces or adds, the variants once, and why a new screen is not one it resembles.',
    states: [
      {
        id: 'found-screen',
        title: 'Into a screen the design already has',
        render: () =>
          askCard('proposeDesign', {
            appId: 'army',
            title: 'Faction cards on setup',
            reason: 'The faction-card picker changes the setup panel.',
            entries: [
              {
                screenName: 'Army setup',
                stateName: 'Army loaded',
                variant: 'Light · Desktop',
                path: 'a.png',
              },
              {
                screenName: 'Army setup',
                stateName: 'Faction picked',
                variant: 'Dark · Desktop',
                path: 'b.png',
              },
            ],
          }),
      },
      {
        id: 'new-screen',
        title: 'A new screen, with why it is not one it resembles',
        render: () =>
          askCard('proposeDesign', {
            appId: 'army',
            title: 'Faction picker',
            entries: [
              {
                screenName: 'Faction picker',
                stateName: 'Open',
                variant: 'Light · Desktop',
                path: 'p.png',
              },
            ],
            newScreenReasons: {
              'Faction picker': {
                closest: ['Army setup'],
                why: 'A dialog over setup, opened from the chip.',
              },
            },
          }),
      },
      {
        id: 'playground-save',
        title: 'Saving a playground scene as a state',
        render: () =>
          askCard('saveDesignPlaygroundState', {
            appId: 'army',
            address: 'scene=faction-chip&faction=orks',
            screenName: 'Faction chip',
            stateName: 'Orks picked',
            reason: 'The chip had no state for a picked faction.',
          }),
      },
      {
        id: 'add-screen',
        title: 'Adding a screen',
        render: () =>
          askCard('addDesignScreen', {
            appId: 'army',
            name: 'Matchup viewer',
            closest: ['Standings'],
            why: 'Live matches, not results.',
          }),
      },
    ],
  },
]
