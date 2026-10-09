import { storageUsageBreakdown } from '../../../headless'
import type { ProjectStorageUsage } from '../../../headless/api'

/** A project's usage by store — design, run proof, UI tests, mobile tests. */
export default function StorageUsageRows({ usage }: { usage: ProjectStorageUsage }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-[12px]">
      {storageUsageBreakdown(usage).map((row) => (
        <div key={row.key} className="contents">
          <dt className="text-(--text-secondary)">{row.label}</dt>
          <dd className="text-right tabular-nums text-(--text-primary)">{row.size}</dd>
        </div>
      ))}
    </dl>
  )
}
