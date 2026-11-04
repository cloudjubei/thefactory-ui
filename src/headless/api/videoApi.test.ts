import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatContext } from './generated'
import { client } from './generated/client.gen'
import {
  downloadVideoSetupModels,
  installVideoSetupTool,
  openVideoSetupChat,
  readChatVideoDigest,
  readVideoSetup,
  stopVideoSetupJob,
} from './videoApi'

const CONTEXT = { type: 'PROJECT', projectId: 'p' } as ChatContext

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readChatVideoDigest', () => {
  it('asks by path, with the chat as JSON', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: { stage: 'ready' } } as never)
    await expect(readChatVideoDigest(CONTEXT, 'a/b.mp4')).resolves.toEqual({ stage: 'ready' })
    expect(get).toHaveBeenCalledWith({
      url: '/api/v1/chat-attachments/digest',
      query: { path: 'a/b.mp4', context: JSON.stringify(CONTEXT) },
      throwOnError: true,
    })
  })
})

describe('the setup routes', () => {
  it('reads what the machine has', async () => {
    const readiness = { canDigest: true, canTranscribe: false, checks: [] }
    vi.spyOn(client, 'get').mockResolvedValue({ data: readiness } as never)
    await expect(readVideoSetup()).resolves.toBe(readiness)
  })

  it('names the tool to install', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: {} } as never)
    await installVideoSetupTool('whisper')
    expect(post.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/setup/install',
      body: { tool: 'whisper' },
    })
  })

  it('starts the models download', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: {} } as never)
    await downloadVideoSetupModels()
    expect(post.mock.calls[0]?.[0]).toMatchObject({ url: '/api/v1/video/setup/models' })
  })

  it('names the job to stop, and says whether one was running', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { stopped: true } } as never)
    await expect(stopVideoSetupJob({ kind: 'install', tool: 'ffmpeg' })).resolves.toEqual({
      stopped: true,
    })
    expect(post.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/setup/stop',
      body: { kind: 'install', tool: 'ffmpeg' },
    })
  })

  it('hands back the chat opened for the agent', async () => {
    const opened = { context: CONTEXT, chatContextId: 'c', turnStarted: true }
    vi.spyOn(client, 'post').mockResolvedValue({ data: opened } as never)
    await expect(openVideoSetupChat()).resolves.toBe(opened)
  })
})
