import { useCallback } from 'react'
import { useProjects } from '../contexts/ProjectsContext'
import { useStories } from '../contexts/StoriesContext'
import { featureRequestStoryLabel } from '../utils/featureRequestView'
import {
  useFeatureRequestDecision,
  type FeatureRequestDecisionState,
} from './useFeatureRequestDecision'

export interface IncomingFeatureRequestState extends FeatureRequestDecisionState {
  /** The asking project's name, or its id until the projects load. */
  fromLabel: string
  /** The names of the projects that adopt the result. */
  adopterLabels: string[] | undefined
  /** The chip of the story the work was placed on, once it was. */
  placedOnLabel: string | undefined
}

/**
 * Everything a request's card shows besides navigation: the live request and its decision, the
 * asking and adopting projects by name, and the story the work was placed on — for the receiver's
 * card in the request's chat, and the full request opened from either side.
 */
export function useIncomingFeatureRequest(
  requestId: string | undefined,
): IncomingFeatureRequestState {
  const decision = useFeatureRequestDecision(requestId)
  const { projects } = useProjects()
  const { getStory, storyDisplayIndex } = useStories()
  const projectLabel = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.title ?? id,
    [projects],
  )
  const { request } = decision
  const storyId = request?.handling?.storyId
  return {
    ...decision,
    fromLabel: request ? projectLabel(request.requestedBy.fromProjectId) : '',
    adopterLabels: request?.adopters?.map(projectLabel),
    placedOnLabel: storyId
      ? featureRequestStoryLabel(getStory(storyId)?.title, storyDisplayIndex(storyId))
      : undefined,
  }
}
