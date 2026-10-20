import { describe, expect, it } from 'vitest'
import { DEFAULT_NOTIFICATION_PREFS } from '../types/settings'
import type { NotificationPrefs } from '../types/settings'
import { routeNotification } from './notificationRoute'
import type { NotificationRouteInput } from './notificationRouteTypes'

const prefs = (over: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  ...DEFAULT_NOTIFICATION_PREFS,
  osNotificationsEnabled: true,
  soundsEnabled: true,
  ...over,
})

const input = (over: Partial<NotificationRouteInput> = {}): NotificationRouteInput => ({
  prefs: prefs(),
  projectOverrides: {},
  category: 'chat',
  permission: 'granted',
  foreground: false,
  inAppWhenForeground: false,
  ...over,
})

describe('routeNotification', () => {
  it('posts to the OS with a sound when the app is in the background and everything allows it', () => {
    expect(routeNotification(input())).toEqual({ show: 'os', sound: true, closeAfterMs: 5000 })
  })

  it('stays silent while the app is in front when it has no in-app notices', () => {
    expect(routeNotification(input({ foreground: true }))).toEqual({
      show: null,
      sound: false,
      closeAfterMs: null,
    })
  })

  it('shows an in-app notice while the app is in front when the app has them', () => {
    expect(routeNotification(input({ foreground: true, inAppWhenForeground: true }))).toEqual({
      show: 'in-app',
      sound: true,
      closeAfterMs: 5000,
    })
  })

  it('shows the in-app notice even when OS notifications are off or not permitted', () => {
    const out = routeNotification(
      input({
        foreground: true,
        inAppWhenForeground: true,
        permission: 'denied',
        prefs: prefs({ osNotificationsEnabled: false }),
      }),
    )
    expect(out.show).toBe('in-app')
  })

  it.each(['denied', 'default', 'unsupported'] as const)(
    'does not post to the OS while permission is %s',
    (permission) => {
      expect(routeNotification(input({ permission })).show).toBeNull()
    },
  )

  it('does not post to the OS when OS notifications are switched off', () => {
    expect(
      routeNotification(input({ prefs: prefs({ osNotificationsEnabled: false }) })).show,
    ).toBeNull()
  })

  it('drops a category that is switched off globally', () => {
    const out = routeNotification(
      input({
        foreground: true,
        inAppWhenForeground: true,
        prefs: prefs({ categories: { ...DEFAULT_NOTIFICATION_PREFS.categories, git: false } }),
        category: 'git',
      }),
    )
    expect(out).toEqual({ show: null, sound: false, closeAfterMs: null })
  })

  it("lets the project's override switch a category off", () => {
    expect(routeNotification(input({ projectOverrides: { chat: false } })).show).toBeNull()
  })

  it("lets the project's override switch a globally-off category back on", () => {
    const out = routeNotification(
      input({
        prefs: prefs({ categories: { ...DEFAULT_NOTIFICATION_PREFS.categories, tests: false } }),
        projectOverrides: { tests: true },
        category: 'tests',
      }),
    )
    expect(out.show).toBe('os')
  })

  it('treats a category missing from the stored prefs as on', () => {
    const categories = { ...DEFAULT_NOTIFICATION_PREFS.categories } as Partial<
      NotificationPrefs['categories']
    >
    delete categories.storage
    const out = routeNotification(
      input({
        prefs: prefs({ categories: categories as NotificationPrefs['categories'] }),
        category: 'storage',
      }),
    )
    expect(out.show).toBe('os')
  })

  it('plays no sound when sounds are switched off', () => {
    expect(routeNotification(input({ prefs: prefs({ soundsEnabled: false }) }))).toEqual({
      show: 'os',
      sound: false,
      closeAfterMs: 5000,
    })
  })

  it('keeps a persistent notice open with no close time', () => {
    expect(
      routeNotification(input({ prefs: prefs({ displayDurationSeconds: 0 }) })).closeAfterMs,
    ).toBeNull()
  })

  it('closes after the chosen display duration', () => {
    expect(
      routeNotification(input({ prefs: prefs({ displayDurationSeconds: 10 }) })).closeAfterMs,
    ).toBe(10000)
  })
})
