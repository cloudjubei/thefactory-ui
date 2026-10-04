import { describe, expect, it } from 'vitest'
import {
  defaultProcessGroupLegModes,
  isStartGroupWorkGrant,
  processGroupLaunchMetadata,
  processGroupLegWaitsFor,
  startGroupWorkGrantSummary,
} from './processGroupLaunch'

const ARGS = {
  groupId: 'factory',
  title: ' Messaging ',
  legs: [
    { projectId: 'tools', storyId: 's1' },
    { projectId: 'ui', storyId: 's2', dependsOn: ['tools', 3], processId: 'p' },
    { projectId: 'bad' },
  ],
  note: 'brief',
  proofRequired: false,
  runner: 'cli',
  spendCapUsd: 5,
}

const SUMMARY = {
  groupId: 'factory',
  title: 'Messaging',
  legs: [
    { projectId: 'tools', storyId: 's1', dependsOn: [] },
    { projectId: 'ui', storyId: 's2', dependsOn: ['tools'], processId: 'p' },
  ],
  note: 'brief',
  proofRequired: false,
  runner: 'cli',
  spendCapUsd: 5,
}

describe('isStartGroupWorkGrant', () => {
  it('recognises the group launch, and nothing else', () => {
    expect(isStartGroupWorkGrant({ toolName: 'startGroupWork' })).toBe(true)
    expect(isStartGroupWorkGrant({ toolName: 'startFeatureWork' })).toBe(false)
  })
})

describe('startGroupWorkGrantSummary', () => {
  it('reads a CLI action’s wrapped arguments and an API call’s bare ones alike', () => {
    expect(startGroupWorkGrantSummary({ detail: { tool: 'startGroupWork', args: ARGS } })).toEqual(
      SUMMARY,
    )
    expect(startGroupWorkGrantSummary({ detail: ARGS })).toEqual(SUMMARY)
  })

  it('falls back to the defaults on a malformed ask', () => {
    expect(startGroupWorkGrantSummary({ detail: 'nonsense' })).toEqual({
      legs: [],
      proofRequired: true,
    })
    expect(
      startGroupWorkGrantSummary({ detail: { legs: 'x', runner: 'gpu', spendCapUsd: -1 } }),
    ).toEqual({ legs: [], proofRequired: true })
  })
})

const PREVIEW = {
  legs: [
    { projectId: 'tools', projectTitle: 'Tools', isPrerequisite: true },
    { projectId: 'db', projectTitle: 'DB', isPrerequisite: true },
    { projectId: 'ui', projectTitle: 'UI', isPrerequisite: false },
  ],
} as never

describe('defaultProcessGroupLegModes', () => {
  it('merges every prerequisite unless the person picks otherwise', () => {
    expect(defaultProcessGroupLegModes(PREVIEW)).toEqual({ tools: 'merge', db: 'merge' })
    expect(defaultProcessGroupLegModes(undefined)).toEqual({})
  })
})

describe('processGroupLaunchMetadata', () => {
  it('carries the modes only when there are some', () => {
    expect(processGroupLaunchMetadata({ tools: 'squash' })).toEqual({
      legIntegrationModes: { tools: 'squash' },
    })
    expect(processGroupLaunchMetadata({})).toEqual({})
  })
})

describe('processGroupLegWaitsFor', () => {
  it('names what a leg waits for by project title', () => {
    expect(processGroupLegWaitsFor(PREVIEW, ['tools'])).toBe('Starts once Tools is merged')
    expect(processGroupLegWaitsFor(PREVIEW, ['tools', 'gone'])).toBe(
      'Starts once Tools and gone are merged',
    )
    expect(processGroupLegWaitsFor(PREVIEW, [])).toBeUndefined()
  })
})
