import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({
  createStory: vi.fn(),
  createFeature: vi.fn(),
  startStoryWork: vi.fn(),
}))

import { createFeature, createStory, startStoryWork } from './generated'
import { startAppWork } from './appWorkStart'
import type { AppWorkStartProgress } from '../utils/appWorkStartTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

const draft = {
  title: 'Official sources: apply r3',
  description: 'Carry the decisions out.',
  features: [
    { title: 'Apply source revision r3', description: 'Transcribe r3.' },
    { title: 'Record rejected source revision r4', description: 'Change no data.' },
  ],
}

function storyWith(featureIds: string[]) {
  return { id: 's1', title: draft.title, features: featureIds.map((id) => ({ id, title: id })) }
}

beforeEach(() => {
  vi.resetAllMocks()
  asMock(createStory).mockResolvedValue({ data: storyWith([]) })
  asMock(createFeature)
    .mockResolvedValueOnce({ data: storyWith(['f1']) })
    .mockResolvedValueOnce({ data: storyWith(['f1', 'f2']) })
  asMock(startStoryWork).mockResolvedValue({
    data: { mode: 'process', chatContextId: 'c', processRunId: 'run-9' },
  })
})

describe('startAppWork', () => {
  it('makes the story and its features, then starts a run on exactly those features', async () => {
    const progress: AppWorkStartProgress[] = []
    const started = await startAppWork('p1', draft, {}, (p) => progress.push(p))
    expect(createStory).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { title: draft.title, description: draft.description },
      throwOnError: true,
    })
    expect(asMock(createFeature).mock.calls.map((c: unknown[]) => c[0])).toEqual([
      {
        path: { projectId: 'p1', storyId: 's1' },
        body: {
          title: 'Apply source revision r3',
          description: 'Transcribe r3.',
          status: 'pending',
          context: [],
        },
        throwOnError: true,
      },
      {
        path: { projectId: 'p1', storyId: 's1' },
        body: {
          title: 'Record rejected source revision r4',
          description: 'Change no data.',
          status: 'pending',
          context: [],
        },
        throwOnError: true,
      },
    ])
    expect(startStoryWork).toHaveBeenCalledWith({
      path: { projectId: 'p1', storyId: 's1' },
      body: { mode: 'process', featureIds: ['f1', 'f2'] },
      throwOnError: true,
    })
    expect(started).toEqual({ storyId: 's1', runId: 'run-9' })
    expect(progress).toEqual([
      { storyId: 's1', featureIds: [] },
      { storyId: 's1', featureIds: ['f1'] },
      { storyId: 's1', featureIds: ['f1', 'f2'] },
    ])
  })

  it('works a request with no features as one feature named for the work', async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValue({ data: storyWith(['f1']) })
    await startAppWork('p1', { ...draft, features: [] }, {}, () => {})
    expect(createFeature).toHaveBeenCalledTimes(1)
    expect(asMock(createFeature).mock.calls[0][0].body).toMatchObject({
      title: draft.title,
      description: draft.description,
    })
    expect(asMock(startStoryWork).mock.calls[0][0].body.featureIds).toEqual(['f1'])
  })

  it('carries on from where a failed start stopped, never making the story twice', async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValue({ data: storyWith(['f1', 'f2']) })
    const started = await startAppWork('p1', draft, { storyId: 's1', featureIds: ['f1'] }, () => {})
    expect(createStory).not.toHaveBeenCalled()
    expect(createFeature).toHaveBeenCalledTimes(1)
    expect(asMock(createFeature).mock.calls[0][0].body.title).toBe(
      'Record rejected source revision r4',
    )
    expect(asMock(startStoryWork).mock.calls[0][0].body.featureIds).toEqual(['f1', 'f2'])
    expect(started.storyId).toBe('s1')
  })

  it('only starts the run when every feature already exists', async () => {
    await startAppWork('p1', draft, { storyId: 's1', featureIds: ['f1', 'f2'] }, () => {})
    expect(createStory).not.toHaveBeenCalled()
    expect(createFeature).not.toHaveBeenCalled()
    expect(startStoryWork).toHaveBeenCalledTimes(1)
  })

  it('answers no run when the work started in a chat', async () => {
    asMock(startStoryWork).mockResolvedValue({ data: { mode: 'chat', chatContextId: 'c' } })
    expect(await startAppWork('p1', draft, {}, () => {})).toEqual({ storyId: 's1' })
  })

  it("throws the backend's refusal, keeping the progress made", async () => {
    asMock(startStoryWork).mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 409, data: { error: 'A run of this story is already open.' } },
      }),
    )
    const progress: AppWorkStartProgress[] = []
    await expect(startAppWork('p1', draft, {}, (p) => progress.push(p))).rejects.toThrow(
      'A run of this story is already open.',
    )
    expect(progress.at(-1)).toEqual({ storyId: 's1', featureIds: ['f1', 'f2'] })
  })

  it('throws when a new feature cannot be found in the story', async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValue({ data: storyWith([]) })
    await expect(startAppWork('p1', draft, {}, () => {})).rejects.toThrow(/feature/i)
    expect(startStoryWork).not.toHaveBeenCalled()
  })
})
