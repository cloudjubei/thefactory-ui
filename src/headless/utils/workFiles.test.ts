import { describe, expect, it } from 'vitest'
import { workFilesHeading } from './workFiles'

describe('workFilesHeading', () => {
  it('says how many files go with the work', () => {
    expect(workFilesHeading(1)).toBe('Files · 1')
    expect(workFilesHeading(10)).toBe('Files · 10')
  })
})
