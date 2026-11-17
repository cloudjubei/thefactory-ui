import type { FixtureRoutes } from './onFixtures'

/** Each mount starts off (or at the named stored choice); writes settle immediately and persist for that mount. */
export function chatMessagingRoutes(initial = false, failSave = false): FixtureRoutes {
  let value = { allowWithoutAsking: initial }
  return {
    '/api/v1/settings/{key}': ({ key }) => ({ key, value: key === 'chatMessaging' ? value : null }),
    'PUT /api/v1/settings/{key}': ({ key }, _query, body) => {
      if (failSave) throw new Error('Messaging setting save failed')
      const next = body as { value: { allowWithoutAsking: boolean } }
      value = next.value
      return { key, value }
    },
  }
}
