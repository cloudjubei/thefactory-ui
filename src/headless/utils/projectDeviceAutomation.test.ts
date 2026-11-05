import { describe, expect, it } from 'vitest'
import { isProjectDeviceAutomationUpdate } from './projectDeviceAutomation'
import { PROJECT_DEVICE_AUTOMATION_RECORD } from './projectDeviceAutomationConstants'

const update = { action: 'upserted', scope: 'p1', ...PROJECT_DEVICE_AUTOMATION_RECORD } as const

describe('isProjectDeviceAutomationUpdate', () => {
  it('hears the flag record of this project, written or removed', () => {
    expect(isProjectDeviceAutomationUpdate(update, 'p1')).toBe(true)
    expect(isProjectDeviceAutomationUpdate({ ...update, action: 'deleted' }, 'p1')).toBe(true)
  })

  it('ignores another project, another record type and another key', () => {
    expect(isProjectDeviceAutomationUpdate(update, 'p2')).toBe(false)
    expect(isProjectDeviceAutomationUpdate({ ...update, type: 'notes' }, 'p1')).toBe(false)
    expect(isProjectDeviceAutomationUpdate({ ...update, key: 'other' }, 'p1')).toBe(false)
    expect(isProjectDeviceAutomationUpdate({ ...update, key: null }, 'p1')).toBe(false)
  })
})
