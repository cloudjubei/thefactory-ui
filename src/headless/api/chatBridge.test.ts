import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./generated', () => ({
  createTopicChat: vi.fn(),
  addChatMessages: vi.fn(),
}))

import { createTopicChat, addChatMessages } from './generated'
import { dispatchChatBridge } from './chatBridge.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

const CONTEXT = { type: 'PROJECT_TOPIC', projectId: 'p1', topicId: 't1' }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchChatBridge', () => {
  it('ignores non-chat messages so the host can compose other handlers', async () => {
    expect(await dispatchChatBridge('p1', { type: 'overseer:data.query', payload: {} })).toBeUndefined()
    expect(createTopicChat).not.toHaveBeenCalled()
  })

  it('creates a seeded project-topic chat and returns its context', async () => {
    asMock(createTopicChat).mockResolvedValue({ data: { context: CONTEXT } })
    asMock(addChatMessages).mockResolvedValue({ data: {} })
    const res = await dispatchChatBridge('p1', {
      type: 'overseer:chat.discuss',
      payload: { title: 'Finding: dead export', seed: 'Is this real?' },
    })
    expect(createTopicChat).toHaveBeenCalledWith({
      body: { type: 'project', entityId: 'p1', title: 'Finding: dead export' },
      throwOnError: true,
    })
    expect(addChatMessages).toHaveBeenCalledWith({
      body: { context: CONTEXT, messages: [{ role: 'user', content: 'Is this real?' }] },
      throwOnError: true,
    })
    expect(res).toEqual({ context: CONTEXT })
  })

  it('defaults a blank title and skips seeding when no seed is given', async () => {
    asMock(createTopicChat).mockResolvedValue({ data: { context: CONTEXT } })
    await dispatchChatBridge('p1', { type: 'overseer:chat.discuss', payload: {} })
    expect(createTopicChat).toHaveBeenCalledWith({
      body: { type: 'project', entityId: 'p1', title: 'Discussion' },
      throwOnError: true,
    })
    expect(addChatMessages).not.toHaveBeenCalled()
  })

  it('requires an active project', async () => {
    await expect(
      dispatchChatBridge(undefined, { type: 'overseer:chat.discuss', payload: {} }),
    ).rejects.toThrow(/active project/)
  })
})
