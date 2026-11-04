import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getConfig: () => ({ baseURL: 'http://backend' }),
  instance: { post: vi.fn() },
}))

vi.mock('./generated/client.gen', () => ({ client }))

import {
  attachRunWalkthroughFile,
  attachRunWalkthroughLink,
  readRunWalkthrough,
  RunWalkthroughFileError,
} from './runWalkthroughApi'

beforeEach(() => {
  client.get.mockReset().mockResolvedValue({ data: 'answer' })
  client.post.mockReset().mockResolvedValue({ data: 'answer' })
  client.instance.post.mockReset().mockResolvedValue({ data: 'answer' })
})

const noSender = { apiBaseUrl: 'http://backend/', token: 't', sendFileFromUri: undefined }

describe('the walkthrough calls', () => {
  it('read a run’s items, its id encoded', async () => {
    expect(await readRunWalkthrough('run 1')).toBe('answer')
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/process-runs/run%201/walkthrough',
      throwOnError: true,
    })
  })

  it('attach a link, the item id encoded', async () => {
    expect(await attachRunWalkthroughLink('r1', 'gap/one', 'https://loom.com/share/1')).toBe(
      'answer',
    )
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/process-runs/r1/walkthrough/gap%2Fone/link',
      body: { url: 'https://loom.com/share/1' },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('send a web file as the raw body, with its name and progress', async () => {
    const blob = new Blob(['x'])
    const onProgress = vi.fn()
    client.instance.post.mockImplementation(async (_url, _body, config) => {
      config.onUploadProgress({ loaded: 1, total: undefined })
      return { data: 'answer' }
    })
    const answer = await attachRunWalkthroughFile(
      'r1',
      'gap/one',
      { name: 'my clip.mp4', size: 9, blob },
      { ...noSender, onProgress },
    )
    expect(answer).toBe('answer')
    const [url, body, config] = client.instance.post.mock.calls[0] as [
      string,
      Blob,
      Record<string, unknown>,
    ]
    expect(url).toBe('/api/v1/process-runs/r1/walkthrough/gap%2Fone/file?name=my%20clip.mp4')
    expect(body).toBe(blob)
    expect(config).toMatchObject({
      baseURL: 'http://backend',
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 0,
    })
    expect(onProgress).toHaveBeenCalledWith(1, 9)
  })

  it('says the backend’s reason for a web file it refused', async () => {
    client.instance.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 413, data: { error: 'Too large.' } },
    })
    await expect(
      attachRunWalkthroughFile('r1', 'a', { name: 'a.mp4', size: 1, blob: new Blob([]) }, noSender),
    ).rejects.toMatchObject({ message: 'Too large.', status: 413 })
  })

  it('sends a native file from its uri, with the token', async () => {
    const sendFileFromUri = vi.fn().mockResolvedValue({ status: 200, body: '{"id":"a"}' })
    const answer = await attachRunWalkthroughFile(
      'r1',
      'a',
      { name: 'a.mp4', uri: 'file:///a.mp4' },
      { ...noSender, sendFileFromUri },
    )
    expect(answer).toEqual({ id: 'a' })
    expect(sendFileFromUri).toHaveBeenCalledWith({
      uri: 'file:///a.mp4',
      url: 'http://backend/api/v1/process-runs/r1/walkthrough/a/file?name=a.mp4',
      headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer t' },
    })
  })

  it('leaves the token out when there is none', async () => {
    const sendFileFromUri = vi.fn().mockResolvedValue({ status: 200, body: '{}' })
    await attachRunWalkthroughFile(
      'r1',
      'a',
      { name: 'a.mp4', uri: 'file:///a.mp4' },
      { ...noSender, token: null, sendFileFromUri },
    )
    expect(sendFileFromUri.mock.calls[0]?.[0].headers).toEqual({
      'Content-Type': 'application/octet-stream',
    })
  })

  it('says the backend’s reason for a native file it refused', async () => {
    const sendFileFromUri = vi
      .fn()
      .mockResolvedValue({ status: 404, body: '{"error":"No such step."}' })
    await expect(
      attachRunWalkthroughFile(
        'r1',
        'a',
        { name: 'a.mp4', uri: 'file:///a.mp4' },
        { ...noSender, sendFileFromUri },
      ),
    ).rejects.toMatchObject({ message: 'No such step.', status: 404 })
  })

  it('falls back to its own words for a refusal that is not JSON', async () => {
    const sendFileFromUri = vi.fn().mockResolvedValue({ status: 500, body: '<html>' })
    await expect(
      attachRunWalkthroughFile(
        'r1',
        'a',
        { name: 'a.mp4', uri: 'file:///a.mp4' },
        { ...noSender, sendFileFromUri },
      ),
    ).rejects.toMatchObject({ message: 'The video was not uploaded.', status: 500 })
  })

  it('says so when a native app cannot send a file', async () => {
    const attempt = attachRunWalkthroughFile(
      'r1',
      'a',
      { name: 'a.mp4', uri: 'file:///a.mp4' },
      noSender,
    )
    await expect(attempt).rejects.toBeInstanceOf(RunWalkthroughFileError)
    await expect(attempt).rejects.toMatchObject({
      message: 'This app cannot upload a video from here. Add a Loom link instead.',
    })
  })
})
