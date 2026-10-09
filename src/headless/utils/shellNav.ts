import { projectIsUiApp } from 'thefactory-tools/utils'

/**
 * Shell navigation model — the structural source of truth shared between the
 * web `Sidebar` (and its responsive drawer) and the native `NavDrawer`. Pure
 * data + helpers, no JSX: `icon` is a key string that each presentation peer
 * maps to its own platform icon component.
 */

/** Icon identifiers — each consumer maps these to its own icon component. */
export type NavIconKey =
  | 'home'
  | 'search'
  | 'files'
  | 'design'
  | 'notes'
  | 'chat'
  | 'git'
  | 'tests'
  | 'live-data'
  | 'timeline'
  | 'tools'
  | 'settings'
  | 'app'
  | 'processes'

/** Per-project shell surface keys. Map to URL segments `/projects/:id/{key}`. */
export type ShellTabKey =
  | 'stories'
  | 'search'
  | 'files'
  | 'design'
  | 'notes'
  | 'chat'
  | 'git'
  | 'tests'
  | 'live-data'
  | 'timeline'
  | 'tools'
  | 'processes'
  | 'settings'
  | 'app'

export type ShellTabDef = {
  key: ShellTabKey
  label: string
  icon: NavIconKey
  /** Routable but not surfaced in the sidebar/drawer (parity with desktop). */
  hiddenInSidebar?: boolean
}

/**
 * Per-project shell surfaces. `stories` keeps its key for existing links even
 * though it is labelled "Home". Order/labels mirror `overseer-local`'s
 * `NAV_ITEMS` 1:1.
 */
export const SHELL_TAB_DEFS: readonly ShellTabDef[] = [
  { key: 'app', label: 'App', icon: 'app' },
  { key: 'stories', label: 'Home', icon: 'home' },
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'files', label: 'Files', icon: 'files' },
  { key: 'design', label: 'Design', icon: 'design' },
  { key: 'notes', label: 'Notes', icon: 'notes' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'git', label: 'Git', icon: 'git' },
  { key: 'tests', label: 'Tests', icon: 'tests' },
  { key: 'live-data', label: 'Live Data', icon: 'live-data' },
  { key: 'timeline', label: 'Timeline', icon: 'timeline' },
  { key: 'tools', label: 'Tools', icon: 'tools' },
  { key: 'processes', label: 'Processes', icon: 'processes' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

export function isShellTabKey(v: string | undefined): v is ShellTabKey {
  return SHELL_TAB_DEFS.some((t) => t.key === v)
}

/** The project metadata flags that decide which per-project tabs exist. */
export type ShellTabProjectFlags = { hasApp?: unknown; isUiApp?: unknown } | undefined

/**
 * Whether a project has this tab: App only when it declares an app (`hasApp`),
 * Design unless it says it has no user interface (`isUiApp: false`), every
 * other tab always.
 */
export function projectShowsShellTab(tab: ShellTabKey, metadata: ShellTabProjectFlags): boolean {
  if (tab === 'app') return metadata?.hasApp === true
  if (tab === 'design') return projectIsUiApp(metadata)
  return true
}

/** The tab to land on in a project: the one asked for if the project has it, else Home. */
export function shellTabForProject(tab: ShellTabKey, metadata: ShellTabProjectFlags): ShellTabKey {
  return projectShowsShellTab(tab, metadata) ? tab : 'stories'
}

/** Per-group shell surface keys. Map to URL segments `/groups/:id/{key}`. */
export type GroupTabKey = 'home' | 'chat' | 'notes' | 'tools' | 'processes' | 'settings'

export type GroupTabDef = {
  key: GroupTabKey
  label: string
  icon: NavIconKey
  /** Routable but not listed among the group's tabs — like a project's Settings, the footer row reaches it. */
  hiddenInSidebar?: boolean
}

/**
 * Per-group shell surfaces — only those that make sense at the group scope (a
 * group spans multiple repos, so no Files / Git / etc.). Its Processes are the
 * group runs: one piece of work carried across several of its projects.
 */
export const GROUP_TAB_DEFS: readonly GroupTabDef[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'notes', label: 'Notes', icon: 'notes' },
  { key: 'tools', label: 'Tools', icon: 'tools' },
  { key: 'processes', label: 'Processes', icon: 'processes' },
  { key: 'settings', label: 'Settings', icon: 'settings', hiddenInSidebar: true },
]

export function isGroupTabKey(v: string | undefined): v is GroupTabKey {
  return GROUP_TAB_DEFS.some((t) => t.key === v)
}

/**
 * Map a project tab to its closest group equivalent — used when switching
 * from a project to a group. Surfaces with a group counterpart (`chat`,
 * `tools`, `processes`) carry over; everything else falls back to `home`.
 */
export function projectTabToGroupTab(tab: ShellTabKey | undefined): GroupTabKey {
  if (tab === 'chat') return 'chat'
  if (tab === 'notes') return 'notes'
  if (tab === 'tools') return 'tools'
  if (tab === 'processes') return 'processes'
  if (tab === 'settings') return 'settings'
  return 'home'
}

/**
 * Map a group tab to its closest project equivalent — used when switching
 * from a group to a project. `home` becomes the project landing page
 * (`stories`); `chat`/`tools`/`processes` carry over verbatim.
 */
export function groupTabToProjectTab(tab: GroupTabKey | undefined): ShellTabKey {
  if (tab === 'chat') return 'chat'
  if (tab === 'notes') return 'notes'
  if (tab === 'tools') return 'tools'
  if (tab === 'processes') return 'processes'
  if (tab === 'settings') return 'settings'
  return 'stories'
}

/** Minimal structural shape of a project for nav grouping. */
export type NavProjectLike = { id: string }

/** Minimal structural shape of a projects-group for nav grouping. */
export type NavGroupLike = {
  id: string
  type?: string
  projects: string[]
  active?: boolean
}

export type SplitGroupsAndProjects<G, P> = {
  /** Active non-SCOPE groups — the only groups that "own" projects. */
  mainGroups: G[]
  /** All active groups (MAIN + SCOPE), in input order. */
  allGroups: G[]
  /** Active projects not claimed by any MAIN group. */
  ungroupedProjects: P[]
}

/**
 * Split groups + projects into the sidebar's three buckets. Groups are
 * filtered to active here; `projects` should already be filtered to active by
 * the caller. SCOPE groups are flat selectable rows and never take a project
 * out of the ungrouped bucket — only MAIN groups own projects.
 */
export function splitGroupsAndProjects<G extends NavGroupLike, P extends NavProjectLike>(
  groups: readonly G[],
  projects: readonly P[],
): SplitGroupsAndProjects<G, P> {
  const allGroups = groups.filter((g) => g.active !== false)
  const mainGroups = allGroups.filter((g) => g.type !== 'SCOPE')
  const grouped = new Set<string>()
  for (const g of mainGroups) for (const id of g.projects) grouped.add(id)
  const ungroupedProjects = projects.filter((p) => !grouped.has(p.id))
  return { mainGroups, allGroups, ungroupedProjects }
}
