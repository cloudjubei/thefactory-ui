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
