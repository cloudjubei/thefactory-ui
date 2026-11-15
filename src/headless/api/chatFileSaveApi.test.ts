import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('./generated/client.gen', () => ({ client }))

import { saveChatFileToProject } from './chatFileSaveApi'

const axiosError = (status: number | undefined, data?: unknown) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    ...(status === undefined ? {} : { response: { status, data } }),
  })

const request = { source: '.factory/attachments/c1/0123456789ab-map.png', destination: 'map.png' }

beforeEach(() => {
  client.post.mockReset()
})

describe('saveChatFileToProject', () => {
  it('posts the copy to the project, the id encoded, and answers where it went', async () => {
    client.post.mockResolvedValue({ data: { path: 'art/map.png' } })
    expect(await saveChatFileToProject('p 1', { ...request, overwrite: true })).toEqual({
      ok: true,
      path: 'art/map.png',
    })
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/projects/p%201/chat-files/save',
      body: { ...request, overwrite: true },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('falls back to the asked destination when the answer names none', async () => {
    client.post.mockResolvedValue({ data: {} })
    expect(await saveChatFileToProject('p1', request)).toEqual({ ok: true, path: 'map.png' })
  })

  it('says a taken destination exists, with the backend’s words', async () => {
    client.post.mockRejectedValue(
      axiosError(409, { error: 'map.png is already there', exists: true }),
    )
    expect(await saveChatFileToProject('p1', request)).toEqual({
      ok: false,
      error: 'map.png is already there',
      exists: true,
    })
  })

  it('takes a body flag as taken whatever the status', async () => {
    client.post.mockRejectedValue(axiosError(400, { error: 'Taken', exists: true }))
    expect((await saveChatFileToProject('p1', request)).ok).toBe(false)
    expect(await saveChatFileToProject('p1', request)).toMatchObject({ exists: true })
  })

  it('passes a refusal on as not taken', async () => {
    client.post.mockRejectedValue(axiosError(400, { error: 'That path is outside the project' }))
    expect(await saveChatFileToProject('p1', request)).toEqual({
      ok: false,
      error: 'That path is outside the project',
      exists: false,
    })
  })

  it('says the backend could not be reached when there was no answer', async () => {
    client.post.mockRejectedValue(axiosError(undefined))
    expect(await saveChatFileToProject('p1', request)).toEqual({
      ok: false,
      error: 'Could not reach the backend. Check that it is running and reachable.',
      exists: false,
    })
  })

  it('falls back to its own words for a failure that has none', async () => {
    client.post.mockRejectedValue(null)
    expect(await saveChatFileToProject('p1', request)).toEqual({
      ok: false,
      error: 'Could not save the file.',
      exists: false,
    })
  })
})
