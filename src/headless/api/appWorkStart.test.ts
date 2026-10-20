import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({
  createStory: vi.fn(),
  createFeature: vi.fn(),
  startStoryWork: vi.fn(),
}))

import { createFeature, createStory, startStoryWork } from './generated'
import { makeAppWork } from './appWorkStart'
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
})

describe('makeAppWork', () => {
  it('makes the story and its features, and starts nothing — the person chooses how next', async () => {
    const progress: AppWorkStartProgress[] = []
    const made = await makeAppWork('p1', draft, {}, (p) => progress.push(p))
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
    expect(startStoryWork).not.toHaveBeenCalled()
    expect(made).toEqual({ storyId: 's1', featureIds: ['f1', 'f2'] })
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
    const made = await makeAppWork('p1', { ...draft, features: [] }, {}, () => {})
    expect(createFeature).toHaveBeenCalledTimes(1)
    expect(asMock(createFeature).mock.calls[0][0].body).toMatchObject({
      title: draft.title,
      description: draft.description,
    })
    expect(made.featureIds).toEqual(['f1'])
  })

  it('carries on from where a failed start stopped, never making the story twice', async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValue({ data: storyWith(['f1', 'f2']) })
    const made = await makeAppWork('p1', draft, { storyId: 's1', featureIds: ['f1'] }, () => {})
    expect(createStory).not.toHaveBeenCalled()
    expect(createFeature).toHaveBeenCalledTimes(1)
    expect(asMock(createFeature).mock.calls[0][0].body.title).toBe(
      'Record rejected source revision r4',
    )
    expect(made).toEqual({ storyId: 's1', featureIds: ['f1', 'f2'] })
  })

  it('makes nothing more when every feature already exists', async () => {
    const made = await makeAppWork(
      'p1',
      draft,
      { storyId: 's1', featureIds: ['f1', 'f2'] },
      () => {},
    )
    expect(createStory).not.toHaveBeenCalled()
    expect(createFeature).not.toHaveBeenCalled()
    expect(made).toEqual({ storyId: 's1', featureIds: ['f1', 'f2'] })
  })

  it("throws the backend's refusal, keeping the progress made", async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValueOnce({ data: storyWith(['f1']) })
      .mockRejectedValueOnce(
        Object.assign(new Error('x'), {
          isAxiosError: true,
          response: { status: 409, data: { error: 'The story is archived.' } },
        }),
      )
    const progress: AppWorkStartProgress[] = []
    await expect(makeAppWork('p1', draft, {}, (p) => progress.push(p))).rejects.toThrow(
      'The story is archived.',
    )
    expect(progress.at(-1)).toEqual({ storyId: 's1', featureIds: ['f1'] })
  })

  it('throws when a new feature cannot be found in the story', async () => {
    asMock(createFeature)
      .mockReset()
      .mockResolvedValue({ data: storyWith([]) })
    await expect(makeAppWork('p1', draft, {}, () => {})).rejects.toThrow(/feature/i)
  })
})
