/**
 * `{{placeholder}}`-style template interpolation for chat system prompts.
 * Mirrors `thefactory-tools`' `replacePlaceholders` 1:1 so the system-prompt
 * bubble shown in chat (and the viewer modal) renders the same resolved
 * text the agent will receive.
 *
 * Library is renderer-agnostic — the host supplies the variables map.
 */

export type PromptVariables = {
  group?: { id?: string; title?: string; projects?: Array<{ id: string }> }
  project?: { id?: string; title?: string; description?: string }
  story?: {
    id?: string
    title?: string
    description?: string
    features?: Array<{ id: string }>
  }
  feature?: { id?: string; title?: string; description?: string }
  agentRunType?: string
}

const PLACEHOLDERS = [
  '{{group_id}}',
  '{{group_title}}',
  '{{group_projects}}',
  '{{project_id}}',
  '{{project_title}}',
  '{{project_description}}',
  '{{story_id}}',
  '{{story_title}}',
  '{{story_description}}',
  '{{story_features}}',
  '{{feature_id}}',
  '{{feature_title}}',
  '{{feature_description}}',
  '{{agent_run_type}}',
] as const

function buildMap(vars: PromptVariables): Record<string, string | undefined> {
  return {
    '{{group_id}}': vars.group?.id,
    '{{group_title}}': vars.group?.title,
    '{{group_projects}}': JSON.stringify(vars.group?.projects ?? []),
    '{{project_id}}': vars.project?.id,
    '{{project_title}}': vars.project?.title,
    '{{project_description}}': vars.project?.description,
    '{{story_id}}': vars.story?.id,
    '{{story_title}}': vars.story?.title,
    '{{story_description}}': vars.story?.description,
    '{{story_features}}': JSON.stringify(vars.story?.features?.map((f) => f.id) ?? []),
    '{{feature_id}}': vars.feature?.id,
    '{{feature_title}}': vars.feature?.title,
    '{{feature_description}}': vars.feature?.description,
    '{{agent_run_type}}': vars.agentRunType,
  }
}

export function interpolatePrompt(template: string, vars: PromptVariables): string {
  if (!template) return template
  const map = buildMap(vars)
  let out = template
  for (const key of PLACEHOLDERS) {
    out = out.replaceAll(key, map[key] ?? '')
  }
  return out
}

/**
 * Interpolate a chat system-prompt template for the SEND path, so the agent receives the same resolved
 * text the prompt viewer shows — never raw `{{...}}` tokens. Returns `undefined` when no template is
 * configured; unknown placeholders collapse to ''. The single producer (`buildToolSettings`) calls this so
 * every client + send path (API, CLI, resume) emits a filled prompt.
 */
export function interpolateChatSystemPrompt(
  template: string | undefined,
  vars: PromptVariables,
): string | undefined {
  if (!template) return template
  return interpolatePrompt(template, vars)
}

/**
 * Resolve {@link PromptVariables} for a chat context from the available lookups, so a chat in ANY context
 * type fills its placeholders: `project` always, plus `story` / `feature` / `group` when the context carries
 * the matching id. A lookup returning undefined just leaves that group of placeholders to collapse to ''
 * (interpolatePrompt never leaks raw braces). The single producer (`buildToolSettings`) calls this so the
 * send path matches what the prompt viewer shows, for every context type.
 */
export function buildChatPromptVariables(
  context: { storyId?: string; featureId?: string; groupId?: string },
  lookups: {
    project?: { id?: string; title?: string; description?: string }
    getStory?: (
      storyId: string,
    ) =>
      | { id: string; title?: string; description?: string; features?: Array<{ id: string }> }
      | undefined
    getFeature?: (
      storyId: string,
      featureId: string,
    ) => { id: string; title?: string; description?: string } | undefined
    getGroupById?: (
      groupId: string,
    ) => { id: string; title?: string; projects?: string[] } | undefined
  },
): PromptVariables {
  const story = context.storyId && lookups.getStory ? lookups.getStory(context.storyId) : undefined
  const feature =
    context.storyId && context.featureId && lookups.getFeature
      ? lookups.getFeature(context.storyId, context.featureId)
      : undefined
  const group =
    context.groupId && lookups.getGroupById ? lookups.getGroupById(context.groupId) : undefined
  return {
    ...(lookups.project ? { project: lookups.project } : {}),
    ...(story
      ? {
          story: {
            id: story.id,
            title: story.title,
            description: story.description,
            features: story.features,
          },
        }
      : {}),
    ...(feature
      ? { feature: { id: feature.id, title: feature.title, description: feature.description } }
      : {}),
    ...(group
      ? {
          group: {
            id: group.id,
            title: group.title,
            projects: (group.projects ?? []).map((id) => ({ id })),
          },
        }
      : {}),
  }
}
