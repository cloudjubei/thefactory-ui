import { describe, expect, it } from 'vitest'
import {
  isStartGroupWorkGrant,
  processGroupLaunchLegsByWave,
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

  it('reads what each leg asked its run to wait for, by project, beside the legs the preview reads', () => {
    const summary = startGroupWorkGrantSummary({
      detail: {
        args: {
          legs: [
            { projectId: 'tools', storyId: 's1', waitsFor: [{ label: 'ZNR-780', branch: 'b' }] },
            { projectId: 'ui', storyId: 's2', waitsFor: [{ label: 'bad' }] },
            { projectId: 'web', storyId: 's3' },
          ],
        },
      },
    })
    expect(summary.legWaitsFor).toEqual({ tools: [{ label: 'ZNR-780', branch: 'b' }] })
    expect(summary.legs[0]).not.toHaveProperty('waitsFor')
    expect(startGroupWorkGrantSummary({ detail: { args: ARGS } })).not.toHaveProperty('legWaitsFor')
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
    { projectId: 'tools', storyId: 's-tools', projectTitle: 'Tools', isPrerequisite: true },
    { projectId: 'db', storyId: 's-db', projectTitle: 'DB', isPrerequisite: true },
    { projectId: 'ui', storyId: 's-ui', projectTitle: 'UI', isPrerequisite: false },
  ],
} as never

const TWO_IN_UI = {
  legs: [
    { projectId: 'ui', storyId: 'u1', projectTitle: 'UI', storyTitle: 'First' },
    { projectId: 'tools', storyId: 't1', projectTitle: 'Tools' },
    { projectId: 'ui', storyId: 'u2', projectTitle: 'UI', storyTitle: 'Second' },
  ],
  waves: [['u1', 't1'], ['u2']],
} as never

describe('processGroupLegWaitsFor', () => {
  it('names what a leg waits for, the legs named by their stories', () => {
    expect(processGroupLegWaitsFor(PREVIEW, ['s-tools'])).toBe('Starts once Tools is merged')
    expect(processGroupLegWaitsFor(PREVIEW, ['s-tools', 'gone'])).toBe(
      'Starts once Tools and gone are merged',
    )
    expect(processGroupLegWaitsFor(PREVIEW, [])).toBeUndefined()
  })

  it('names a leg by its story too when its project has another', () => {
    expect(processGroupLegWaitsFor(TWO_IN_UI, ['u1'])).toBe('Starts once UI · First is merged')
  })

  it('says finished, not merged, for a run built on branches', () => {
    const built = (buildMode: string) => Object.assign({}, PREVIEW, { buildMode }) as never
    expect(processGroupLegWaitsFor(built('on-branch'), ['s-tools'])).toBe(
      'Starts once Tools is finished, on its branch',
    )
    expect(processGroupLegWaitsFor(built('merge-first'), ['s-tools'])).toBe(
      'Starts once Tools is merged',
    )
  })
})

describe('processGroupLaunchLegsByWave', () => {
  it('puts each leg in its wave by its story, one project’s legs apart', () => {
    expect(
      processGroupLaunchLegsByWave(TWO_IN_UI).map((wave) => wave.map((l) => l.storyId)),
    ).toEqual([['u1', 't1'], ['u2']])
  })

  it('has no waves without a preview', () => {
    expect(processGroupLaunchLegsByWave(undefined)).toEqual([])
  })
})
