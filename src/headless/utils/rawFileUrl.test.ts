import { describe, expect, it } from 'vitest'
import { chatAttachmentRawUrl, chatFileRawUrl, rawFileUrl } from './rawFileUrl'

describe('rawFileUrl', () => {
  it('builds the raw-bytes endpoint', () => {
    expect(rawFileUrl('https://api.example.com', 'p1', 'src/app.ts')).toBe(
      'https://api.example.com/api/v1/projects/p1/files/raw?path=src%2Fapp.ts',
    )
  })
  it('trims a trailing slash from the base URL', () => {
    expect(rawFileUrl('https://api.example.com/', 'p1', 'a.txt')).toBe(
      'https://api.example.com/api/v1/projects/p1/files/raw?path=a.txt',
    )
  })
  it('encodes project id and path', () => {
    expect(rawFileUrl('http://x', 'p/1', 'a b.png')).toContain('projects/p%2F1/files/raw')
    expect(rawFileUrl('http://x', 'p1', 'a b.png')).toContain('path=a%20b.png')
  })
})

describe('chatAttachmentRawUrl', () => {
  it('builds the chat-file endpoint with the chat context as JSON', () => {
    const context = { type: 'GROUP_TOPIC', groupId: 'g1', topicId: 't1' } as const
    const url = new URL(
      chatAttachmentRawUrl('https://api.example.com/', context, '.factory/a b.png'),
    )
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://api.example.com/api/v1/chat-attachments/raw',
    )
    expect(url.searchParams.get('path')).toBe('.factory/a b.png')
    expect(JSON.parse(url.searchParams.get('context') ?? '')).toEqual(context)
  })
})

describe('chatFileRawUrl', () => {
  const path = '.factory/attachments/abc/1-board.png'
  const story = { type: 'STORY', projectId: 'p1', storyId: 's1' } as const
  it('reads a project chat’s kept file from where the chat keeps it, not the checkout', () => {
    expect(chatFileRawUrl('http://x', story, path)).toBe(
      chatAttachmentRawUrl('http://x', story, path),
    )
  })
  it.each(['src/board.png', '.factory/attachments/', '.factory/attachments/../src/a.png'])(
    'reads a project chat’s other file %s through its project',
    (other) => {
      expect(chatFileRawUrl('http://x', story, other)).toBe(rawFileUrl('http://x', 'p1', other))
    },
  )
  it.each([
    ['a group chat', { type: 'GROUP_TOPIC', groupId: 'g1', topicId: 't1' }],
    ['the general chat', { type: 'GENERAL', timestamp: '1' }],
  ] as const)('reads %s’s file from where the chat keeps it', (_, context) => {
    expect(chatFileRawUrl('http://x', context, path)).toBe(
      chatAttachmentRawUrl('http://x', context, path),
    )
  })
})
