import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppNote } from '../utils/appNotesTypes'
import { ChatsProvider, useChats } from './createChatsContext'
import { useChatComposer } from '../hooks/useChatComposer'

const llm = vi.hoisted(() => {
  const at = '2026-10-25T10:00:00.000Z'
  const active = {
    id: 'cfg-1',
    name: 'Claude Opus',
    provider: 'anthropic' as const,
    model: 'claude-opus-5-5',
    hasApiKey: true,
    createdAt: at,
    updatedAt: at,
  }
  return { isLoaded: true, configs: [active], activeChatConfig: active }
})

const api = vi.hoisted(() => ({
  abortChatCompletion: vi.fn(),
  abortCliAgentRun: vi.fn(),
  addChatMessages: vi.fn(),
  clearChat: vi.fn(),
  consolidateChat: vi.fn(),
  createTopicChat: vi.fn(),
  deleteChat: vi.fn(),
  deleteLastChatMessage: vi.fn(),
  getChat: vi.fn(),
  getChatSummary: vi.fn(),
  getChatsSettings: vi.fn(),
  hideChatFromList: vi.fn(),
  getCliAgentRun: vi.fn(),
  listChatSummaries: vi.fn(),
  restartChatWithCli: vi.fn(),
  sendChatWithCli: vi.fn(),
  sendCompletionWithTools: vi.fn(),
  setChatNotifyLevel: vi.fn(),
  showChatInList: vi.fn(),
  updateChat: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return {
    ...actual,
    ...api,
    useApi: () => ({
      ws: { on: () => () => {}, onReconnect: () => () => {} },
      wsState: 'open',
      uploadChatFile: vi.fn(),
    }),
    useAuth: () => ({ token: 'test' }),
  }
})

vi.mock('./LLMConfigsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./LLMConfigsContext')>()
  return {
    ...actual,
    useLLMConfigs: () => llm as ReturnType<typeof actual.useLLMConfigs>,
  }
})

vi.mock('./StoriesContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./StoriesContext')>()
  return {
    ...actual,
    useStories: () =>
      ({
        getStory: () => undefined,
        getFeature: () => undefined,
      }) as unknown as ReturnType<typeof actual.useStories>,
  }
})

vi.mock('./ProjectsGroupsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ProjectsGroupsContext')>()
  return {
    ...actual,
    useProjectsGroups: () =>
      ({ getGroupById: () => undefined }) as unknown as ReturnType<typeof actual.useProjectsGroups>,
  }
})

vi.mock('./ProjectsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ProjectsContext')>()
  return {
    ...actual,
    useActiveProject: () =>
      ({ projectId: 'p1', project: { id: 'p1', title: 'P' } }) as ReturnType<
        typeof actual.useActiveProject
      >,
  }
})

const AT = '2026-10-25T10:00:00.000Z'
const CTX = { type: 'PROJECT' as const, projectId: 'p1' }

const note = (id: string, selector: string, screenshotFile?: string): AppNote => ({
  id,
  projectId: 'p1',
  comment: id === 'app-note-2' ? 'Picked while sending' : 'Make the renewal date easier to find.',
  targets: [
    {
      kind: 'element',
      selector,
      outerHtml: `<p id="${selector.slice(1)}">Renews November 20</p>`,
    },
  ],
  ...(screenshotFile ? { screenshotFile } : {}),
})

const RENEWAL = note('app-note-1', '#renewal')
const LATER = note('app-note-2', '#save')

function summary(cli: boolean) {
  return {
    context: CTX,
    title: 'Notes',
    messages: [] as unknown[],
    messageCount: 0,
    messageTimes: [],
    needsYouTimes: [],
    createdAt: AT,
    updatedAt: AT,
    ...(cli ? { cliRunner: { tool: 'claude-code', model: 'opus' } } : {}),
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <ChatsProvider>{children}</ChatsProvider>
}

type Sent = { content?: string; appNotes?: AppNote[] }

function sentOf(transport: 'api' | 'cli'): Sent {
  const mock = transport === 'api' ? api.addChatMessages : api.sendChatWithCli
  const body = mock.mock.calls[0]?.[0] as
    | { body: { messages?: Sent[]; message?: Sent } }
    | undefined
  const message = transport === 'api' ? body?.body.messages?.[0] : body?.body.message
  if (!message) throw new Error(`${transport} send was not called`)
  return message
}

async function mount(cli: boolean) {
  api.listChatSummaries.mockResolvedValue({ data: [summary(cli)] })
  const hook = renderHook(() => ({ composer: useChatComposer(CTX), chats: useChats() }), {
    wrapper,
  })
  await waitFor(() => expect(hook.result.current.chats.isLoaded).toBe(true))
  if (cli) {
    await waitFor(() => expect(hook.result.current.chats.getChat(CTX)?.cliRunner).toBeTruthy())
  }
  return hook
}

type ComposerHook = Awaited<ReturnType<typeof mount>>

async function send(hook: ComposerHook, text: string, notes: AppNote[]) {
  await act(async () => {
    hook.result.current.composer.setAppNotes(notes)
    await hook.result.current.composer.send(text)
  })
}

/** What ChatInput passes as `onSend`'s third argument — not via `setAppNotes`. */
async function sendMeta(hook: ComposerHook, text: string, notes: AppNote[]) {
  expect(hook.result.current.composer.appNotes).toEqual([])
  await act(async () => {
    await hook.result.current.composer.send(text, [], { reason: 'user', appNotes: notes })
  })
}

describe('the shared send carries app notes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    for (const fn of Object.values(api)) fn.mockReset()
    api.listChatSummaries.mockResolvedValue({ data: [] })
    api.getChatsSettings.mockResolvedValue({ data: {} })
    api.getChat.mockResolvedValue({
      data: { context: CTX, messages: [], createdAt: AT, updatedAt: AT },
    })
    api.addChatMessages.mockResolvedValue({ data: { context: CTX, messages: [] } })
    api.sendCompletionWithTools.mockResolvedValue({ data: { resultType: 'success', results: [] } })
    api.sendChatWithCli.mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('API transport', () => {
    it('sends text and the draft’s notes on the user message', async () => {
      const hook = await mount(false)
      await send(hook, 'Look at the renewal date.', [RENEWAL])
      expect(sentOf('api')).toMatchObject({
        content: 'Look at the renewal date.',
        appNotes: [RENEWAL],
      })
      expect(api.sendChatWithCli).not.toHaveBeenCalled()
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('sends a note with no text', async () => {
      const hook = await mount(false)
      await send(hook, '', [RENEWAL])
      expect(sentOf('api')).toMatchObject({ content: '', appNotes: [RENEWAL] })
      expect(api.sendChatWithCli).not.toHaveBeenCalled()
    })

    it('puts the notes back when the send fails', async () => {
      api.addChatMessages.mockRejectedValueOnce(new Error('offline'))
      const hook = await mount(false)
      await send(hook, 'Look at the renewal date.', [RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.text).toBe('Look at the renewal date.')
      expect(api.sendCompletionWithTools).not.toHaveBeenCalled()
    })

    it('keeps a note picked while the send is still out', async () => {
      let release!: (value: unknown) => void
      api.addChatMessages.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve
        }),
      )
      const hook = await mount(false)
      act(() => hook.result.current.composer.setAppNotes([RENEWAL]))
      let flying!: Promise<boolean>
      act(() => {
        flying = hook.result.current.composer.send('Look at the renewal date.')
      })
      await waitFor(() => expect(api.addChatMessages).toHaveBeenCalled())
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        release({ data: { context: CTX, messages: [] } })
        await flying
      })
      expect(hook.result.current.composer.appNotes).toEqual([LATER])
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
    })

    it('does not send a screenshot that is not a kept attachment path', async () => {
      const hook = await mount(false)
      const leaked = note('app-note-1', '#renewal', 'data:image/png;base64,abc')
      const kept = note('app-note-2', '#save', '.factory/attachments/shot.png')
      await send(hook, 'Look', [leaked, kept])
      const sent = sentOf('api').appNotes ?? []
      expect(sent[0]).not.toHaveProperty('screenshotFile')
      expect(sent[1]?.screenshotFile).toBe('.factory/attachments/shot.png')
    })

    it('sends notes passed on the send meta when they are not on the draft', async () => {
      const hook = await mount(false)
      await sendMeta(hook, 'Look at the renewal date.', [RENEWAL])
      expect(sentOf('api')).toMatchObject({
        content: 'Look at the renewal date.',
        appNotes: [RENEWAL],
      })
      expect(api.sendChatWithCli).not.toHaveBeenCalled()
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('sends a note-only message from the send meta', async () => {
      const hook = await mount(false)
      await sendMeta(hook, '', [RENEWAL])
      expect(sentOf('api')).toMatchObject({ content: '', appNotes: [RENEWAL] })
    })

    it('puts send-meta notes back when the send fails', async () => {
      api.addChatMessages.mockRejectedValueOnce(new Error('offline'))
      const hook = await mount(false)
      await sendMeta(hook, 'Look at the renewal date.', [RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.text).toBe('Look at the renewal date.')
    })

    it('keeps a draft note picked while a send-meta send is still out', async () => {
      let release!: (value: unknown) => void
      api.addChatMessages.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve
        }),
      )
      const hook = await mount(false)
      let flying!: Promise<boolean>
      act(() => {
        flying = hook.result.current.composer.send('Look at the renewal date.', [], {
          reason: 'user',
          appNotes: [RENEWAL],
        })
      })
      await waitFor(() => expect(api.addChatMessages).toHaveBeenCalled())
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        release({ data: { context: CTX, messages: [] } })
        await flying
      })
      expect(hook.result.current.composer.appNotes).toEqual([LATER])
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
    })

    it('sends the meta notes in place of notes still on the draft', async () => {
      const hook = await mount(false)
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        await hook.result.current.composer.send('Look', [], { reason: 'user', appNotes: [RENEWAL] })
      })
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('still sends draft notes when the meta carries only a reason', async () => {
      const hook = await mount(false)
      act(() => hook.result.current.composer.setAppNotes([RENEWAL]))
      await act(async () => {
        await hook.result.current.composer.send('Look', [], { reason: 'user' })
      })
      expect(sentOf('api').appNotes).toEqual([RENEWAL])
    })
  })

  describe('CLI transport', () => {
    it('sends text and the draft’s notes on the user message', async () => {
      const hook = await mount(true)
      await send(hook, 'Look at the renewal date.', [RENEWAL])
      expect(sentOf('cli')).toMatchObject({
        content: 'Look at the renewal date.',
        appNotes: [RENEWAL],
      })
      expect(api.addChatMessages).not.toHaveBeenCalled()
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('sends a note with no text', async () => {
      const hook = await mount(true)
      await send(hook, '', [RENEWAL])
      expect(sentOf('cli')).toMatchObject({ content: '', appNotes: [RENEWAL] })
      expect(api.addChatMessages).not.toHaveBeenCalled()
    })

    it('puts the notes back when the send fails', async () => {
      api.sendChatWithCli.mockRejectedValueOnce(new Error('offline'))
      const hook = await mount(true)
      await send(hook, 'Look at the renewal date.', [RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.text).toBe('Look at the renewal date.')
      expect(api.addChatMessages).not.toHaveBeenCalled()
    })

    it('keeps a note picked while the send is still out', async () => {
      let release!: (value: unknown) => void
      api.sendChatWithCli.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve
        }),
      )
      const hook = await mount(true)
      act(() => hook.result.current.composer.setAppNotes([RENEWAL]))
      let flying!: Promise<boolean>
      act(() => {
        flying = hook.result.current.composer.send('Look at the renewal date.')
      })
      await waitFor(() => expect(api.sendChatWithCli).toHaveBeenCalled())
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        release({ data: {} })
        await flying
      })
      expect(hook.result.current.composer.appNotes).toEqual([LATER])
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
    })

    it('does not send a screenshot that is not a kept attachment path', async () => {
      const hook = await mount(true)
      const leaked = note('app-note-1', '#renewal', 'data:image/png;base64,abc')
      const kept = note('app-note-2', '#save', '.factory/attachments/shot.png')
      await send(hook, 'Look', [leaked, kept])
      const sent = sentOf('cli').appNotes ?? []
      expect(sent[0]).not.toHaveProperty('screenshotFile')
      expect(sent[1]?.screenshotFile).toBe('.factory/attachments/shot.png')
    })

    it('sends notes passed on the send meta when they are not on the draft', async () => {
      const hook = await mount(true)
      await sendMeta(hook, 'Look at the renewal date.', [RENEWAL])
      expect(sentOf('cli')).toMatchObject({
        content: 'Look at the renewal date.',
        appNotes: [RENEWAL],
      })
      expect(api.addChatMessages).not.toHaveBeenCalled()
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('sends a note-only message from the send meta', async () => {
      const hook = await mount(true)
      await sendMeta(hook, '', [RENEWAL])
      expect(sentOf('cli')).toMatchObject({ content: '', appNotes: [RENEWAL] })
    })

    it('puts send-meta notes back when the send fails', async () => {
      api.sendChatWithCli.mockRejectedValueOnce(new Error('offline'))
      const hook = await mount(true)
      await sendMeta(hook, 'Look at the renewal date.', [RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.text).toBe('Look at the renewal date.')
    })

    it('keeps a draft note picked while a send-meta send is still out', async () => {
      let release!: (value: unknown) => void
      api.sendChatWithCli.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve
        }),
      )
      const hook = await mount(true)
      let flying!: Promise<boolean>
      act(() => {
        flying = hook.result.current.composer.send('Look at the renewal date.', [], {
          reason: 'user',
          appNotes: [RENEWAL],
        })
      })
      await waitFor(() => expect(api.sendChatWithCli).toHaveBeenCalled())
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        release({ data: {} })
        await flying
      })
      expect(hook.result.current.composer.appNotes).toEqual([LATER])
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
    })

    it('sends the meta notes in place of notes still on the draft', async () => {
      const hook = await mount(true)
      act(() => hook.result.current.composer.setAppNotes([LATER]))
      await act(async () => {
        await hook.result.current.composer.send('Look', [], { reason: 'user', appNotes: [RENEWAL] })
      })
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
      expect(hook.result.current.composer.appNotes).toEqual([])
    })

    it('still sends draft notes when the meta carries only a reason', async () => {
      const hook = await mount(true)
      act(() => hook.result.current.composer.setAppNotes([RENEWAL]))
      await act(async () => {
        await hook.result.current.composer.send('Look', [], { reason: 'user' })
      })
      expect(sentOf('cli').appNotes).toEqual([RENEWAL])
    })
  })
})
