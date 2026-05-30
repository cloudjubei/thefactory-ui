import type { CSSProperties, ReactNode } from 'react'

export type ProjectAppViewProps = {
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying iframe — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /** Rendered when `url` is `undefined` (e.g. token still being granted, or project has no preview yet). */
  fallback?: ReactNode
  className?: string
  style?: CSSProperties
  /** Forwarded to the iframe; defaults to a descriptive a11y title. */
  title?: string
}

/**
 * Web peer for the App-view surface. Renders the project's current files
 * inside a sandboxed iframe. The iframe is intentionally cross-origin
 * (`sandbox="allow-scripts"` without `allow-same-origin`) so the embedded
 * App cannot reach the host window's state — communication will go
 * through the `postMessage` bridge if/when that ships (designed but not
 * built in v1; see the financial-planner plan §A "Deferred integration
 * seams").
 */
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  className,
  style,
  title = 'Project app view',
}: ProjectAppViewProps) {
  if (!url) {
    return (
      <div className={className} style={style}>
        {fallback ?? null}
      </div>
    )
  }
  return (
    <iframe
      key={remountKey}
      src={url}
      sandbox="allow-scripts allow-same-origin"
      className={className}
      style={{ border: 0, width: '100%', height: '100%', ...style }}
      title={title}
    />
  )
}
