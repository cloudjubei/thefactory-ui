/** A deep-link target for an embedded app view (F.2 app link), resolved from the App tab's route params. */
export interface AppDeepLink {
  view: string
  params: Record<string, string>
}

/**
 * Route param keys that are NOT part of the app deep-link — the `view` field itself plus the path
 * params expo-router merges into `useLocalSearchParams` (web's `useSearchParams` carries only the query,
 * so these are harmless there).
 */
const ROUTE_PARAM_KEYS = new Set([
  'view',
  'projectId',
  'tab',
  'contextPath',
  'contextKey',
  'groupId',
])

/**
 * Extract the app deep-link ({@link AppDeepLink}) from the App tab's route params — the `?view=<v>&…`
 * an F.2 `app` resource link navigates to. Returns `undefined` when no `view` is present. Values may be
 * arrays (expo-router) — the first is taken. Pure, so it is shared by the web/desktop `useSearchParams`
 * path and the mobile `useLocalSearchParams` path via the `nav.current` bridge handler.
 */
export function appDeepLinkFromParams(
  params: Record<string, string | string[] | undefined>,
): AppDeepLink | undefined {
  const view = firstValue(params.view)
  if (!view) return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (ROUTE_PARAM_KEYS.has(key)) continue
    const v = firstValue(value)
    if (v !== undefined) out[key] = v
  }
  return { view, params: out }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : undefined
  return value ? value : undefined
}

/**
 * A stable string key for an {@link AppDeepLink} — its `view` plus params sorted by key — so a push effect
 * can diff deep-links by VALUE, not object identity (expo-router route-param objects churn identity each
 * render). `null` / `undefined` / a view-less link ⇒ the empty key `''`.
 */
export function serializeAppDeepLink(dl: AppDeepLink | null | undefined): string {
  if (!dl || !dl.view) return ''
  const params = dl.params || {}
  const parts = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
  return [dl.view, ...parts].join('&')
}

/**
 * Whether a host→app deep-link PUSH should fire. Only when a PRIOR value already existed (`prev !== null`)
 * AND it genuinely changed. `prev === null` marks the un-initialised mount/remount baseline — no push there,
 * because a freshly-mounted app re-PULLs `nav.current` at boot (pushing then would race the listener). Pure,
 * for the {@link ProjectAppView} push effect.
 */
export function shouldPushDeepLink(prev: string | null, next: string): boolean {
  return prev !== null && prev !== next
}
