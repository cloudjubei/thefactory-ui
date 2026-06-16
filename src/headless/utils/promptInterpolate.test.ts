import { describe, expect, it } from 'vitest'
import {
  buildChatPromptVariables,
  interpolateChatSystemPrompt,
  interpolatePrompt,
  type PromptVariables,
} from './promptInterpolate'

describe('interpolatePrompt', () => {
  it('returns the template unchanged when it is empty', () => {
    expect(interpolatePrompt('', {})).toBe('')
  })

  it('replaces project placeholders', () => {
    const out = interpolatePrompt('Project {{project_title}} ({{project_id}})', {
      project: { id: 'p1', title: 'Overseer' },
    })
    expect(out).toBe('Project Overseer (p1)')
  })

  it('replaces story + feature placeholders', () => {
    const vars: PromptVariables = {
      story: { id: 's1', title: 'Auth', description: 'Login flow' },
      feature: { id: 'f1', title: 'OAuth', description: 'Google login' },
    }
    const out = interpolatePrompt(
      '{{story_title}}/{{feature_title}}: {{story_description}} — {{feature_description}}',
      vars,
    )
    expect(out).toBe('Auth/OAuth: Login flow — Google login')
  })

  it('substitutes an empty string for missing variables', () => {
    expect(interpolatePrompt('[{{feature_id}}]', {})).toBe('[]')
  })

  it('serialises story_features as a JSON id array', () => {
    const out = interpolatePrompt('{{story_features}}', {
      story: { id: 's1', features: [{ id: 'f1' }, { id: 'f2' }] },
    })
    expect(out).toBe('["f1","f2"]')
  })

  it('serialises group_projects as a JSON array, defaulting to []', () => {
    expect(interpolatePrompt('{{group_projects}}', {})).toBe('[]')
    expect(
      interpolatePrompt('{{group_projects}}', { group: { projects: [{ id: 'p1' }] } }),
    ).toBe('[{"id":"p1"}]')
  })

  it('replaces every occurrence of a repeated placeholder', () => {
    expect(interpolatePrompt('{{project_id}}-{{project_id}}', { project: { id: 'x' } })).toBe(
      'x-x',
    )
  })

  it('replaces the agent run type placeholder', () => {
    expect(interpolatePrompt('{{agent_run_type}}', { agentRunType: 'developer' })).toBe(
      'developer',
    )
  })
})

describe('interpolateChatSystemPrompt', () => {
  it('returns undefined for an absent template (no prompt configured)', () => {
    expect(interpolateChatSystemPrompt(undefined, { project: { id: 'p1' } })).toBeUndefined()
  })

  it('fills project placeholders for the send path, leaving no raw braces', () => {
    const out = interpolateChatSystemPrompt('## {{project_title}}\n{{project_description}}', {
      project: { id: 'p1', title: 'Overseer', description: 'Ships features' },
    })
    expect(out).toBe('## Overseer\nShips features')
    expect(out).not.toMatch(/\{\{/)
  })

  it('collapses placeholders that have no matching variable (never leaks {{...}})', () => {
    const out = interpolateChatSystemPrompt('{{project_title}} [{{story_title}}]', {
      project: { title: 'P' },
    })
    expect(out).toBe('P []')
    expect(out).not.toMatch(/\{\{/)
  })
})

describe('buildChatPromptVariables', () => {
  const project = { id: 'p1', title: 'Acme', description: 'Ships' }
  const getStory = (id: string) =>
    id === 's1' ? { id: 's1', title: 'Auth', description: 'Login', features: [{ id: 'f1' }] } : undefined
  const getFeature = (s: string, f: string) =>
    s === 's1' && f === 'f1' ? { id: 'f1', title: 'OAuth', description: 'Google' } : undefined
  const getGroupById = (id: string) =>
    id === 'g1' ? { id: 'g1', title: 'Team', projects: ['p1', 'p2'] } : undefined

  it('fills only project for a project context', () => {
    const vars = buildChatPromptVariables({}, { project, getStory, getFeature, getGroupById })
    expect(vars).toEqual({ project })
  })

  it('resolves the story for a story context', () => {
    const vars = buildChatPromptVariables({ storyId: 's1' }, { project, getStory, getFeature, getGroupById })
    expect(vars.story).toEqual({ id: 's1', title: 'Auth', description: 'Login', features: [{ id: 'f1' }] })
    expect(vars.feature).toBeUndefined()
  })

  it('resolves story + feature for a feature context', () => {
    const vars = buildChatPromptVariables(
      { storyId: 's1', featureId: 'f1' },
      { project, getStory, getFeature, getGroupById },
    )
    expect(vars.feature).toEqual({ id: 'f1', title: 'OAuth', description: 'Google' })
    expect(vars.story?.id).toBe('s1')
  })

  it('resolves the group (projects mapped to {id}) for a group context', () => {
    const vars = buildChatPromptVariables({ groupId: 'g1' }, { project, getStory, getFeature, getGroupById })
    expect(vars.group).toEqual({ id: 'g1', title: 'Team', projects: [{ id: 'p1' }, { id: 'p2' }] })
  })

  it('omits unresolved entities (so their placeholders collapse, never leak)', () => {
    const vars = buildChatPromptVariables({ storyId: 'missing' }, { project, getStory, getFeature, getGroupById })
    expect(vars.story).toBeUndefined()
    // End to end: the template renders with no raw braces.
    const out = interpolateChatSystemPrompt('{{project_title}}/{{story_title}}', vars)
    expect(out).toBe('Acme/')
    expect(out).not.toMatch(/\{\{/)
  })
})
