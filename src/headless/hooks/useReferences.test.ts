import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listStories: vi.fn(),
  getStoriesOrder: vi.fn(),
  listProjectNotes: vi.fn(),
  getProjectDesign: vi.fn(),
  listProcesses: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  ...api,
}))

import { invalidateReferenceProject, loadReferenceProject } from './useReferences'

const story = (id: string) => ({ id, title: `Story ${id}`, status: 'todo', features: [] })

describe('loadReferenceProject', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    api.listStories.mockResolvedValue({ data: [story('s2'), story('s1')] })
    api.getStoriesOrder.mockResolvedValue({ data: ['s1', 's2'] })
    api.listProjectNotes.mockResolvedValue({ data: [{ id: 'n1', label: 'qa-login' }] })
    api.getProjectDesign.mockResolvedValue({ data: undefined })
    api.listProcesses.mockResolvedValue({ data: [] })
    invalidateReferenceProject('p1')
  })

  it("reads a project's stories in list order along with its notes", async () => {
    const project = await loadReferenceProject('p1', true)
    expect(project.stories?.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(project.notes).toEqual([{ id: 'n1', label: 'qa-login' }])
  })

  it("leaves out the stories of a project whose stories are already held live — the active one's", async () => {
    const project = await loadReferenceProject('p1', false)
    expect(api.listStories).not.toHaveBeenCalled()
    expect(api.getStoriesOrder).not.toHaveBeenCalled()
    expect(project.stories).toBeUndefined()
    expect(project.notes).toEqual([{ id: 'n1', label: 'qa-login' }])
  })

  it('reads each part once a minute however often it is asked', async () => {
    await Promise.all([loadReferenceProject('p1', true), loadReferenceProject('p1', true)])
    await loadReferenceProject('p1', false)
    expect(api.listStories).toHaveBeenCalledTimes(1)
    expect(api.listProjectNotes).toHaveBeenCalledTimes(1)
  })

  it('reads the stories when they are first wanted, without reading the rest again', async () => {
    await loadReferenceProject('p1', false)
    const project = await loadReferenceProject('p1', true)
    expect(api.listStories).toHaveBeenCalledTimes(1)
    expect(api.listProjectNotes).toHaveBeenCalledTimes(1)
    expect(project.stories?.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('reads everything again once invalidated', async () => {
    await loadReferenceProject('p1', true)
    invalidateReferenceProject('p1')
    await loadReferenceProject('p1', true)
    expect(api.listStories).toHaveBeenCalledTimes(2)
    expect(api.listProjectNotes).toHaveBeenCalledTimes(2)
  })

  it('reads the stories again after a failed read', async () => {
    api.listStories.mockRejectedValueOnce(new Error('down'))
    await expect(loadReferenceProject('p1', true)).rejects.toThrow('down')
    const project = await loadReferenceProject('p1', true)
    expect(project.stories?.map((s) => s.id)).toEqual(['s1', 's2'])
  })
})
