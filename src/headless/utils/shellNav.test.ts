import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_NAV_DEF,
  GROUP_TAB_DEFS,
  SHELL_TAB_DEFS,
  groupTabToProjectTab,
  isGroupTabKey,
  isShellTabKey,
  projectShowsShellTab,
  projectTabToGroupTab,
  shellTabForProject,
  splitGroupsAndProjects,
} from './shellNav'

describe('ASSISTANT_NAV_DEF', () => {
  it('is the Assistant, drawn with the chat icon, in no project’s or group’s tabs', () => {
    expect(ASSISTANT_NAV_DEF).toEqual({ key: 'assistant', label: 'Assistant', icon: 'chat' })
    expect(SHELL_TAB_DEFS.map((t) => t.key)).not.toContain('assistant')
    expect(GROUP_TAB_DEFS.map((t) => t.key)).not.toContain('assistant')
  })
})

describe('SHELL_TAB_DEFS', () => {
  it('lists the per-project surfaces in display order', () => {
    expect(SHELL_TAB_DEFS.map((t) => t.key)).toEqual([
      'app',
      'stories',
      'search',
      'files',
      'design',
      'notes',
      'knowledge',
      'chat',
      'git',
      'tests',
      'live-data',
      'timeline',
      'tools',
      'processes',
      'settings',
    ])
  })

  it('labels the landing surface "Home" while keeping the "stories" key', () => {
    const landing = SHELL_TAB_DEFS.find((t) => t.key === 'stories')
    expect(landing?.label).toBe('Home')
    expect(landing?.icon).toBe('home')
  })

  it('puts Design right after Files, with its own icon', () => {
    expect(SHELL_TAB_DEFS.find((t) => t.key === 'design')).toEqual({
      key: 'design',
      label: 'Design',
      icon: 'design',
    })
    expect(isShellTabKey('design')).toBe(true)
  })

  it('puts Search right after Home, with its own icon, on every project', () => {
    expect(SHELL_TAB_DEFS.find((t) => t.key === 'search')).toEqual({
      key: 'search',
      label: 'Search',
      icon: 'search',
    })
    expect(isShellTabKey('search')).toBe(true)
    expect(projectShowsShellTab('search', { isUiApp: false, hasApp: false })).toBe(true)
  })

  it('puts Knowledge right after Notes, with its own icon, on every project', () => {
    expect(SHELL_TAB_DEFS.find((t) => t.key === 'knowledge')).toEqual({
      key: 'knowledge',
      label: 'Knowledge',
      icon: 'knowledge',
    })
    expect(isShellTabKey('knowledge')).toBe(true)
    expect(projectShowsShellTab('knowledge', { isUiApp: false, hasApp: false })).toBe(true)
    expect(projectTabToGroupTab('knowledge')).toBe('home')
  })

  it('gives each tab an icon key', () => {
    for (const t of SHELL_TAB_DEFS) expect(typeof t.icon).toBe('string')
  })
})

describe('GROUP_TAB_DEFS', () => {
  it('lists only the group-scope surfaces', () => {
    expect(GROUP_TAB_DEFS.map((t) => t.key)).toEqual([
      'home',
      'stories',
      'chat',
      'notes',
      'tools',
      'processes',
      'settings',
    ])
  })

  it('routes the group’s settings without listing them among its tabs — the footer row reaches them', () => {
    expect(GROUP_TAB_DEFS.find((t) => t.key === 'settings')?.hiddenInSidebar).toBe(true)
  })
})

describe('isShellTabKey', () => {
  it('accepts known shell tab keys', () => {
    expect(isShellTabKey('stories')).toBe(true)
    expect(isShellTabKey('chat')).toBe(true)
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
    expect(isGroupTabKey('settings')).toBe(true)
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
    expect(projectTabToGroupTab('processes')).toBe('processes')
  })

  it('keeps the user in Notes when they switch to a group — a group keeps notes too', () => {
    expect(projectTabToGroupTab('notes')).toBe('notes')
    expect(groupTabToProjectTab('notes')).toBe('notes')
  })

  it('keeps the user in Settings when they switch to a group', () => {
    expect(projectTabToGroupTab('settings')).toBe('settings')
  })

  it('falls back to "home" for project-only surfaces', () => {
    expect(projectTabToGroupTab('stories')).toBe('home')
    expect(projectTabToGroupTab('files')).toBe('home')
    expect(projectTabToGroupTab(undefined)).toBe('home')
  })
})

describe('groupTabToProjectTab', () => {
  it('takes the group’s stories to the project’s stories', () => {
    expect(groupTabToProjectTab('stories')).toBe('stories')
  })

  it('carries shared surfaces across scopes', () => {
    expect(groupTabToProjectTab('chat')).toBe('chat')
    expect(groupTabToProjectTab('tools')).toBe('tools')
    expect(groupTabToProjectTab('processes')).toBe('processes')
  })

  it('keeps the user in Settings when they switch to a project', () => {
    expect(groupTabToProjectTab('settings')).toBe('settings')
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

describe('projectShowsShellTab', () => {
  it('shows the App tab only for a project that declares an app', () => {
    expect(projectShowsShellTab('app', { hasApp: true })).toBe(true)
    expect(projectShowsShellTab('app', { hasApp: false })).toBe(false)
    expect(projectShowsShellTab('app', {})).toBe(false)
    expect(projectShowsShellTab('app', undefined)).toBe(false)
  })

  it('shows the Design tab unless the project says it is not a UI app', () => {
    expect(projectShowsShellTab('design', undefined)).toBe(true)
    expect(projectShowsShellTab('design', {})).toBe(true)
    expect(projectShowsShellTab('design', { isUiApp: true })).toBe(true)
    expect(projectShowsShellTab('design', { isUiApp: false })).toBe(false)
  })

  it('shows every other tab whatever the metadata says', () => {
    expect(projectShowsShellTab('files', { hasApp: false, isUiApp: false })).toBe(true)
  })
})

describe('shellTabForProject', () => {
  it('keeps a tab the project shows and lands on Home for one it does not', () => {
    expect(shellTabForProject('design', { isUiApp: true })).toBe('design')
    expect(shellTabForProject('design', { isUiApp: false })).toBe('stories')
    expect(shellTabForProject('app', {})).toBe('stories')
    expect(shellTabForProject('git', { isUiApp: false })).toBe('git')
  })
})
