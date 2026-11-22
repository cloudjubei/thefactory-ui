import { describe, expect, it } from 'vitest'
import {
  isTemplateUpdatesAvailable,
  templateUpdatesAvailableLabel,
  templateUpdatesStatusLabel,
  type TemplateUpdatesCheck,
} from './templateUpdates'
import {
  TEMPLATE_UPDATES_AVAILABLE_LABEL,
  TEMPLATE_UPDATES_STATUS_LABEL,
} from './templateUpdatesConstants'

const PROVENANCE = {
  templateId: 'investment-planner',
  commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
}

function check(over: Partial<TemplateUpdatesCheck>): TemplateUpdatesCheck {
  return {
    available: false,
    status: 'not-from-template',
    ...over,
  }
}

describe('isTemplateUpdatesAvailable', () => {
  it('is true only when available is true', () => {
    expect(isTemplateUpdatesAvailable(undefined)).toBe(false)
    expect(isTemplateUpdatesAvailable(null)).toBe(false)
    expect(isTemplateUpdatesAvailable(check({ status: 'up-to-date' }))).toBe(false)
    expect(
      isTemplateUpdatesAvailable(
        check({
          available: true,
          status: 'updates-available',
          provenance: PROVENANCE,
          upstreamCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      ),
    ).toBe(true)
  })
})

describe('templateUpdatesAvailableLabel', () => {
  it('returns the banner only when updates are available', () => {
    expect(templateUpdatesAvailableLabel(undefined)).toBeUndefined()
    expect(
      templateUpdatesAvailableLabel(check({ status: 'up-to-date', provenance: PROVENANCE })),
    ).toBeUndefined()
    expect(
      templateUpdatesAvailableLabel(
        check({
          available: true,
          status: 'updates-available',
          provenance: PROVENANCE,
          upstreamCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      ),
    ).toBe(TEMPLATE_UPDATES_AVAILABLE_LABEL)
  })

  it('uses the quoted product copy', () => {
    expect(TEMPLATE_UPDATES_AVAILABLE_LABEL).toBe('Template updates available')
  })
})

describe('templateUpdatesStatusLabel', () => {
  it('maps every status the API can return', () => {
    for (const status of Object.keys(TEMPLATE_UPDATES_STATUS_LABEL) as Array<
      keyof typeof TEMPLATE_UPDATES_STATUS_LABEL
    >) {
      expect(templateUpdatesStatusLabel(status)).toBe(TEMPLATE_UPDATES_STATUS_LABEL[status])
    }
  })

  it('returns undefined for a missing status', () => {
    expect(templateUpdatesStatusLabel(undefined)).toBeUndefined()
    expect(templateUpdatesStatusLabel(null)).toBeUndefined()
  })
})
