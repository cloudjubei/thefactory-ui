import { describe, expect, it } from 'vitest'
import {
  GROUP_TAB_DEFS,
  SHELL_TAB_DEFS,
  groupTabToProjectTab,
  isGroupTabKey,
  isShellTabKey,
  projectTabToGroupTab,
  splitGroupsAndProjects,
} from './shellNav'

describe('SHELL_TAB_DEFS', () => {
  it('lists the per-project surfaces in display order', () => {
    expect(SHELL_TAB_DEFS.map((t) => t.key)).toEqual([
      'stories',
      'files',
      'chat',
      'git',
      'tests',
      'live-data',
      'timeline',
      'tools',
      'settings',
      'agents',
    ])
  })

  it('labels the landing surface "Home" while keeping the "stories" key', () => {
    const landing = SHELL_TAB_DEFS.find((t) => t.key === 'stories')
    expect(landing?.label).toBe('Home')
    expect(landing?.icon).toBe('home')
  })

  it('marks only "agents" as hidden from the sidebar', () => {
    const hidden = SHELL_TAB_DEFS.filter((t) => t.hiddenInSidebar).map((t) => t.key)
    expect(hidden).toEqual(['agents'])
  })

  it('gives each tab an icon key', () => {
    for (const t of SHELL_TAB_DEFS) expect(typeof t.icon).toBe('string')
  })
})

describe('GROUP_TAB_DEFS', () => {
  it('lists only the three group-scope surfaces', () => {
    expect(GROUP_TAB_DEFS.map((t) => t.key)).toEqual(['home', 'chat', 'tools'])
  })
})

describe('isShellTabKey', () => {
  it('accepts known shell tab keys', () => {
    expect(isShellTabKey('stories')).toBe(true)
    expect(isShellTabKey('agents')).toBe(true)
  })

  it('rejects unknown values and undefined', () => {
    expect(isShellTabKey('nope')).toBe(false)
    expect(isShellTabKey(undefined)).toBe(false)
  })
})

describe('isGroupTabKey', () => {
  it('accepts known group tab keys', () => {
    expect(isGroupTabKey('home')).toBe(true)
    expect(isGroupTabKey('chat')).toBe(true)
  })

  it('rejects unknown values and undefined', () => {
    expect(isGroupTabKey('git')).toBe(false)
    expect(isGroupTabKey(undefined)).toBe(false)
  })
})

describe('projectTabToGroupTab', () => {
  it('carries shared surfaces across scopes', () => {
    expect(projectTabToGroupTab('chat')).toBe('chat')
    expect(projectTabToGroupTab('tools')).toBe('tools')
  })

  it('falls back to "home" for project-only surfaces', () => {
    expect(projectTabToGroupTab('stories')).toBe('home')
    expect(projectTabToGroupTab('files')).toBe('home')
    expect(projectTabToGroupTab(undefined)).toBe('home')
  })
})

describe('groupTabToProjectTab', () => {
  it('carries shared surfaces across scopes', () => {
    expect(groupTabToProjectTab('chat')).toBe('chat')
    expect(groupTabToProjectTab('tools')).toBe('tools')
  })

  it('maps the group landing page to the project landing page', () => {
    expect(groupTabToProjectTab('home')).toBe('stories')
    expect(groupTabToProjectTab(undefined)).toBe('stories')
  })
})

describe('splitGroupsAndProjects', () => {
  const projects = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }]

  it('keeps only active groups and treats SCOPE groups as not owning projects', () => {
    const groups = [
      { id: 'main', type: 'MAIN', projects: ['p1', 'p2'], active: true },
      { id: 'scope', type: 'SCOPE', projects: ['p3'], active: true },
      { id: 'archived', type: 'MAIN', projects: ['p4'], active: false },
    ]
    const { mainGroups, allGroups, ungroupedProjects } = splitGroupsAndProjects(groups, projects)

    expect(allGroups.map((g) => g.id)).toEqual(['main', 'scope'])
    expect(mainGroups.map((g) => g.id)).toEqual(['main'])
    expect(ungroupedProjects.map((p) => p.id)).toEqual(['p3', 'p4', 'p5'])
  })

  it('treats a group with no explicit active flag as active', () => {
    const groups = [{ id: 'main', type: 'MAIN', projects: ['p1'] }]
    const { allGroups, ungroupedProjects } = splitGroupsAndProjects(groups, projects)

    expect(allGroups.map((g) => g.id)).toEqual(['main'])
    expect(ungroupedProjects.map((p) => p.id)).toEqual(['p2', 'p3', 'p4', 'p5'])
  })

  it('returns every project as ungrouped when there are no MAIN groups', () => {
    const { ungroupedProjects } = splitGroupsAndProjects([], projects)
    expect(ungroupedProjects).toEqual(projects)
  })
})
