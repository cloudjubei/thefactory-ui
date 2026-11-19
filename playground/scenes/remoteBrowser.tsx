import { useState, type ReactNode } from 'react'
import {
  ChatHeader,
  ChatInput,
  MessageRow,
  RemoteBrowserBeside,
  RemoteBrowserButton,
  RemoteBrowserNotes,
  RemoteBrowserShareCard,
  RemoteBrowserView,
  type ChatMessageLike,
} from 'thefactory-ui/web'
import { REMOTE_BROWSER_TEXT, type ChatHeaderView } from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'
import {
  BROWSER_PROJECT,
  BROWSER_VIEWPORT,
  SHARED_URL,
  pricingFrame,
  useRemoteBrowserScene,
  type BrowserSceneProps,
} from './remoteBrowserFixtures'

const DESKTOP = { width: 1100, height: 700 }
const PHONE = { width: 390, height: 780 }
const HEADER: ChatHeaderView = {
  kind: 'project',
  kindLabel: 'Project',
  title: 'Pricing page review',
  context: 'Acme site',
}

const OPENED: ChatMessageLike[] = [
  { id: 'u1', role: 'user', content: 'Open acme.dev/pricing so we can go through the plans.' },
  {
    id: 'a1',
    role: 'assistant',
    model: 'Sonnet',
    content: 'It’s open. Pick anything you want changed and add a note.',
  },
]
const SHARED: ChatMessageLike = {
  id: 'a2',
  role: 'assistant',
  model: 'Sonnet',
  content: 'Look at this: on the Team card the price wraps under the button at this width.',
}

function Conversation({ messages }: { messages: ChatMessageLike[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id ?? i}
          msg={msg}
          globalIndex={i}
          totalMessages={messages.length}
          isThinking={false}
          isLast={i === messages.length - 1}
          prevUserMessagesLen={messages.length}
          enhancedTotalLength={messages.length}
        />
      ))}
    </div>
  )
}

function Demo({
  device,
  step = 'browse',
  shared = false,
  silent = false,
  idle = false,
}: BrowserSceneProps) {
  const { state, store } = useRemoteBrowserScene({ device, step, shared, silent, idle })
  const [text, setText] = useState('')
  const compact = device === 'phone'

  const notes = (
    <RemoteBrowserNotes
      projectId={BROWSER_PROJECT}
      notes={state.notes}
      onEdit={(id, comment) => store.editNote(id, comment)}
      onRemove={(id) => store.removeNote(id)}
    />
  )
  const composer = (
    <ChatInput
      value={text}
      onChange={setText}
      onSend={() => setText('')}
      clearOnSend
      leftHints={null}
      rightHints={null}
      placeholder="Message…"
    />
  )
  const chat = compact ? (
    <>
      {notes}
      {composer}
    </>
  ) : (
    <>
      <ChatHeader
        view={HEADER}
        narrow
        onCollapse={() => {}}
        extraRight={<RemoteBrowserButton open onToggle={() => {}} agentShares={shared} />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3.5">
        <Conversation messages={shared ? [...OPENED, SHARED] : OPENED} />
        {shared ? (
          <div className="pl-9">
            <RemoteBrowserShareCard
              url={SHARED_URL}
              frameData={pricingFrame(BROWSER_VIEWPORT.desktop).data}
            />
          </div>
        ) : null}
      </div>
      <div className="border-t border-(--border-subtle) bg-(--surface-raised)">
        {notes}
        {composer}
      </div>
    </>
  )
  const size = compact ? PHONE : DESKTOP
  return (
    <div
      className={`overflow-hidden border border-(--border-default) shadow-(--shadow-2) ${
        compact ? 'rounded-[28px]' : 'rounded-[10px]'
      }`}
      style={{ width: size.width, maxWidth: '100%', height: size.height }}
    >
      <RemoteBrowserBeside
        compact={compact}
        chatTitle={HEADER.title}
        chatMeta={REMOTE_BROWSER_TEXT.messages(shared ? 3 : 2)}
        browser={<RemoteBrowserView state={state} store={store} compact={compact} />}
        chat={chat}
      />
    </div>
  )
}

function At({ children }: { children: ReactNode }) {
  return <div className="flex justify-center">{children}</div>
}

const STATES: {
  id: string
  title: string
  description: string
  props: BrowserSceneProps
}[] = [
  {
    id: 'live',
    title: 'Browsing, beside the chat',
    description:
      'The page takes the main area, live; the chat keeps its column. The bar: Back, Forward, Reload, the address, Browse / Pick / Mark and who drives.',
    props: { device: 'desktop' },
  },
  {
    id: 'loading',
    title: 'Loading',
    description: 'The page is on its way: a bar under the address and the page’s outline.',
    props: { device: 'desktop', silent: true },
  },
  {
    id: 'empty',
    title: 'No page yet',
    description: 'Opened from the chat with no browser: type an address.',
    props: { device: 'desktop', idle: true },
  },
  {
    id: 'pick',
    title: 'Pick an element',
    description:
      'In Pick, a press finds the element under it: outlined with its selector and size, and a note for the agent opens beside it. Add to message stages it.',
    props: { device: 'desktop', step: 'pick' },
  },
  {
    id: 'mark',
    title: 'Mark an area',
    description:
      'In Mark, a drag draws an area: dashed with its size, and the same note opens inside it.',
    props: { device: 'desktop', step: 'mark' },
  },
  {
    id: 'notes',
    title: 'Notes staged',
    description:
      'Added picks and marks stay numbered on the page and wait above the composer, each with its note and a way off.',
    props: { device: 'desktop', step: 'notes' },
  },
  {
    id: 'shared',
    title: 'The agent shares its browser',
    description:
      'The agent’s browser shows beside the chat with Agent driving: the page takes picks and marks, not presses, until Take over. Its message carries the page.',
    props: { device: 'desktop', shared: true },
  },
  {
    id: 'lost',
    title: 'Reconnecting',
    description:
      'The socket dropped: the page greys out where it was and comes back on its own; Try now asks at once. Notes are kept.',
    props: { device: 'desktop', step: 'lost' },
  },
  {
    id: 'ended',
    title: 'Browser closed',
    description: 'The browser closed under the view: Open again opens the same page.',
    props: { device: 'desktop', step: 'ended' },
  },
]

const PHONE_STATES = STATES.filter((s) => s.id !== 'empty').map((s) => ({
  ...s,
  id: `${s.id}-phone`,
  title: `${s.title}, on a phone`,
  description: `${s.description} On a phone the page takes the screen; the chat folds to its composer under it.`,
  props: { ...s.props, device: 'phone' as const },
}))

export const REMOTE_BROWSER_SCENES: Scene[] = [
  {
    id: 'remote-browser',
    title: 'Browser beside the chat',
    component:
      'RemoteBrowserView / RemoteBrowserBeside / RemoteBrowserNotes / RemoteBrowserButton / RemoteBrowserShareCard',
    group: 'Chat',
    wide: true,
    description:
      'Any website, live beside a chat: drive it, pick elements or mark areas as notes for the agent, and share one browser with the agent. Fake browser in the page: no backend, no network.',
    states: [...STATES, ...PHONE_STATES].map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      render: () => (
        <At>
          <Demo {...s.props} />
        </At>
      ),
    })),
  },
]
