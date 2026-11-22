import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Template, TemplateForkProgress } from '../api/generated'
import { useCreateFromTemplateForm } from './useCreateFromTemplateForm'

const deps = vi.hoisted(() => ({
  createFromTemplate: vi.fn(),
  abortCreateFromTemplate: vi.fn(),
  forkProgress: null as TemplateForkProgress | null,
  templates: [] as Template[],
  projects: [] as Array<{ id: string }>,
  groups: [] as Array<{ id: string; title: string; type: string }>,
  github: {
    connected: false as boolean | null,
    enabled: false,
    setEnabled: vi.fn(),
    repoName: '',
    setRepoName: vi.fn(),
    status: 'unknown' as const,
    connect: vi.fn(),
    cancelConnect: vi.fn(),
    connecting: false,
  },
}))

vi.mock('../contexts/TemplatesContext', () => ({
  useTemplates: () => ({
    createFromTemplate: deps.createFromTemplate,
    abortCreateFromTemplate: deps.abortCreateFromTemplate,
    forkProgress: deps.forkProgress,
    isLoaded: true,
    loadError: null,
    templates: deps.templates,
    refresh: vi.fn(),
  }),
}))

vi.mock('../contexts/ProjectsContext', () => ({
  useProjects: () => ({ projects: deps.projects }),
}))

vi.mock('../contexts/ProjectsGroupsContext', () => ({
  useProjectsGroups: () => ({ groups: deps.groups }),
}))

vi.mock('./useProjectGithubRepo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useProjectGithubRepo')>()
  return {
    ...actual,
    useProjectGithubRepo: () => deps.github,
  }
})

const template: Template = {
  id: 'investment-planner',
  name: 'Investment Planner',
  description: 'A planner',
  repoUrl: 'https://github.com/example/investment-planner',
  difficulty: 'intermediate',
  estimatedTime: '1-2 hours',
}

beforeEach(() => {
  vi.resetAllMocks()
  deps.forkProgress = null
  deps.templates = []
  deps.projects = []
  deps.groups = []
  deps.github = {
    connected: false,
    enabled: false,
    setEnabled: vi.fn(),
    repoName: '',
    setRepoName: vi.fn(),
    status: 'unknown',
    connect: vi.fn(),
    cancelConnect: vi.fn(),
    connecting: false,
  }
})

afterEach(() => {
  cleanup()
})

describe('useCreateFromTemplateForm GitHub attach partial success', () => {
  it('keeps a warning after submit when phase is done with an error, and still calls onCreated', async () => {
    const onCreated = vi.fn()
    const progress: TemplateForkProgress = {
      jobId: 'job-1',
      templateId: template.id,
      projectId: 'my-investments',
      phase: 'done',
      message: 'Created project my-investments; GitHub repository was not attached',
      error: 'GitHub create-repo failed: name already exists',
    }
    deps.createFromTemplate.mockResolvedValue({
      jobId: 'job-1',
      done: Promise.resolve(progress),
    })

    const { result } = renderHook(() => useCreateFromTemplateForm({ onCreated }))

    await act(async () => {
      result.current.setTemplate(template)
    })
    await act(async () => {
      result.current.setName('My Investments')
      result.current.setId('my-investments')
    })

    await act(async () => {
      await result.current.submit()
    })

    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('my-investments'))
    expect(result.current.submitting).toBe(false)
    expect(result.current.errors).toContain('GitHub create-repo failed: name already exists')
  })
})
