import { formatBytes } from './path'
import {
  PROCESS_TRY_BUILD_COPY,
  PROCESS_TRY_BUILD_LINK_REFRESH_LEAD_MS,
  PROCESS_TRY_BUILD_REFRESH_FLOOR_MS,
} from './processTryBuildViewConstants'
import type {
  ProcessTryBuildCheckRow,
  ProcessTryBuildDisplay,
  ProcessTryBuildDownload,
  ProcessTryBuildStatus,
  ProcessTryBuildTone,
  ProcessTryBuildView,
} from './processTryBuildViewTypes'

const TONES: Record<ProcessTryBuildStatus, ProcessTryBuildTone> = {
  building: 'working',
  ready: 'done',
  failed: 'stuck',
  unavailable: 'muted',
}

const HEADLINES: Record<ProcessTryBuildStatus, string> = {
  building: PROCESS_TRY_BUILD_COPY.building,
  ready: PROCESS_TRY_BUILD_COPY.ready,
  failed: PROCESS_TRY_BUILD_COPY.failed,
  unavailable: PROCESS_TRY_BUILD_COPY.unavailable,
}

function expiryOf(view: ProcessTryBuildView): number | undefined {
  if (!view.expiresAt) return undefined
  const at = Date.parse(view.expiresAt)
  return Number.isNaN(at) ? undefined : at
}

function joinApi(apiBase: string | null | undefined, url: string): string {
  if (/^https?:\/\//.test(url) || !apiBase) return url
  return `${apiBase.replace(/\/+$/, '')}${url}`
}

function detailOf(view: ProcessTryBuildView, status: ProcessTryBuildStatus): string | undefined {
  if (status === 'failed') return view.reason?.trim() || PROCESS_TRY_BUILD_COPY.failedNoReason
  if (status === 'unavailable') return view.reason?.trim() || undefined
  const size = status === 'ready' ? formatBytes(view.bytes) : null
  const parts = [view.variant, view.builtFrom, size].filter((p): p is string => !!p)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function downloadOf(
  view: ProcessTryBuildView,
  apiBase: string | null | undefined,
): ProcessTryBuildDownload | undefined {
  if (!view.downloadUrl) return undefined
  const expiresAt = expiryOf(view)
  return {
    href: joinApi(apiBase, view.downloadUrl),
    label: PROCESS_TRY_BUILD_COPY.download,
    ...(view.fileName ? { fileName: view.fileName } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  }
}

function checkRows(view: ProcessTryBuildView): ProcessTryBuildCheckRow[] {
  return view.steps.map((check) => ({
    title: check.title,
    ...(check.open ? { openLine: PROCESS_TRY_BUILD_COPY.open(check.open) } : {}),
    steps: check.steps,
  }))
}

/**
 * The "Try it on your phone" block from the run's try-build answer: where the build is, the
 * download and the QR once it is ready, what to check on the phone and that it runs on the
 * person's own test account. `undefined` when the run offers no phone build.
 */
export function processTryBuildDisplay(
  view: ProcessTryBuildView | undefined,
  apiBase: string | null | undefined,
): ProcessTryBuildDisplay | undefined {
  if (!view?.offered) return undefined
  const status = view.status ?? 'building'
  const usable = status === 'building' || status === 'ready'
  const download = status === 'ready' ? downloadOf(view, apiBase) : undefined
  const detail = detailOf(view, status)
  return {
    title: PROCESS_TRY_BUILD_COPY.title,
    tone: TONES[status],
    headline: HEADLINES[status],
    ...(detail ? { detail } : {}),
    ...(download ? { download } : {}),
    ...(download && view.phoneUrl
      ? { qr: { value: view.phoneUrl, caption: PROCESS_TRY_BUILD_COPY.scanCaption } }
      : {}),
    stepsTitle: PROCESS_TRY_BUILD_COPY.stepsTitle,
    checks: usable ? checkRows(view) : [],
    ...(usable ? { accountNote: PROCESS_TRY_BUILD_COPY.accountNote } : {}),
  }
}

/** Whether the download's signed link has stopped working by `now`. */
export function processTryBuildLinkExpired(
  download: ProcessTryBuildDownload | undefined,
  now: number,
): boolean {
  return download?.expiresAt !== undefined && now >= download.expiresAt
}

/**
 * How long to wait before reading the answer again so its links stay fresh: a little before they
 * stop working, and never sooner than a short floor. `undefined` while there are no links to keep.
 */
export function processTryBuildRefreshDelay(
  view: ProcessTryBuildView | undefined,
  now: number,
): number | undefined {
  if (!view?.offered || view.status !== 'ready') return undefined
  const at = expiryOf(view)
  if (at === undefined) return undefined
  return Math.max(
    PROCESS_TRY_BUILD_REFRESH_FLOOR_MS,
    at - now - PROCESS_TRY_BUILD_LINK_REFRESH_LEAD_MS,
  )
}
