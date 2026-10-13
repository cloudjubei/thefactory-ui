import { describe, expect, it } from 'vitest'

import { BADGE_COLORS, DEFAULT_NOTIFICATION_PREFS } from './settings'

describe('badge colours', () => {
  it('offers purple alongside the channel colours', () => {
    expect(BADGE_COLORS).toEqual(['red', 'blue', 'green', 'orange', 'purple'])
  })

  it('keeps red for something broke: no channel starts out red', () => {
    expect(Object.values(DEFAULT_NOTIFICATION_PREFS.badgeColors)).not.toContain('red')
    expect(DEFAULT_NOTIFICATION_PREFS.badgeColors.activity).toBe('purple')
  })

  it('starts the channels on their own colours: processes green, chat blue, git orange', () => {
    expect(DEFAULT_NOTIFICATION_PREFS.badgeColors).toMatchObject({
      processes: 'green',
      chat: 'blue',
      git: 'orange',
    })
  })
})
