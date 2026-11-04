import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ChatAttachmentUploadError,
  chatAttachmentUploadUrl,
  sendChatAttachment,
} from './chatAttachmentUpload'
import type { SendFileFromUri } from './chatAttachmentUploadTypes'
import type { ChatContext } from './generated'
import { client } from './generated/client.gen'

const PROJECT_CHAT = { type: 'PROJECT', projectId: 'my app' } as ChatContext
const GENERAL_CHAT = { type: 'GENERAL', id: 'g1' } as unknown as ChatContext

afterEach(() => {
  vi.restoreAllMocks()
})

describe('chatAttachmentUploadUrl', () => {
  it('sends a project chat through its project and a project-less one through the shared route', () => {
    expect(chatAttachmentUploadUrl(PROJECT_CHAT, 'a.mp4')).toMatch(
      /^\/api\/v1\/projects\/my%20app\/chat-attachments\?/,
    )
    expect(chatAttachmentUploadUrl(GENERAL_CHAT, 'a.mp4')).toMatch(/^\/api\/v1\/chat-attachments\?/)
  })

  it('carries the name and the context, encoded', () => {
    const url = new URL(chatAttachmentUploadUrl(PROJECT_CHAT, 'a b&c.mp4'), 'http://host')
    expect(url.searchParams.get('name')).toBe('a b&c.mp4')
    expect(JSON.parse(url.searchParams.get('context') ?? '')).toEqual(PROJECT_CHAT)
  })
})

describe('sendChatAttachment with a blob', () => {
  const blob = new Blob(['bytes'])
  const file = { name: 'a.mp4', size: 5, blob }
  const input = { apiBaseUrl: 'http://host', token: 't', sendFileFromUri: undefined }

  it('posts the blob itself as the raw body and reports progress', async () => {
    const post = vi
      .spyOn(client.instance, 'post')
      .mockImplementation(async (_url, _body, config) => {
        config?.onUploadProgress?.({ loaded: 2, total: 5 } as never)
        return { data: { path: 'kept/a.mp4' } }
      })
    const onProgress = vi.fn()
    const path = await sendChatAttachment({
      ...input,
      context: PROJECT_CHAT,
      file,
      options: { onProgress },
    })
    expect(path).toBe('kept/a.mp4')
    expect(post.mock.calls[0]?.[1]).toBe(blob)
    expect(post.mock.calls[0]?.[2]?.headers).toEqual({
      'Content-Type': 'application/octet-stream',
    })
    expect(onProgress).toHaveBeenCalledWith(2, 5)
  })

  it('never times a long upload out', async () => {
    const post = vi
      .spyOn(client.instance, 'post')
      .mockResolvedValue({ data: { path: 'kept/a.mp4' } })
    await sendChatAttachment({ ...input, context: PROJECT_CHAT, file })
    expect(post.mock.calls[0]?.[2]?.timeout).toBe(0)
  })

  it('says what the backend refused it for', async () => {
    vi.spyOn(client.instance, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { status: 413, data: { error: 'Too large.' } },
    })
    const sent = sendChatAttachment({ ...input, context: PROJECT_CHAT, file })
    await expect(sent).rejects.toMatchObject({ message: 'Too large.', status: 413 })
    await expect(sent).rejects.toBeInstanceOf(ChatAttachmentUploadError)
  })

  it('has no status when the backend never answered', async () => {
    vi.spyOn(client.instance, 'post').mockRejectedValue({ isAxiosError: true })
    await expect(
      sendChatAttachment({ ...input, context: PROJECT_CHAT, file }),
    ).rejects.toMatchObject({ status: undefined })
  })
})

describe('sendChatAttachment with a uri', () => {
  const file = { name: 'a.mov', uri: 'file:///cache/a.mov' }

  it('hands the host the file, the full url and the bearer, and reads the path', async () => {
    const sendFileFromUri = vi.fn<SendFileFromUri>(async () => ({
      status: 200,
      body: JSON.stringify({ path: 'kept/a.mov' }),
    }))
    const path = await sendChatAttachment({
      context: GENERAL_CHAT,
      file,
      apiBaseUrl: 'http://host/',
      token: 't',
      sendFileFromUri,
    })
    expect(path).toBe('kept/a.mov')
    const request = sendFileFromUri.mock.calls[0]?.[0]
    expect(request?.uri).toBe(file.uri)
    expect(request?.url).toMatch(/^http:\/\/host\/api\/v1\/chat-attachments\?/)
    expect(request?.headers).toEqual({
      'Content-Type': 'application/octet-stream',
      Authorization: 'Bearer t',
    })
  })

  it('sends no bearer when signed out', async () => {
    const sendFileFromUri = vi.fn<SendFileFromUri>(async () => ({
      status: 200,
      body: '{"path":"p"}',
    }))
    await sendChatAttachment({
      context: GENERAL_CHAT,
      file,
      apiBaseUrl: 'http://host',
      token: null,
      sendFileFromUri,
    })
    expect(sendFileFromUri.mock.calls[0]?.[0].headers).not.toHaveProperty('Authorization')
  })

  it.each([
    ['the reason the backend gave', '{"error":"Too large."}', 'Too large.'],
    ['a plain failure for a body that is not JSON', '<html>', 'The upload failed.'],
    ['a plain failure for JSON without a reason', '{}', 'The upload failed.'],
  ])('refuses with %s', async (_case, body, message) => {
    await expect(
      sendChatAttachment({
        context: GENERAL_CHAT,
        file,
        apiBaseUrl: 'http://host',
        token: 't',
        sendFileFromUri: async () => ({ status: 413, body }),
      }),
    ).rejects.toMatchObject({ message, status: 413 })
  })

  it('fails plainly in an app with no way to send from a path', async () => {
    await expect(
      sendChatAttachment({
        context: GENERAL_CHAT,
        file,
        apiBaseUrl: 'http://host',
        token: 't',
        sendFileFromUri: undefined,
      }),
    ).rejects.toThrow('This app cannot send a file from its path.')
  })
})
