import type { NavCurrentReply } from './appDeepLinkTypes'

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

function paramValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

/**
 * The deep-link an app reports as `overseer:nav.changed` (`{ view, params }`), or `null` when it
 * names no view. Number and boolean params become strings; route params, which the App tab's
 * read would drop, are dropped here too.
 */
export function parseAppDeepLink(payload: unknown): AppDeepLink | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  const rec = payload as Record<string, unknown>
  const view = typeof rec.view === 'string' ? rec.view.trim() : ''
  if (!view) return null
  const params: Record<string, string> = {}
  const raw = rec.params
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (ROUTE_PARAM_KEYS.has(key)) continue
      const v = paramValue(value)
      if (v !== undefined) params[key] = v
    }
  }
  return { view, params }
}

/** The App tab's query for a deep-link — `view` and its params — encoded as {@link appDeepLinkFromParams} reads it. */
export function appDeepLinkQuery(dl: AppDeepLink): Record<string, string> {
  const query: Record<string, string> = { view: dl.view }
  for (const [key, value] of Object.entries(dl.params)) {
    if (!ROUTE_PARAM_KEYS.has(key)) query[key] = value
  }
  return query
}

/**
 * The route-param patch that moves a screen from its `current` params to deep-link `dl` (expo-router's
 * `setParams` merges, so a param the new deep-link lacks is cleared with `undefined`). Route params stay.
 */
export function appDeepLinkParamsPatch(
  current: Record<string, string | string[] | undefined>,
  dl: AppDeepLink,
): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = appDeepLinkQuery(dl)
  for (const key of Object.keys(current)) {
    if (!ROUTE_PARAM_KEYS.has(key) && !(key in next)) next[key] = undefined
  }
  return next
}

/** The `nav.current` answer: the deep-link, when there is one, with the absolute Overseer URL of the app's route. */
export function navCurrentReply(
  deepLink: AppDeepLink | null | undefined,
  appUrl: string,
): NavCurrentReply {
  return deepLink ? { view: deepLink.view, params: deepLink.params, appUrl } : { appUrl }
}
