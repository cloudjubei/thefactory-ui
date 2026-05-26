import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '../types/settings'
import { mergeSettings } from './settings'

describe('mergeSettings', () => {
  it('returns the defaults when given an empty object', () => {
    expect(mergeSettings({})).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('shallow-merges top-level fields', () => {
    const out = mergeSettings({ theme: 'dark' })
    expect(out.theme).toBe('dark')
    expect(out.userPreferences).toEqual(DEFAULT_APP_SETTINGS.userPreferences)
    expect(out.notifications).toEqual(DEFAULT_APP_SETTINGS.notifications)
  })

  it('deep-merges userPreferences while preserving unset nested defaults', () => {
    const out = mergeSettings({
      userPreferences: {
        storiesViewMode: 'board',
        shortcutsModifier: 'meta',
        shortcuts: DEFAULT_APP_SETTINGS.userPreferences.shortcuts,
        storiesListViewSorting: 'index_desc',
        storiesListViewStatusFilter: 'not-done',
      } as Partial<typeof DEFAULT_APP_SETTINGS.userPreferences> as typeof DEFAULT_APP_SETTINGS.userPreferences,
    })
    expect(out.userPreferences.storiesViewMode).toBe('board')
    expect(out.userPreferences.storiesListViewSorting).toBe('index_desc')
    expect(out.userPreferences.shortcuts).toEqual(DEFAULT_APP_SETTINGS.userPreferences.shortcuts)
  })

  it('fills in missing shortcut fields with defaults', () => {
    const out = mergeSettings({
      userPreferences: {
        ...DEFAULT_APP_SETTINGS.userPreferences,
        shortcuts: {
          commandMenu: 'Mod+P',
        } as never,
      },
    })
    expect(out.userPreferences.shortcuts.commandMenu).toBe('Mod+P')
    expect(out.userPreferences.shortcuts.newStory).toBe(
      DEFAULT_APP_SETTINGS.userPreferences.shortcuts.newStory,
    )
    expect(out.userPreferences.shortcuts.help).toBe(
      DEFAULT_APP_SETTINGS.userPreferences.shortcuts.help,
    )
  })

  it('deep-merges notifications and its sub-records', () => {
    const out = mergeSettings({
      notifications: {
        osNotificationsEnabled: true,
        categories: { chat: false } as never,
        badgesEnabled: DEFAULT_APP_SETTINGS.notifications.badgesEnabled,
        badgeColors: DEFAULT_APP_SETTINGS.notifications.badgeColors,
        chatBadgeCountMode: 'total_messages',
        gitBadgeSubToggles: { incoming_commits: false } as never,
        displayDurationSeconds: 10,
        soundsEnabled: true,
      },
    })
    expect(out.notifications.osNotificationsEnabled).toBe(true)
    expect(out.notifications.categories.chat).toBe(false)
    // missing categories fall back to default
    expect(out.notifications.categories.tests).toBe(true)
    expect(out.notifications.gitBadgeSubToggles.incoming_commits).toBe(false)
    // missing sub-toggle falls back
    expect(out.notifications.gitBadgeSubToggles.uncommitted_changes).toBe(true)
    expect(out.notifications.chatBadgeCountMode).toBe('total_messages')
  })

  it('does not mutate the defaults', () => {
    const before = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS))
    mergeSettings({ theme: 'dark' })
    expect(DEFAULT_APP_SETTINGS).toEqual(before)
  })
})
