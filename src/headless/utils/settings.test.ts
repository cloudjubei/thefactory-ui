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
      } as Partial<
        typeof DEFAULT_APP_SETTINGS.userPreferences
      > as typeof DEFAULT_APP_SETTINGS.userPreferences,
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
        chatNotifyLevels: DEFAULT_APP_SETTINGS.notifications.chatNotifyLevels,
        agentMessages: 'full',
      },
    })
    expect(out.notifications.osNotificationsEnabled).toBe(true)
    expect(out.notifications.categories.chat).toBe(false)
    // missing categories fall back to default
    expect(out.notifications.categories.tests).toBe(true)
    // a blob predating a category back-fills the new key from the defaults
    expect(out.notifications.categories['cross-project']).toBe(true)
    expect(out.notifications.badgesEnabled['cross-project']).toBe(true)
    expect(out.notifications.badgeColors['cross-project']).toBe('blue')
    expect(out.notifications.categories.storage).toBe(true)
    expect(out.notifications.badgesEnabled.storage).toBe(true)
    expect(out.notifications.badgeColors.storage).toBe('orange')
    expect(out.notifications.gitBadgeSubToggles.incoming_commits).toBe(false)
    // missing sub-toggle falls back
    expect(out.notifications.gitBadgeSubToggles.uncommitted_changes).toBe(true)
    expect(out.notifications.chatBadgeCountMode).toBe('total_messages')
  })

  it('gives a blob predating the badge look the default look: one total, ink splatter, orbit', () => {
    const out = mergeSettings({
      userPreferences: { storiesViewMode: 'board' } as never,
    })
    expect(out.userPreferences.badgeMode).toBe('total')
    expect(out.userPreferences.badgeStyle).toBe('splatter')
    expect(out.userPreferences.badgeMotion).toBe('orbit')
  })

  it('keeps a stored badge look', () => {
    const out = mergeSettings({
      userPreferences: {
        ...DEFAULT_APP_SETTINGS.userPreferences,
        badgeMode: 'dots',
        badgeStyle: 'pie',
        badgeMotion: 'spinner',
      },
    })
    expect(out.userPreferences).toMatchObject({
      badgeMode: 'dots',
      badgeStyle: 'pie',
      badgeMotion: 'spinner',
    })
  })

  it('paints chat blue by default and keeps a colour the person chose', () => {
    expect(mergeSettings({}).notifications.badgeColors.chat).toBe('blue')
    const chose = mergeSettings({ notifications: { badgeColors: { chat: 'red' } } as never })
    expect(chose.notifications.badgeColors.chat).toBe('red')
    expect(chose.notifications.badgeColors.processes).toBe('green')
  })

  it('gives a blob predating notification levels the defaults: runs and requests when they need me, messages between agents collapsed', () => {
    const out = mergeSettings({ notifications: { soundsEnabled: true } as never })
    expect(out.notifications.chatNotifyLevels).toEqual({
      run: 'needs-me',
      work: 'everything',
      request: 'needs-me',
      project: 'everything',
      group: 'everything',
    })
    expect(out.notifications.agentMessages).toBe('collapsed')
  })

  it('keeps the levels the person set and fills a kind added since', () => {
    const out = mergeSettings({
      notifications: { chatNotifyLevels: { run: 'everything' }, agentMessages: 'hidden' } as never,
    })
    expect(out.notifications.chatNotifyLevels.run).toBe('everything')
    expect(out.notifications.chatNotifyLevels.request).toBe('needs-me')
    expect(out.notifications.agentMessages).toBe('hidden')
  })

  it('does not mutate the defaults', () => {
    const before = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS))
    mergeSettings({ theme: 'dark' })
    expect(DEFAULT_APP_SETTINGS).toEqual(before)
  })
})
