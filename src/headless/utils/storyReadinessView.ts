import type { Story } from 'thefactory-tools/types'
import { storyReadiness } from 'thefactory-tools/utils'

import { STORY_READINESS_COPY } from './storyReadinessViewConstants'
import type { StoryReadinessView } from './storyReadinessViewTypes'

/** A story's readiness badge, from the same check the planner and the queue read. Pure. */
export function storyReadinessView(
  story: Pick<Story, 'description' | 'plan' | 'blockers' | 'features'>,
): StoryReadinessView {
  const { ready, problems } = storyReadiness(story)
  return {
    ready,
    label: ready ? STORY_READINESS_COPY.ready : STORY_READINESS_COPY.notReady(problems.length),
    tone: ready ? 'done' : 'on_hold',
    problems: problems.map((problem, index) => ({
      ...problem,
      key: `${problem.featureId ?? 'story'}:${problem.kind}:${index}`,
    })),
  }
}
