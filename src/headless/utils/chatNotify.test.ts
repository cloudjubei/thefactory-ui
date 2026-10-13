import { describe, expect, it } from 'vitest'
import {
  chatKindNotifyLevel,
  chatNotifyKind,
  chatNotifyLevel,
  chatNotifyLevelOptions,
  chatNotifyNews,
  withChatNotifyLevel,
} from './chatNotify'
import { DEFAULT_CHAT_NOTIFY_LEVELS } from './chatNotifyConstants'
import type { ChatNotifyLevels } from './chatNotifyTypes'

const runChat = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-abc' }
const topic = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'release' }
const story = { type: 'STORY', projectId: 'p', storyId: 's' }
const feature = { type: 'FEATURE', projectId: 'p', storyId: 's', featureId: 'f' }
const agentRun = {
  type: 'AGENT_RUN_FEATURE',
  projectId: 'p',
  storyId: 's',
  featureId: 'f',
  agentRunId: 'a',
}
const request = { type: 'FEATURE_REQUEST', projectId: 'p', featureRequestId: 'r' }
const project = { type: 'PROJECT', projectId: 'p' }
const group = { type: 'GROUP', groupId: 'g' }
const groupTopic = { type: 'GROUP_TOPIC', groupId: 'g', topicId: 't' }
const general = { type: 'GENERAL' }

const levels: ChatNotifyLevels = {
  run: 'nothing',
  work: 'needs-me',
  request: 'everything',
  project: 'needs-me',
  group: 'nothing',
}

describe('chatNotifyKind', () => {
  it.each([
    [runChat, 'run'],
    [agentRun, 'run'],
    [story, 'work'],
    [feature, 'work'],
    [request, 'request'],
    [project, 'project'],
    [topic, 'project'],
    [group, 'group'],
    [groupTopic, 'group'],
  ] as const)('reads %o as a %s chat', (context, kind) => {
    expect(chatNotifyKind(context)).toBe(kind)
  })

  it('reads the kind off the context’s fields, not a stale type', () => {
    expect(chatNotifyKind({ type: 'PROJECT', projectId: 'p', topicId: 'run-x' })).toBe('run')
  })

  it('gives the assistant’s chats no kind', () => {
    expect(chatNotifyKind(general)).toBeUndefined()
  })
})

describe('chatKindNotifyLevel', () => {
  it('is the person’s level for the chat’s kind', () => {
    expect(chatKindNotifyLevel(runChat, levels)).toBe('nothing')
    expect(chatKindNotifyLevel(request, levels)).toBe('everything')
  })

  it('is everything for a chat of no kind', () => {
    expect(chatKindNotifyLevel(general, levels)).toBe('everything')
  })

  it('defaults run chats and requests to when they need the person, the rest to everything', () => {
    expect(chatKindNotifyLevel(runChat, DEFAULT_CHAT_NOTIFY_LEVELS)).toBe('needs-me')
    expect(chatKindNotifyLevel(request, DEFAULT_CHAT_NOTIFY_LEVELS)).toBe('needs-me')
    for (const context of [story, project, groupTopic])
      expect(chatKindNotifyLevel(context, DEFAULT_CHAT_NOTIFY_LEVELS)).toBe('everything')
  })
})

describe('chatNotifyLevel', () => {
  it('is the chat’s own level when the person set one', () => {
    expect(chatNotifyLevel({ context: runChat, notifyLevel: 'everything' }, levels)).toBe(
      'everything',
    )
    expect(chatNotifyLevel({ context: general, notifyLevel: 'nothing' }, levels)).toBe('nothing')
  })

  it('is its kind’s level otherwise', () => {
    expect(chatNotifyLevel({ context: story }, levels)).toBe('needs-me')
    expect(chatNotifyLevel({ context: general }, levels)).toBe('everything')
  })
})

describe('chatNotifyNews', () => {
  const counts = { unreadMessages: 4, unreadNeedsYou: 1, pendingAsks: 2 }

  it('lets everything through at everything', () => {
    expect(chatNotifyNews(counts, 'everything')).toEqual({ unreadMessages: 4, pendingAsks: 2 })
  })

  it('lets only what needs the person through when it needs them', () => {
    expect(chatNotifyNews(counts, 'needs-me')).toEqual({ unreadMessages: 1, pendingAsks: 2 })
  })

  it('lets nothing through at nothing, asks included', () => {
    expect(chatNotifyNews(counts, 'nothing')).toEqual({ unreadMessages: 0, pendingAsks: 0 })
  })
})

describe('withChatNotifyLevel', () => {
  const chat = { context: project, title: 'T', notifyLevel: 'nothing' as const }

  it('sets the chat’s own level', () => {
    expect(withChatNotifyLevel({ context: project }, 'needs-me')).toEqual({
      context: project,
      notifyLevel: 'needs-me',
    })
  })

  it('takes the chat’s own level away, back to its kind’s', () => {
    const out = withChatNotifyLevel(chat, undefined)
    expect(out).toEqual({ context: project, title: 'T' })
    expect(out).not.toHaveProperty('notifyLevel')
  })
})

describe('chatNotifyLevelOptions', () => {
  it('offers the kind’s level first, then each level, the chat’s own picked', () => {
    expect(chatNotifyLevelOptions({ context: runChat, notifyLevel: 'nothing' }, levels)).toEqual([
      { value: undefined, label: 'My default (Nothing)', selected: false },
      { value: 'needs-me', label: 'When it needs me', selected: false },
      { value: 'everything', label: 'Everything', selected: false },
      { value: 'nothing', label: 'Nothing', selected: true },
    ])
  })

  it('picks the default for a chat with no level of its own', () => {
    const options = chatNotifyLevelOptions({ context: general }, levels)
    expect(options[0]).toEqual({
      value: undefined,
      label: 'My default (Everything)',
      selected: true,
    })
    expect(options.filter((o) => o.selected)).toHaveLength(1)
  })
})
