// Client-side persisted-settings types shared across web, desktop, and mobile.
// Values live in `localStorage` / MMKV / `safeStorage` (per platform),
// adapter-wrapped via `useStorageBackedState`. Extend conservatively — only
// add fields when a real screen needs them.

import type { StoryStatus } from '../utils/status'
import type { StoryListSorting } from '../utils/storiesOptions'
import type { Theme } from '../hooks/useResolvedTheme'
import type { ChatBadgeCountMode } from '../hooks/useBadgeCountsCore'

// `Theme` and `ChatBadgeCountMode` are owned by the hooks that consume them;
// re-export here so `AppSettings` can reference them without making consumers
// import from two places.
export type { ChatBadgeCountMode, StoryListSorting, Theme }

export const AVAILABLE_THEMES: readonly Theme[] = ['light', 'dark', 'system'] as const

export type ShortcutsModifier = 'meta' | 'ctrl'

export type ShortcutsConfig = {
  commandMenu: string
  newStory: string
  help: string
  addUiFeature: string
}

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  commandMenu: 'Mod+K',
  newStory: 'Mod+N',
  help: 'Mod+/',
  addUiFeature: 'Mod+Shift+F',
}

export type StoriesViewMode = 'list' | 'board'
export type StoriesListSorting = StoryListSorting
export type StoriesListStatusFilter = 'all' | 'not-done' | StoryStatus

/** Syntax-highlight theme for `<Code>` blocks (tool args / results etc.). */
export type CodeBlockTheme = 'light' | 'dark'
export const CODE_BLOCK_THEMES: readonly CodeBlockTheme[] = ['light', 'dark'] as const

export type UserPreferences = {
  /** Last project the user was viewing; used to restore selection on boot. */
  lastActiveProjectId?: string
  /** Whether the left navigation is collapsed. */
  sidebarCollapsed?: boolean
  /** Which physical key `Mod` resolves to (⌘ on macOS, Ctrl elsewhere by default). */
  shortcutsModifier: ShortcutsModifier
  /** Per-action keyboard shortcut combos, customisable in Settings. */
  shortcuts: ShortcutsConfig
  /** Stories list display mode. */
  storiesViewMode: StoriesViewMode
  /** Stories list ordering. */
  storiesListViewSorting: StoriesListSorting
  /** Stories list status filter. `all` shows everything; `not-done` hides done items. */
  storiesListViewStatusFilter: StoriesListStatusFilter
  /**
   * Syntax-highlight theme applied to `<Code>` blocks (tool call args /
   * results, dynamic context, etc.). Independent of the overall app
   * theme — defaults to `'light'` so the code is readable against the
   * default light app theme.
   */
  codeBlockTheme: CodeBlockTheme
}

export type NotificationCategory = 'chat' | 'tests' | 'git' | 'agent_runs'

export type BadgeColor = 'red' | 'blue' | 'green' | 'orange'

export const BADGE_COLORS: readonly BadgeColor[] = ['red', 'blue', 'green', 'orange'] as const

export type NotificationPrefs = {
  /** Show OS notifications when the tab is hidden. Requires user permission. */
  osNotificationsEnabled: boolean
  /** Per-category enablement; missing categories default to true. */
  categories: Record<NotificationCategory, boolean>
  /** Per-category badge enablement (sidebar / favicon dots). */
  badgesEnabled: Record<NotificationCategory, boolean>
  /** Per-category badge colour. */
  badgeColors: Record<NotificationCategory, BadgeColor>
  /** Whether chat badges count chats with unread messages or total unread messages. */
  chatBadgeCountMode: ChatBadgeCountMode
  /** Sub-toggles for the `git` category. */
  gitBadgeSubToggles: { incoming_commits: boolean; uncommitted_changes: boolean }
  /** Auto-dismiss after this many seconds. `0` means persistent. */
  displayDurationSeconds: 3 | 5 | 10 | 0
  /** Whether to play a short sound on notify. */
  soundsEnabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  osNotificationsEnabled: false,
  categories: { chat: true, tests: true, git: true, agent_runs: true },
  badgesEnabled: { chat: true, tests: true, git: true, agent_runs: true },
  badgeColors: { chat: 'red', tests: 'green', git: 'orange', agent_runs: 'red' },
  chatBadgeCountMode: 'chats_with_unread',
  gitBadgeSubToggles: { incoming_commits: true, uncommitted_changes: true },
  displayDurationSeconds: 5,
  soundsEnabled: false,
}

export type AppSettings = {
  /** "system" follows the OS via `prefers-color-scheme` (or platform equivalent). */
  theme: Theme
  userPreferences: UserPreferences
  notifications: NotificationPrefs
}

// `shortcutsModifier` defaults to `'ctrl'` here because the headless layer
// can't sniff platform. Consumers that want the mac-aware default
// (`AppSettingsContext` on web) compose `DEFAULT_APP_SETTINGS` with a local
// override.
export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  userPreferences: {
    sidebarCollapsed: false,
    shortcutsModifier: 'ctrl',
    shortcuts: DEFAULT_SHORTCUTS,
    storiesViewMode: 'list',
    storiesListViewSorting: 'index_asc',
    storiesListViewStatusFilter: 'all',
    codeBlockTheme: 'light',
  },
  notifications: DEFAULT_NOTIFICATION_PREFS,
}

export type ProjectSettings = {
  notifications: {
    /** Per-category enablement scoped to one project. Missing keys fall through to the global default (true). */
    categories: Partial<NotificationPrefs['categories']>
  }
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  notifications: { categories: {} },
}
