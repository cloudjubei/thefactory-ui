import type { ContextInfoStoryRef } from './contextInfoTypes'

/**
 * The story and feature a chat's "i" callout shows: the chat's own when it has
 * a story, else those of the process run the chat belongs to. A feature is only
 * ever shown with its own story.
 */
export function contextInfoStory(
  context: ContextInfoStoryRef,
  run: ContextInfoStoryRef | null | undefined,
): ContextInfoStoryRef {
  const source = context.storyId ? context : run?.storyId ? run : undefined
  if (!source?.storyId) return {}
  return source.featureId
    ? { storyId: source.storyId, featureId: source.featureId }
    : { storyId: source.storyId }
}
