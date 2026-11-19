import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TRAINER_RESULT, TRAINER_ROUTES } from './trainerSuggestionFixtures'

/** The comparison overlays must not pull feature-only product modules onto the base. */
describe('trainer comparison fixtures', () => {
  it.each([
    'playground/scenes/trainerSuggestions.tsx',
    'playground/native/trainerSuggestionViews.tsx',
    'playground/scenes/trainerSuggestionFixtures.ts',
  ])('%s has no feature-only launch view or store dependency', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).not.toMatch(
      /from ['"][^'"]*(?:TrainerSuggestionLaunch|trainerSuggestionStore|useTrainerSuggestionLaunch)/,
    )
  })

  it('keeps the same two stored suggestions and fixed settled transport for either build', () => {
    expect(TRAINER_RESULT.suggestions.map(({ id }) => id)).toEqual(['learning-rate', 'batch-size'])
    const launch =
      TRAINER_ROUTES['POST /api/v1/projects/{projectId}/trainer-suggestions/{suggestionId}/launch']
    const read = TRAINER_ROUTES['/api/v1/projects/{projectId}/activities/{activityId}']
    expect(launch()).toEqual({ activityId: 'train-1', queued: false })
    expect(read()).toEqual(read())
    expect(read()).toMatchObject({
      status: 'running',
      steps: [{ key: 'train', done: 2, total: 6 }],
    })
  })
})
