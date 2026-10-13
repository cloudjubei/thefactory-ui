import { describe, expect, it } from 'vitest'

import { wsEventConcernsProject } from './wsEventProject'

describe('wsEventConcernsProject', () => {
  it('concerns the project it names', () => {
    expect(wsEventConcernsProject({ projectId: 'p1', action: 'updated' }, 'p1')).toBe(true)
  })

  it('does not concern another project', () => {
    expect(wsEventConcernsProject({ projectId: 'p2', action: 'updated' }, 'p1')).toBe(false)
  })

  it('reads a list of projects', () => {
    expect(wsEventConcernsProject({ action: 'cleared', projectIds: ['p2', 'p1'] }, 'p1')).toBe(true)
    expect(wsEventConcernsProject({ action: 'cleared', projectIds: ['p2', 'p3'] }, 'p1')).toBe(
      false,
    )
  })

  it('concerns every project when it names none, or names one in a shape it cannot read', () => {
    expect(wsEventConcernsProject({ action: 'deleted', entityId: 'e1' }, 'p1')).toBe(true)
    expect(wsEventConcernsProject(undefined, 'p1')).toBe(true)
    expect(wsEventConcernsProject('stories', 'p1')).toBe(true)
    expect(wsEventConcernsProject({ projectId: 42 }, 'p1')).toBe(true)
    expect(wsEventConcernsProject({ projectIds: 'p2' }, 'p1')).toBe(true)
  })

  it('lets every event through to a view with no project', () => {
    expect(wsEventConcernsProject({ projectId: 'p2' }, undefined)).toBe(true)
  })
})
