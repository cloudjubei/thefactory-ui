import { describe, expect, it } from 'vitest'
import { chatUpdateTarget, withChat, withFullRefresh } from './chatUpdates'

const project = (projectId: string) => ({ type: 'PROJECT' as const, projectId })
const chat = (projectId: string, n: number) => ({
  context: project(projectId),
  messages: Array.from({ length: n }, (_, i) => ({ role: 'user' as const, content: `m${i}` })),
})
const key = (c: { context: { projectId?: string } }) => `/projects/${c.context.projectId}`

describe('chatUpdateTarget', () => {
  it('names the chat whose messages changed', () => {
    expect(chatUpdateTarget({ action: 'messages_added', context: project('p') })).toEqual(
      project('p'),
    )
  })

  it('names the chat for every in-place change', () => {
    for (const action of [
      'created',
      'updated',
      'message_deleted',
      'cleared',
      'rated',
      'dynamic_context_updated',
    ]) {
      expect(chatUpdateTarget({ action, context: project('p') })).toEqual(project('p'))
    }
  })

  it('asks for everything when a chat left the list', () => {
    expect(chatUpdateTarget({ action: 'deleted', context: project('p') })).toBeUndefined()
    expect(chatUpdateTarget({ action: 'archived', context: project('p') })).toBeUndefined()
  })

  it('asks for everything when the update names no chat or is unknown', () => {
    expect(chatUpdateTarget({ action: 'messages_added' })).toBeUndefined()
    expect(chatUpdateTarget({ action: 'data_location_changed' })).toBeUndefined()
    expect(chatUpdateTarget(undefined)).toBeUndefined()
    expect(chatUpdateTarget('messages_added')).toBeUndefined()
  })
})

describe('withChat', () => {
  it('replaces the chat with the same context in place', () => {
    const next = withChat([chat('a', 1), chat('b', 1)], chat('a', 3), key)
    expect(next.map((c) => [c.context.projectId, c.messages.length])).toEqual([
      ['a', 3],
      ['b', 1],
    ])
  })

  it('adds a chat the list did not have', () => {
    const next = withChat([chat('a', 1)], chat('b', 2), key)
    expect(next.map((c) => c.context.projectId)).toEqual(['a', 'b'])
  })
})

describe('withFullRefresh', () => {
  it('takes the fetched list', () => {
    const next = withFullRefresh([chat('a', 1), chat('gone', 1)], [chat('a', 2)], new Set(), key)
    expect(next.map((c) => [c.context.projectId, c.messages.length])).toEqual([['a', 2]])
  })

  it('keeps a chat updated on its own after the refresh began', () => {
    const next = withFullRefresh(
      [chat('a', 5), chat('b', 1)],
      [chat('a', 4), chat('b', 2)],
      new Set(['/projects/a']),
      key,
    )
    expect(next.map((c) => [c.context.projectId, c.messages.length])).toEqual([
      ['a', 5],
      ['b', 2],
    ])
  })

  it('keeps a chat created after the refresh began', () => {
    const next = withFullRefresh([chat('new', 1)], [chat('a', 1)], new Set(['/projects/new']), key)
    expect(next.map((c) => c.context.projectId)).toEqual(['a', 'new'])
  })
})
