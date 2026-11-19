import { describe, expect, it } from 'vitest'
import { trainerRecommendationLaunchNote } from './trainerRecommendationLaunch'

describe('trainerRecommendationLaunchNote', () => {
  it('blocks duplicate launches for the default auto-launched result', () => {
    expect(trainerRecommendationLaunchNote({ mode: 'launch', launched: 2 }, {})).toContain(
      'already launched',
    )
  })
  it('blocks every row when a partial failure cannot be mapped to suggestion ids', () => {
    expect(
      trainerRecommendationLaunchNote(
        { mode: 'launch', launched: 1, launchErrors: ['Second: queue full'] },
        {},
      ),
    ).toContain('already launched')
  })
  it('does not let launch:false override evidence that the backend launched work', () => {
    expect(trainerRecommendationLaunchNote({ launched: 1 }, { launch: false })).toContain(
      'already launched',
    )
  })
  it.each([
    [{ mode: 'park', launched: 0 }, {}],
    [{}, { launch: false }],
    [{ mode: 'launch', launched: 0, launchErrors: ['Queue full'] }, {}],
  ])('allows a known unlaunched batch %j', (payload, args) => {
    expect(trainerRecommendationLaunchNote(payload, args)).toBeUndefined()
  })
  it('does not guess that a legacy default call was parked', () => {
    expect(trainerRecommendationLaunchNote({}, {})).toContain('unavailable')
    expect(trainerRecommendationLaunchNote({ mode: 'launch' }, {})).toContain('unavailable')
  })
})
