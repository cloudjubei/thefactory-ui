import { describe, expect, it } from 'vitest'

import {
  launchCapFields,
  launchCapsMetadata,
  launchCapsOfArgs,
  launchCapsOfDefaults,
  launchCapsSummary,
  launchCapsValid,
  launchWorstCaseLine,
  processDefaultCapFields,
  readProcessDefaultCaps,
  withProcessDefaultCaps,
} from './processLaunchCaps'
import { LAUNCH_CAPS_COPY } from './processLaunchCapsConstants'

const byKey = (fields: ReturnType<typeof launchCapFields>) =>
  Object.fromEntries(fields.map((f) => [f.key, f]))

describe('launchCapsOfArgs', () => {
  it('reads the caps an agent asked for', () => {
    expect(
      launchCapsOfArgs({
        spendCapUsd: 5,
        wallClockMs: 3_600_000,
        maxIterations: 3,
        questionCap: 0,
        checkTimeoutMs: 120_000,
        note: 'x',
      }),
    ).toEqual({
      spendCapUsd: 5,
      wallClockMs: 3_600_000,
      maxIterations: 3,
      questionCap: 0,
      checkTimeoutMs: 120_000,
    })
  })

  it('leaves out what cannot be a cap, as the backend would', () => {
    expect(
      launchCapsOfArgs({ spendCapUsd: -1, maxIterations: 1.5, questionCap: -2, wallClockMs: 'x' }),
    ).toEqual({})
  })
})

describe('launchCapFields', () => {
  it('offers the five caps in order', () => {
    expect(launchCapFields({}).map((f) => f.key)).toEqual([
      'spendCapUsd',
      'wallClockMs',
      'maxIterations',
      'questionCap',
      'checkTimeoutMs',
    ])
  })

  it('starts each from the project’s default, shown in the field’s unit', () => {
    const fields = byKey(
      launchCapFields({
        defaults: { spendUsdCap: 10, wallClockMs: 7_200_000, maxIterations: 2 },
      }),
    )
    expect(fields.spendCapUsd).toMatchObject({ text: '10', fromProject: true })
    expect(fields.wallClockMs).toMatchObject({ text: '120', fromProject: true })
    expect(fields.maxIterations).toMatchObject({ text: '2', fromProject: true })
    expect(fields.questionCap).toMatchObject({ text: '', fromProject: false })
  })

  it('takes what the agent asked over the project’s default', () => {
    const fields = byKey(
      launchCapFields({ asked: { spendCapUsd: 3 }, defaults: { spendUsdCap: 10 } }),
    )
    expect(fields.spendCapUsd).toMatchObject({ text: '3', fromProject: false })
  })

  it('takes what the person typed over both, empty included', () => {
    const fields = byKey(
      launchCapFields({
        asked: { spendCapUsd: 3 },
        defaults: { maxIterations: 2 },
        typed: { spendCapUsd: '7', maxIterations: '' },
      }),
    )
    expect(fields.spendCapUsd?.text).toBe('7')
    expect(fields.maxIterations).toMatchObject({ text: '', fromProject: false })
  })

  it('says emptying a project default falls back to it', () => {
    const fields = byKey(
      launchCapFields({ defaults: { maxIterations: 2 }, typed: { maxIterations: '' } }),
    )
    expect(fields.maxIterations?.placeholder).toBe(LAUNCH_CAPS_COPY.projectDefault('2'))
  })

  it('says emptying what the agent asked keeps its ask, which rides on the launch', () => {
    const fields = byKey(
      launchCapFields({ asked: { maxIterations: 4 }, typed: { maxIterations: '' } }),
    )
    expect(fields.maxIterations?.placeholder).toBe(LAUNCH_CAPS_COPY.agentAsked('4'))
  })

  it.each([
    ['spendCapUsd', '0'],
    ['spendCapUsd', 'lots'],
    ['wallClockMs', '-1'],
    ['maxIterations', '1.5'],
    ['maxIterations', '0'],
    ['questionCap', '-1'],
    ['questionCap', '1.5'],
    ['checkTimeoutMs', '0'],
  ] as const)('marks %s = %s as not a cap', (key, text) => {
    expect(byKey(launchCapFields({ typed: { [key]: text } }))[key]?.error).toBeDefined()
  })

  it('takes a question limit of 0, which asks nothing, and a part of a minute', () => {
    const fields = byKey(launchCapFields({ typed: { questionCap: '0', wallClockMs: '1.5' } }))
    expect(fields.questionCap?.error).toBeUndefined()
    expect(fields.wallClockMs?.error).toBeUndefined()
  })
})

describe('launchCapsMetadata', () => {
  it('sends each cap under its launch name, in the backend’s unit', () => {
    expect(
      launchCapsMetadata(
        launchCapFields({
          typed: {
            spendCapUsd: '2.5',
            wallClockMs: '90',
            maxIterations: '3',
            questionCap: '0',
            checkTimeoutMs: '1.5',
          },
        }),
      ),
    ).toEqual({
      spendCapUsd: 2.5,
      wallClockMs: 5_400_000,
      maxIterations: 3,
      questionCap: 0,
      checkTimeoutMs: 90_000,
    })
  })

  it('leaves out an empty field: it is no cap from this card', () => {
    expect(launchCapsMetadata(launchCapFields({}))).toEqual({})
  })

  it('leaves out a field in error, which blocks the card instead', () => {
    const fields = launchCapFields({ typed: { maxIterations: '0' } })
    expect(launchCapsMetadata(fields)).toEqual({})
    expect(launchCapsValid(fields)).toBe(false)
  })

  it('reads every empty or sound card as valid', () => {
    expect(launchCapsValid(launchCapFields({}))).toBe(true)
  })

  it('sends the project’s own start back as it stood', () => {
    expect(
      launchCapsMetadata(
        launchCapFields({ defaults: { spendUsdCap: 10, wallClockMs: 3_600_000 } }),
      ),
    ).toEqual({ spendCapUsd: 10, wallClockMs: 3_600_000 })
  })
})

describe('launchCapsOfDefaults', () => {
  it('reads a project’s defaults under the launch’s names', () => {
    expect(launchCapsOfDefaults({ spendUsdCap: 4, wallClockMs: 60_000, maxIterations: 2 })).toEqual(
      {
        spendCapUsd: 4,
        wallClockMs: 60_000,
        maxIterations: 2,
      },
    )
  })

  it('names only what the project set', () => {
    expect(launchCapsOfDefaults({ maxIterations: 2 })).toEqual({ maxIterations: 2 })
  })
})

describe('launchCapsSummary', () => {
  it('says the limits set, in short', () => {
    expect(
      launchCapsSummary({
        spendCapUsd: 5,
        wallClockMs: 5_400_000,
        maxIterations: 3,
        questionCap: 2,
        checkTimeoutMs: 120_000,
      }),
    ).toBe('$5 · 1h 30m · 3 attempts · 2 questions · 2m a check')
  })

  it('says no limits when none are set', () => {
    expect(launchCapsSummary({})).toBe(LAUNCH_CAPS_COPY.noLimits)
  })

  it('counts one and none in plain words', () => {
    expect(launchCapsSummary({ maxIterations: 1, questionCap: 0 })).toBe('1 attempt · No questions')
  })
})

describe('launchWorstCaseLine', () => {
  it('multiplies the attempts by the features', () => {
    expect(launchWorstCaseLine({ attempts: 3, count: 4, of: 'feature' })).toBe(
      'Worst case: 3 attempts × 4 features = 12 attempts',
    )
  })

  it('multiplies by the projects of a group', () => {
    expect(launchWorstCaseLine({ attempts: 2, count: 3, of: 'leg' })).toBe(
      'Worst case: 2 attempts × 3 projects = 6 attempts',
    )
  })

  it('says one of a thing as one', () => {
    expect(launchWorstCaseLine({ attempts: 1, count: 1, of: 'feature' })).toBe(
      'Worst case: 1 attempt × 1 feature = 1 attempt',
    )
  })

  it('says nothing without a limit or anything to work', () => {
    expect(launchWorstCaseLine({ attempts: undefined, count: 4, of: 'feature' })).toBeUndefined()
    expect(launchWorstCaseLine({ attempts: 3, count: 0, of: 'feature' })).toBeUndefined()
  })
})

describe('project default caps', () => {
  it('reads only what can be a cap, as the metadata is free JSON', () => {
    expect(
      readProcessDefaultCaps({ spendUsdCap: 10, wallClockMs: 'soon', maxIterations: 2, other: 1 }),
    ).toEqual({ spendUsdCap: 10, maxIterations: 2 })
    expect(readProcessDefaultCaps(undefined)).toEqual({})
    expect(readProcessDefaultCaps('x')).toEqual({})
  })

  it('offers the three a project can set, in the field’s unit', () => {
    const fields = processDefaultCapFields({ spendUsdCap: 10, wallClockMs: 3_600_000 }, {})
    expect(fields.map((f) => [f.key, f.text])).toEqual([
      ['spendCapUsd', '10'],
      ['wallClockMs', '60'],
      ['maxIterations', ''],
    ])
  })

  it('writes the fields back under the names the backend reads', () => {
    const fields = processDefaultCapFields({}, { spendCapUsd: '4', maxIterations: '2' })
    expect(withProcessDefaultCaps({ icon: 'x' }, fields)).toEqual({
      icon: 'x',
      processDefaultCaps: { spendUsdCap: 4, maxIterations: 2 },
    })
  })

  it('removes the key once nothing is set, keeping the rest', () => {
    const fields = processDefaultCapFields({ maxIterations: 2 }, { maxIterations: '' })
    expect(
      withProcessDefaultCaps({ icon: 'x', processDefaultCaps: { maxIterations: 2 } }, fields),
    ).toEqual({ icon: 'x' })
  })

  it('leaves a field in error out of what is saved', () => {
    const fields = processDefaultCapFields({}, { maxIterations: '0', spendCapUsd: '3' })
    expect(withProcessDefaultCaps({}, fields)).toEqual({ processDefaultCaps: { spendUsdCap: 3 } })
  })
})
