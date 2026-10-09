import { STORAGE_WARNING_TEXT, formatBytes, useProjects, useStorageUsage } from '../../../headless'
import StorageUsageRows from '../design/StorageUsageRows'

/**
 * What every project keeps on this machine outside git, read-only: the total
 * against the warning threshold, and each project's usage by store.
 */
export default function StorageUsageSettings() {
  const { totals, error } = useStorageUsage()
  const { projects } = useProjects()
  const nameOf = (id: string) => {
    const p = projects.find((x) => x.id === id)
    return p?.overrides?.title ?? p?.title ?? id
  }
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{STORAGE_WARNING_TEXT.settingsTitle}</h2>
        <p className="text-sm text-(--text-secondary)">{STORAGE_WARNING_TEXT.settingsBody}</p>
      </header>
      {error && !totals ? (
        <p className="text-sm text-(--status-stuck-soft-fg)">{error.message}</p>
      ) : !totals ? (
        <p className="text-sm text-(--text-muted)">Reading…</p>
      ) : (
        <>
          <p className="text-sm text-(--text-primary)">
            All projects: <span className="font-semibold">{formatBytes(totals.totalBytes)}</span> of{' '}
            {formatBytes(totals.thresholdBytes)}
            {totals.over ? (
              <span className="ml-2 text-(--status-working-soft-fg)">
                {STORAGE_WARNING_TEXT.body}
              </span>
            ) : null}
          </p>
          <ul className="flex flex-col gap-3">
            {[...totals.projects]
              .sort((a, b) => b.usage.totalBytes - a.usage.totalBytes)
              .map(({ projectId, usage }) => (
                <li
                  key={projectId}
                  className="flex max-w-md flex-col gap-1 rounded-md border border-(--border-subtle) px-3 py-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-(--text-primary)">{nameOf(projectId)}</span>
                    <span className="tabular-nums text-(--text-secondary)">
                      {formatBytes(usage.totalBytes)}
                    </span>
                  </div>
                  <StorageUsageRows usage={usage} />
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  )
}
