import { describe, expect, it } from 'vitest'
import {
  isStartGroupWorkGrant,
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
  it('names the group story a launch runs, so its ticket can be offered', () => {
    const summary = (groupStoryId: unknown) =>
      startGroupWorkGrantSummary({ detail: { args: { ...ARGS, groupStoryId } } })
    expect(summary(' gs1 ').groupStoryId).toBe('gs1')
    expect(summary('  ')).not.toHaveProperty('groupStoryId')
    expect(summary(7)).not.toHaveProperty('groupStoryId')
  })

  it('reads the arguments the ask wraps', () => {
    expect(startGroupWorkGrantSummary({ detail: { tool: 'startGroupWork', args: ARGS } })).toEqual(
      SUMMARY,
    )
  })

  it('reads the branch each leg asked to go off, trimmed, dropping a blank one', () => {
    expect(
      startGroupWorkGrantSummary({
        detail: {
          args: {
            legs: [
              { projectId: 'tools', storyId: 's1', baseBranch: ' dev ' },
              { projectId: 'ui', storyId: 's2', baseBranch: ' ' },
            ],
          },
        },
      }).legs,
    ).toEqual([
      { projectId: 'tools', storyId: 's1', dependsOn: [], baseBranch: 'dev' },
      { projectId: 'ui', storyId: 's2', dependsOn: [] },
    ])
  })

  it('reads nothing from bare arguments — every ask is the broker’s `{ tool, args }`', () => {
    expect(startGroupWorkGrantSummary({ detail: ARGS })).toEqual({ legs: [], proofRequired: true })
  })

  it('falls back to the defaults on a malformed ask', () => {
    expect(startGroupWorkGrantSummary({ detail: 'nonsense' })).toEqual({
      legs: [],
      proofRequired: true,
    })
    expect(
      startGroupWorkGrantSummary({
        detail: { args: { legs: 'x', runner: 'gpu', spendCapUsd: -1 } },
      }),
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

describe('processGroupLegWaitsFor', () => {
  it('names what a leg waits for by project title', () => {
    expect(processGroupLegWaitsFor(PREVIEW, ['tools'])).toBe('Starts once Tools is merged')
    expect(processGroupLegWaitsFor(PREVIEW, ['tools', 'gone'])).toBe(
      'Starts once Tools and gone are merged',
    )
    expect(processGroupLegWaitsFor(PREVIEW, [])).toBeUndefined()
  })

  it('says finished, not merged, for a run built on branches', () => {
    const built = (buildMode: string) => Object.assign({}, PREVIEW, { buildMode }) as never
    expect(processGroupLegWaitsFor(built('on-branch'), ['tools'])).toBe(
      'Starts once Tools is finished, on its branch',
    )
    expect(processGroupLegWaitsFor(built('merge-first'), ['tools'])).toBe(
      'Starts once Tools is merged',
    )
  })
})
