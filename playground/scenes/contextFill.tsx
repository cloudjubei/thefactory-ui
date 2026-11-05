import { useState } from 'react'
import {
  ChatContextSettings,
  ChatDebugModal,
  ChatHeader,
  ChatKindTile,
  ContextFillChip,
  ContextFillPanel,
  CostChip,
  HeaderBar,
  MessageList,
  SegmentedControl,
  ToneBadge,
  type ChatMessageLike,
  type ContextFillChipAppearance,
} from 'thefactory-ui/web'
import {
  AppSettingsProvider,
  ChatActionsProvider,
  chatCompactLine,
  chatContextFillChip,
  useChatHeaderView,
  type ChatActions,
  type ChatCompactLineView,
  type ChatContextFillView,
  type ChatHeaderView,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import type { ChatContext } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ContextFillReadout } from '../../src/headless/api/generated'
import {
  FAKE_CHAT_CHECKPOINTS,
  FAKE_CONTEXT_READOUT,
  fakeContextFill,
} from '../../src/fakeBackend/fixtures/chatContext'
import type { Scene } from '../showcase/types'
import { Heard, OnFixtures, type FixtureRoutes } from './onFixtures'

const noop = () => {}
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const ACTIONS: ChatActions = {
  openReview: noop,
  reviewTargetOf: (runId) => runId ?? 'turn-1',
  draftMessage: noop,
}
const CONTEXT: ChatContext = { type: 'PROJECT', projectId: 'p1' }

const LOOKS: { id: ContextFillChipAppearance; label: string; note: string }[] = [
  {
    id: 'meter',
    label: 'Meter',
    note: 'The pick. A bar reads as “how full” at a glance and the share stays exact; it sits beside the cost chip without looking like one.',
  },
  {
    id: 'ring',
    label: 'Ring',
    note: 'Narrowest. At 14px the ring is hard to read below a quarter, and a ring beside a spinner can look like work in progress.',
  },
  {
    id: 'words',
    label: 'Words',
    note: 'Says what it is with no hover, at the cost of the widest chip: on a phone it pushes the model chip onto a third row.',
  },
]

const FILLS: Record<string, Partial<ContextFillReadout>> = {
  roomy: {},
  filling: { tokensUsed: 152_000, fillFraction: 0.76 },
  'nearly-full': { tokensUsed: 186_000, fillFraction: 0.93 },
  guessed: { windowSource: 'fallback' },
  unknown: { windowTokens: 0, fillFraction: 0 },
}

function chipOf(fill: string): ChatContextFillView {
  const chip = chatContextFillChip({
    turnsSinceLastContextUpdate: 1,
    contextFill: fakeContextFill(FILLS[fill]),
  })
  if (!chip) throw new Error(`No chip for ${fill}`)
  return chip
}

function withCompact(
  fill: string,
  over: { running?: boolean; line?: ChatCompactLineView } = {},
): ChatContextFillView {
  return {
    ...chipOf(fill),
    compact: { running: over.running === true, run: noop, stop: noop, ...over },
  }
}

const HEADER: ChatHeaderView = {
  kind: 'project',
  kindLabel: 'Project',
  title: 'Army builder',
  context: 'TheFactory UI',
  cost: { label: '$1.24' },
}

function Header({ fill = 'roomy', narrow = false }: { fill?: string; narrow?: boolean }) {
  return (
    <div className={narrow ? 'w-[340px]' : 'w-full max-w-[720px]'}>
      <ChatHeader view={{ ...HEADER, contextFill: withCompact(fill) }} narrow={narrow} />
    </div>
  )
}

/** The three looks switched on the board, each on the real header, its reasons beside it. */
function Alternatives({ fill = 'roomy' }: { fill?: string }) {
  const [look, setLook] = useState<ContextFillChipAppearance>('meter')
  const shown = LOOKS.find((l) => l.id === look) ?? LOOKS[0]!
  return (
    <div className="flex w-full max-w-[720px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel="Chip look"
          value={look}
          onChange={(value) => setLook(value as ContextFillChipAppearance)}
          options={LOOKS.map(({ id, label }) => ({ value: id, label }))}
        />
        {look === 'meter' ? <ToneBadge tone="done">The pick</ToneBadge> : null}
      </div>
      <p className="m-0 text-[13px] text-(--text-secondary)">{shown.note}</p>
      <div className="flex flex-wrap items-center gap-3">
        {Object.keys(FILLS).map((id) => (
          <ContextFillChip key={id} view={withCompact(id)} appearance={look} />
        ))}
      </div>
      <div className="rounded-lg border border-(--border-subtle)">
        <HeaderBar
          leading={<ChatKindTile kind="project" label="Project" />}
          title={HEADER.title}
          meta={
            <>
              <span className="min-w-0 truncate">{HEADER.context}</span>
              <CostChip label="$1.24" />
              <ContextFillChip view={withCompact(fill)} appearance={look} />
            </>
          }
        />
      </div>
    </div>
  )
}

const PANEL_STATES: {
  id: string
  title: string
  description: string
  view: ChatContextFillView
}[] = [
  {
    id: 'details',
    title: 'Details',
    description: 'A tap shows the fill, its tokens and Compact now.',
    view: withCompact('roomy'),
  },
  {
    id: 'nearly-full',
    title: 'Nearly full',
    description: 'At 90% and over the bar turns to the stuck colour; the words stay the same.',
    view: withCompact('nearly-full'),
  },
  {
    id: 'window-guessed',
    title: 'Window guessed',
    description: 'The model’s window is not in the catalogue, so the share reads ~ and says why.',
    view: withCompact('guessed'),
  },
  {
    id: 'window-unknown',
    title: 'Window unknown',
    description: 'No window at all: the chip says only Context, and the details the tokens used.',
    view: withCompact('unknown'),
  },
  {
    id: 'compacting',
    title: 'Compacting',
    description:
      'While it runs the chat reads as working and the composer offers Stop. Stop here asks first.',
    view: withCompact('filling', { running: true }),
  },
  {
    id: 'compacted',
    title: 'Compacted',
    description: 'Says what the next turn starts from.',
    view: withCompact('roomy', {
      line: chatCompactLine({
        outcome: 'compacted',
        readout: fakeContextFill({ tokensUsed: 24_000, fillFraction: 0.12 }),
      }),
    }),
  },
  ...(
    [
      ['nothing-needed', 'Nothing needed', 'The chat is short enough already.'],
      ['busy', 'Busy', 'A turn is running: nothing is queued.'],
      ['cancelled', 'Cancelled', 'Stop, or a new message, cut it short.'],
      ['failed', 'Failed', 'Every message is kept; only the fill stays as it was.'],
    ] as const
  ).map(([outcome, title, description]) => ({
    id: outcome,
    title,
    description,
    view: withCompact('filling', { line: chatCompactLine({ outcome }) }),
  })),
  {
    id: 'run-chat',
    title: 'Agent run chat',
    description: 'A run writes its own chat, so the fill shows and Compact now does not.',
    view: chipOf('filling'),
  },
]

function Panel({ view }: { view: ChatContextFillView }) {
  return (
    <div className="inline-flex rounded-lg border border-(--border-default) bg-(--surface-overlay) p-3 shadow-sm">
      <ContextFillPanel view={view} />
    </div>
  )
}

const MESSAGES: ChatMessageLike[] = [
  {
    id: 'one',
    role: 'user',
    content: 'List the factions the rules cover.',
    startedAt: '2026-11-05T09:00:00.000Z',
  },
  {
    id: 'two',
    role: 'assistant',
    content: 'Eight factions, listed in chapter 2.',
    completedAt: '2026-11-05T09:00:20.000Z',
  },
  {
    id: 'three',
    role: 'user',
    content: 'Now draft the roster screen.',
    startedAt: '2026-11-05T09:10:00.000Z',
  },
  {
    id: 'four',
    role: 'assistant',
    content: 'Drafted it with one row per unit.',
    completedAt: '2026-11-05T09:10:40.000Z',
  },
  {
    id: 'five',
    role: 'user',
    content: 'Add points totals.',
    startedAt: '2026-11-05T09:12:00.000Z',
  },
]

function Messages({
  boundary,
  numberMessagesToSend,
  width,
}: {
  boundary?: string
  numberMessagesToSend?: number
  width?: number
}) {
  return (
    <AppSettingsProvider storage={MEMORY}>
      <ChatActionsProvider value={ACTIONS}>
        <div
          className="flex h-[440px] min-h-0 flex-col bg-(--surface-base)"
          style={width ? { width } : undefined}
        >
          <MessageList
            chatId="project_p1"
            messages={MESSAGES}
            {...(boundary
              ? { contextBoundary: { messageId: boundary, at: '2026-11-05T09:11:00.000Z' } }
              : {})}
            {...(numberMessagesToSend ? { numberMessagesToSend } : {})}
          />
        </div>
      </ChatActionsProvider>
    </AppSettingsProvider>
  )
}

function Settings({
  stored,
  defaultOpen = true,
}: {
  stored: { seedCeilingFraction?: number; cliContextStaleTurns?: number }
  defaultOpen?: boolean
}) {
  const [completion, setCompletion] = useState(stored)
  return (
    <div className="w-full max-w-[460px] rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
      <ChatContextSettings
        completion={completion}
        persistSettings={(patch) => setCompletion({ ...completion, ...patch })}
        defaultOpen={defaultOpen}
      />
    </div>
  )
}

const LIVE_ROUTES: FixtureRoutes = {
  'POST /api/v1/chats/context-readout': () => FAKE_CONTEXT_READOUT,
  'POST /api/v1/chats/compact-now': () =>
    new Promise((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            outcome: 'compacted',
            readout: fakeContextFill({ tokensUsed: 24_000, fillFraction: 0.12 }),
          }),
        900,
      )
    }),
  '/api/v1/cli-runs': () => [],
  '/api/v1/completions/turn': () => ({ active: false }),
}

/** The real header view on fixture answers: the readout read, and Compact now sent. */
function LiveHeader() {
  const view = useChatHeaderView(CONTEXT)
  return (
    <div className="w-full max-w-[720px]">
      <ChatHeader view={view} />
    </div>
  )
}

const DEBUG_EVENTS = FAKE_CHAT_CHECKPOINTS.map((data) => ({
  event: 'chats:context-checkpoint',
  data: { ...data, chatContextId: getChatContextKey(CONTEXT) },
}))

export const CONTEXT_FILL_SCENES: Scene[] = [
  {
    id: 'chat-context-fill',
    title: 'Context fill chip',
    component: 'ContextFillChip',
    group: 'Chat',
    description:
      'How full a chat’s working context is, as a small chip in its header, the same on every model. It shows once a turn has finished. A tap shows the fill and Compact now. Meter is the pick; Ring and Words are on the board.',
    states: [
      {
        id: 'alternatives',
        title: 'Alternatives',
        description: 'Meter, Ring and Words, switched here on the real chip and header.',
        render: () => <Alternatives />,
      },
      {
        id: 'in-header',
        title: 'In the header',
        description: 'The chip sits after the cost on the line under the title.',
        render: () => <Header />,
      },
      {
        id: 'in-header-narrow',
        title: 'In a narrow header',
        description: 'A docked panel at 340px: the chip wraps with the line, never clipped.',
        render: () => <Header narrow />,
      },
      {
        id: 'filling',
        title: 'Filling',
        description: 'From 70%, where the host starts writing notes ahead of a cut.',
        render: () => <Header fill="filling" />,
      },
      {
        id: 'nearly-full',
        title: 'Nearly full',
        description: 'From 90%.',
        render: () => <Header fill="nearly-full" />,
      },
      ...PANEL_STATES.map((state) => ({
        id: `panel-${state.id}`,
        title: state.title,
        description: state.description,
        render: () => <Panel view={state.view} />,
      })),
      {
        id: 'live',
        title: 'Real hooks on fixtures',
        description:
          'useChatHeaderView reading the readout, and Compact now posting, on fixture answers. Tap the chip.',
        render: () => (
          <OnFixtures routes={LIVE_ROUTES}>
            <LiveHeader />
          </OnFixtures>
        ),
      },
    ],
    controls: [
      {
        id: 'look',
        label: 'Chip look',
        kind: 'choice',
        options: LOOKS.map(({ id, label }) => ({ id, label })),
        default: 'meter',
      },
      {
        id: 'fill',
        label: 'Fill',
        kind: 'choice',
        options: Object.keys(FILLS).map((id) => ({ id, label: id })),
        default: 'roomy',
      },
    ],
    presets: LOOKS.map(({ id, label }) => ({ id, name: label, values: { look: id } })),
    play: (values) => (
      <div className="flex flex-col gap-3">
        <ContextFillChip
          view={withCompact(values.fill ?? 'roomy')}
          appearance={(values.look ?? 'meter') as ContextFillChipAppearance}
        />
        <Panel view={withCompact(values.fill ?? 'roomy')} />
      </div>
    ),
  },
  {
    id: 'chat-context-boundary',
    title: 'Context boundary line',
    component: 'MessageList',
    group: 'Chat',
    description:
      'After a compact, a line above the first message still sent. Older messages stay to read; the line says what is above it is no longer sent to the model.',
    states: [
      {
        id: 'compacted',
        title: 'After a compact',
        description: 'The line sits above the first message still sent.',
        render: () => <Messages boundary="four" />,
      },
      {
        id: 'narrow',
        title: 'Narrow',
        description: 'At a phone’s width the words wrap to two lines inside the rules.',
        render: () => <Messages boundary="four" width={340} />,
      },
      {
        id: 'with-cutoff',
        title: 'With the messages-to-send line',
        description: 'A cutoff below the boundary still decides what is sent, so both show.',
        render: () => <Messages boundary="two" numberMessagesToSend={2} />,
      },
      {
        id: 'cutoff-above',
        title: 'Cutoff above the boundary',
        description: 'A cutoff above it marks nothing that is sent, so only the boundary shows.',
        render: () => <Messages boundary="five" numberMessagesToSend={4} />,
      },
      {
        id: 'nothing-cut',
        title: 'Nothing cut',
        description: 'A boundary on the first message cuts nothing: there is no line.',
        render: () => <Messages boundary="one" />,
      },
    ],
    controls: [
      {
        id: 'boundary',
        label: 'First message still sent',
        kind: 'choice',
        options: ['two', 'four', 'five'].map((id) => ({ id, label: id })),
        default: 'four',
      },
    ],
    play: (values) => <Messages boundary={values.boundary ?? 'four'} />,
  },
  {
    id: 'chat-context-settings',
    title: 'Advanced chat settings',
    component: 'ChatContextSettings',
    group: 'Chat',
    description:
      'The two settings a chat’s context is kept within, folded under Advanced in the chat’s settings, the same on every model.',
    states: [
      {
        id: 'folded',
        title: 'Folded',
        description: 'How it starts: neither setting needs touching in the ordinary run of things.',
        render: () => <Settings stored={{}} defaultOpen={false} />,
      },
      {
        id: 'defaults',
        title: 'Defaults',
        description: 'A chat that has set neither reads what the host uses: 50% and 3 turns.',
        render: () => <Settings stored={{}} />,
      },
      {
        id: 'off',
        title: 'Notes turned off',
        description: '0 turns reads as Off.',
        render: () => <Settings stored={{ seedCeilingFraction: 0.25, cliContextStaleTurns: 0 }} />,
      },
    ],
    play: () => <Settings stored={{}} />,
  },
  {
    id: 'chat-context-debug',
    title: 'Context numbers in Debug',
    component: 'ChatDebugModal',
    group: 'Chat',
    description:
      'Turns since the last notes update and checkpoint activity show here and nowhere else: a checkpoint is never a chat row, a turn or a working state.',
    states: [
      {
        id: 'open',
        title: 'Debug view',
        overlay: true,
        description: 'The line above the dump, and the same numbers in it under contextUpkeep.',
        render: () => (
          <OnFixtures
            routes={{
              ...LIVE_ROUTES,
              '/api/v1/cli-runs': () => [],
            }}
          >
            <Heard events={DEBUG_EVENTS}>
              <ChatDebugModal isOpen onClose={noop} context={CONTEXT} />
            </Heard>
          </OnFixtures>
        ),
      },
    ],
    kind: 'screen',
    play: () => (
      <div className="contents">
        <OnFixtures routes={LIVE_ROUTES}>
          <Heard events={DEBUG_EVENTS}>
            <ChatDebugModal isOpen onClose={noop} context={CONTEXT} />
          </Heard>
        </OnFixtures>
      </div>
    ),
  },
]
