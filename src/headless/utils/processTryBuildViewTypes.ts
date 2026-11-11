/** Where a run's phone build is: still building, ready to install, failed, or not made for this app. */
export type ProcessTryBuildStatus = 'building' | 'ready' | 'failed' | 'unavailable'

/** One thing to repeat on the phone: where to start and the steps. */
export type ProcessTryBuildCheck = {
  title: string
  /** The screen or page to start from. */
  open?: string
  steps: string[]
}

/**
 * `GET /api/v1/process-runs/:runId/try-build`: the run's head built in the app's everyday
 * variant, for the person to try on their own device. Written by hand until the SDK is generated.
 */
export type ProcessTryBuildView = {
  runId: string
  /** `false` hides the block entirely. */
  offered: boolean
  /** Present when offered. */
  status?: ProcessTryBuildStatus
  /** Why it failed, or why there is no phone build. */
  reason?: string
  /** The app variant built, e.g. `covisionTestDebug`. */
  variant?: string
  /** The short commit it was built from. */
  builtFrom?: string
  startedAt?: number
  finishedAt?: number
  fileName?: string
  bytes?: number
  /** Relative to the API base, already carrying a short-lived signed token. */
  downloadUrl?: string
  /** An absolute URL a phone on the same Wi-Fi can open; absent when the backend is not reachable from it. */
  phoneUrl?: string
  /** ISO time the links stop working; read the view again for fresh ones. */
  expiresAt?: string
  steps: ProcessTryBuildCheck[]
}

/** The colour the block's status line reads in. */
export type ProcessTryBuildTone = 'working' | 'done' | 'stuck' | 'muted'

/** The block's download button. */
export type ProcessTryBuildDownload = {
  /** Absolute when the API base is known. */
  href: string
  label: string
  fileName?: string
  /** When the link stops working, in ms epoch. */
  expiresAt?: number
}

/** One thing to check on the phone, ready to show. */
export type ProcessTryBuildCheckRow = {
  title: string
  /** "Open: Settings → Account". */
  openLine?: string
  steps: string[]
}

/** The "Try it on your phone" block as web and native both draw it. */
export type ProcessTryBuildDisplay = {
  title: string
  tone: ProcessTryBuildTone
  /** "Building the app…", "Ready to install", … */
  headline: string
  /** Variant, commit and size; or why it failed or is not made. */
  detail?: string
  download?: ProcessTryBuildDownload
  /** What a QR code carries, with its caption; web only. */
  qr?: { value: string; caption: string }
  stepsTitle: string
  checks: ProcessTryBuildCheckRow[]
  /** That it runs on the person's own test account. */
  accountNote?: string
}
