import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getProjectKnowledgeOverview: vi.fn() }))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import { readProjectKnowledgeOverview } from './useProjectKnowledge'

beforeEach(() => {
  api.getProjectKnowledgeOverview.mockReset()
})

describe('readProjectKnowledgeOverview', () => {
  it("reads the project's overview, map build and checkout from its own route", async () => {
    const answer = {
      map: { projectId: 'web', state: 'building', percent: 20 },
      hasCheckout: true,
    }
    api.getProjectKnowledgeOverview.mockResolvedValue({ data: answer })

    expect(await readProjectKnowledgeOverview('web')).toEqual(answer)
    expect(api.getProjectKnowledgeOverview).toHaveBeenCalledWith({
      path: { projectId: 'web' },
      throwOnError: true,
    })
  })

  it('lets a failed read through, for the tab to say why', async () => {
    api.getProjectKnowledgeOverview.mockRejectedValue(new Error('Network Error'))

    await expect(readProjectKnowledgeOverview('web')).rejects.toThrow('Network Error')
  })
})
