import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getKnowledgeEvaluationSettings: vi.fn() }))

vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  ...api,
}))

import { readKnowledgeEvaluationSettings } from './useKnowledgeEvaluationSettings'

const SETTINGS = {
  available: true,
  tabDefaults: {
    preset: 'small-clean',
    promptMode: 'production',
    buildMode: 'heuristic',
    concurrency: 4,
  },
  choices: {
    stages: ['smoke'],
    presets: ['small-clean'],
    capabilities: [],
    fixtures: [],
    promptModes: ['neutral', 'production'],
    buildModes: ['heuristic', 'llm'],
    clis: ['codex'],
    concurrencyMax: 16,
  },
}

beforeEach(() => {
  api.getKnowledgeEvaluationSettings.mockReset()
})

describe('readKnowledgeEvaluationSettings', () => {
  it("reads the project's settings from its own route, the defaults checked for shape", async () => {
    api.getKnowledgeEvaluationSettings.mockResolvedValue({
      data: {
        ...SETTINGS,
        defaults: { stage: 'smoke', cli: 'codex', llmConfigId: 'cfg', junk: 1 },
      },
    })
    expect(await readKnowledgeEvaluationSettings('web')).toEqual({
      ...SETTINGS,
      defaults: { stage: 'smoke', cli: 'codex' },
    })
    expect(api.getKnowledgeEvaluationSettings).toHaveBeenCalledWith({
      path: { projectId: 'web' },
      throwOnError: true,
    })
  })

  it('reads stored defaults of no use as none', async () => {
    api.getKnowledgeEvaluationSettings.mockResolvedValue({
      data: { ...SETTINGS, defaults: { stage: 'marathon' } },
    })
    expect((await readKnowledgeEvaluationSettings('web'))?.defaults).toBeNull()
  })

  it('reads nothing when the backend answers nothing', async () => {
    api.getKnowledgeEvaluationSettings.mockResolvedValue({ data: undefined })
    expect(await readKnowledgeEvaluationSettings('web')).toBeUndefined()
  })

  it('passes a refusal on', async () => {
    api.getKnowledgeEvaluationSettings.mockImplementation(async () => {
      throw new Error('Project not found')
    })
    await expect(readKnowledgeEvaluationSettings('gone')).rejects.toThrow('Project not found')
  })
})
