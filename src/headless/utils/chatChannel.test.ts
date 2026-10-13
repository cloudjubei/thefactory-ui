import { describe, expect, it } from 'vitest'
import type { ChatContext } from 'thefactory-tools/types'

import { chatBadgeInputOf, chatChannelOf, processRunChatNewsByRun } from './chatChannel'

const runChat: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-r1' }
const otherRunChat: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-r2' }
const topic: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'ideas' }
const project: ChatContext = { type: 'PROJECT', projectId: 'p' }
const group: ChatContext = { type: 'GROUP', groupId: 'g' }
const stepAgent: ChatContext = {
  type: 'AGENT_RUN_FEATURE',
  projectId: 'p',
  storyId: 's',
  featureId: 'f',
  agentRunId: 'a1',
}

describe('chatChannelOf', () => {
  it('counts a process run’s own chat, and its step agents’ chats, on Processes', () => {
    expect(chatChannelOf(runChat)).toBe('processes')
    expect(chatChannelOf(stepAgent)).toBe('processes')
  })

  it('counts every other chat on Chat', () => {
    for (const context of [topic, project, group]) expect(chatChannelOf(context)).toBe('chat')
  })
})

describe('chatBadgeInputOf', () => {
  const news = { unreadMessages: 3, pendingAsks: 2, isThinking: true }

  it('brings the Chat channel nothing of a chat that counts on Processes', () => {
    expect(chatBadgeInputOf(runChat, news)).toEqual({
      unreadMessages: 0,
      pendingAsks: 0,
      isThinking: false,
    })
    expect(chatBadgeInputOf(stepAgent, news)).toEqual({
      unreadMessages: 0,
      pendingAsks: 0,
      isThinking: false,
    })
  })

  it('passes a chat that counts on Chat through whole', () => {
    expect(chatBadgeInputOf(topic, news)).toEqual(news)
  })
})

describe('processRunChatNewsByRun', () => {
  it('holds each run’s own chat news by run id', () => {
    const byRun = processRunChatNewsByRun([
      { context: runChat, unreadMessages: 2, pendingAsks: 1 },
      { context: otherRunChat, unreadMessages: 0 },
    ])
    expect([...byRun]).toEqual([
      ['r1', { unread: 2, asks: 1 }],
      ['r2', { unread: 0, asks: 0 }],
    ])
  })

  it('leaves out step agents’ chats — their asks are the run’s own stop — and every other chat', () => {
    const byRun = processRunChatNewsByRun([
      { context: stepAgent, unreadMessages: 4, pendingAsks: 1 },
      { context: topic, unreadMessages: 4, pendingAsks: 1 },
      { context: project, unreadMessages: 1 },
    ])
    expect(byRun.size).toBe(0)
  })
})
