import { describe, expect, it } from 'vitest'
import { resolveActiveProjectId } from './activeProject'

const project = (id: string, updatedAt?: string, createdAt?: string) => ({
  id,
  ...(updatedAt ? { updatedAt } : {}),
  ...(createdAt ? { createdAt } : {}),
})

describe('resolveActiveProjectId', () => {
  const projects = [
    project('old', '2026-01-01T00:00:00Z'),
    project('newest', '2026-10-07T00:00:00Z'),
    project('created-only', undefined, '2026-05-01T00:00:00Z'),
  ]

  it('keeps a current id that is still a project', () => {
    expect(resolveActiveProjectId('old', projects)).toBe('old')
  })

  it('falls back to the most recently updated project when there is none', () => {
    expect(resolveActiveProjectId(undefined, projects)).toBe('newest')
  })

  it('falls back when the current id is no longer a project', () => {
    expect(resolveActiveProjectId('deleted', projects)).toBe('newest')
  })

  it('orders by createdAt when a project was never updated, and undated last', () => {
    expect(resolveActiveProjectId(undefined, [project('undated'), projects[2]])).toBe(
      'created-only',
    )
  })

  it('is undefined when there are no projects', () => {
    expect(resolveActiveProjectId('old', [])).toBeUndefined()
  })
})
