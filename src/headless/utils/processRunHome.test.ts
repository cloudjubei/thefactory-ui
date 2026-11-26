import { describe, expect, it } from 'vitest'

import { processRunHomeLabel } from './processRunHome'

const shared = { projectId: 'be', alsoProjectIds: ['admin'] }

const projects = [
  { id: 'be', title: 'Compass BE' },
  { id: 'admin', title: 'Compass Admin' },
]

describe('processRunHomeLabel', () => {
  it('names the home project of a run listed under another project it belongs to', () => {
    expect(processRunHomeLabel(shared, 'admin', projects)).toBe('Compass BE')
  })

  it('says nothing for a run listed under its home project', () => {
    expect(processRunHomeLabel(shared, 'be', projects)).toBeUndefined()
    expect(processRunHomeLabel({ projectId: 'be' }, 'be', projects)).toBeUndefined()
  })

  it('falls back on the project’s id when its title is not known', () => {
    expect(processRunHomeLabel({ projectId: 'gone' }, 'admin', projects)).toBe('gone')
    expect(processRunHomeLabel({ projectId: 'be' }, 'admin', undefined)).toBe('be')
  })
})
