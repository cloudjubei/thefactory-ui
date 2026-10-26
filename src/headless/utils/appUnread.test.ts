import { describe, expect, it } from 'vitest'
import { APP_UNREAD_TYPE } from 'thefactory-tools/constants'
import { appProjectIds, appUnreadChangeScope } from './appUnread'

describe('appUnreadChangeScope', () => {
  it('names the project whose app’s unread items changed', () => {
    expect(
      appUnreadChangeScope({ action: 'deleted', scope: 'refs', type: APP_UNREAD_TYPE, key: 's' }),
    ).toBe('refs')
  })

  it('is none for a change to any other record', () => {
    expect(appUnreadChangeScope({ scope: 'refs', type: 'vendored-copy' })).toBeUndefined()
  })

  it('is none for an event that names no project', () => {
    for (const payload of [
      { type: APP_UNREAD_TYPE },
      { type: APP_UNREAD_TYPE, scope: '' },
      { type: APP_UNREAD_TYPE, scope: 7 },
      undefined,
      'data',
    ]) {
      expect(appUnreadChangeScope(payload)).toBeUndefined()
    }
  })
})

describe('appProjectIds', () => {
  it('keeps the projects that declare an app', () => {
    expect(
      appProjectIds([
        { id: 'refs', metadata: { hasApp: true } },
        { id: 'tools', metadata: { hasApp: false } },
        { id: 'web', metadata: { hasApp: 'yes' } },
        { id: 'db' },
      ]),
    ).toEqual(['refs'])
  })
})
