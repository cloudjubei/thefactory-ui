import type { CliImageVersion } from '../../../headless/contexts/CliConfigsContext'

const BADGE = 'text-[11px] px-1.5 py-0.5 rounded'

export type CliImageVersionChipProps = {
  version: CliImageVersion | undefined
  loading: boolean
}

export function CliImageVersionChip({ version, loading }: CliImageVersionChipProps) {
  if (!version) {
    return (
      <span className={`${BADGE} bg-(--surface-muted) text-(--text-secondary)`}>
        {loading ? 'Version…' : 'Version unknown'}
      </span>
    )
  }
  if (version.state === 'updating') {
    return (
      <span className={`${BADGE} bg-(--surface-muted) text-(--text-secondary)`}>
        Building {version.update?.targetVersion ?? ''}…
      </span>
    )
  }
  if (version.state === 'not-built') {
    return (
      <span className={`${BADGE} bg-red-500/10 text-red-500`} title={version.detail ?? ''}>
        Not built
      </span>
    )
  }
  if (version.state === 'update-available') {
    return (
      <span
        className={`${BADGE} bg-amber-500/10 text-amber-600`}
        title={`Newest published: ${version.latest ?? ''}`}
      >
        {version.installed} → {version.latest}
      </span>
    )
  }
  if (version.state === 'up-to-date') {
    return (
      <span
        className={`${BADGE} bg-(--surface-muted) text-(--text-secondary)`}
        title={`Up to date — checked ${version.latestCheckedAt ?? 'never'}`}
      >
        {version.installed}
      </span>
    )
  }
  return (
    <span
      className={`${BADGE} bg-(--surface-muted) text-(--text-secondary)`}
      title={version.detail ?? ''}
    >
      {version.installed ? `${version.installed} · update status unknown` : 'Version unknown'}
    </span>
  )
}
