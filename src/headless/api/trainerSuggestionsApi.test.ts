import { afterEach, describe, expect, it, vi } from 'vitest'
import { client } from './generated/client.gen'
import { launchTrainerSuggestion } from './trainerSuggestionsApi'

afterEach(() => vi.restoreAllMocks())

describe('launchTrainerSuggestion', () => {
  it('launches the stored suggestion in the correct project, with only the manifest selector', async () => {
    const post = vi
      .spyOn(client, 'post')
      .mockResolvedValue({ data: { activityId: 'train-1', queued: true } } as never)
    await expect(launchTrainerSuggestion('p /1', 's/2', 'cartpole')).resolves.toEqual({
      activityId: 'train-1',
      queued: true,
    })
    expect(post).toHaveBeenCalledWith({
      url: '/api/v1/projects/p%20%2F1/trainer-suggestions/s%2F2/launch',
      body: { project: 'cartpole' },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })
  it('sends an empty body when the server can resolve the only training manifest', async () => {
    const post = vi
      .spyOn(client, 'post')
      .mockResolvedValue({ data: { activityId: 'a', queued: false } } as never)
    await launchTrainerSuggestion('p', 's')
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ body: {} }))
  })
  it('does not invent an activity on a malformed response', async () => {
    vi.spyOn(client, 'post').mockResolvedValue({ data: {} } as never)
    await expect(launchTrainerSuggestion('p', 's')).rejects.toThrow('did not identify an activity')
  })
})
