import { describe, expect, it } from 'vitest'
import {
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
