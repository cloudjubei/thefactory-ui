import { useState } from 'react'
import { STORAGE_WARNING_TEXT, storageUsageFraction, storageUsageSummary } from '../../../headless'
import type { GetProjectStorageUsageResponse } from '../../../headless/api'
import { IconWarningTriangle } from '../../icons'
import Tooltip from '../../primitives/Tooltip'
import StorageUsageRows from './StorageUsageRows'

export type DesignStorageMeterProps = {
  /** The project's usage with how every project's total stands; `undefined` until read. */
  usage: GetProjectStorageUsageResponse | undefined
}

/** The Design tab's usage meter: the project, then every project against the threshold. */
export function DesignStorageMeter({ usage }: DesignStorageMeterProps) {
  if (!usage) return null
  const fraction = Math.min(1, storageUsageFraction(usage.standing))
  return (
    <Tooltip
      placement="bottom"
      content={
        <div className="flex min-w-56 flex-col gap-2 text-[12px]">
          <span className="font-semibold text-(--text-primary)">This project</span>
          <StorageUsageRows usage={usage.usage} />
        </div>
      }
    >
      <span className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
        <span
          className="relative h-1.5 w-20 overflow-hidden rounded-full bg-(--surface-muted)"
          aria-hidden="true"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.round(fraction * 100)}%`,
              background: usage.standing.over
                ? 'var(--status-working-soft-fg)'
                : 'var(--accent-primary)',
            }}
          />
        </span>
        {storageUsageSummary(usage)}
      </span>
    </Tooltip>
  )
}

/** The banner shown while every project's total is past the threshold, with what uses it. */
export function DesignStorageWarning({ usage }: DesignStorageMeterProps) {
  const [open, setOpen] = useState(false)
  if (!usage?.standing.over) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border px-3 py-2 text-[12.5px]"
      style={{
        background: 'var(--status-working-soft-bg)',
        borderColor: 'var(--status-working-soft-border)',
        color: 'var(--status-working-soft-fg)',
      }}
    >
      <div className="flex items-start gap-2">
        <IconWarningTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {storageUsageSummary(usage)}. {STORAGE_WARNING_TEXT.body}
        </span>
        <button type="button" className="shrink-0 underline" onClick={() => setOpen((v) => !v)}>
          {open ? STORAGE_WARNING_TEXT.hideBreakdown : STORAGE_WARNING_TEXT.showBreakdown}
        </button>
      </div>
      {open ? (
        <div className="max-w-sm pl-6 text-(--text-primary)">
          <StorageUsageRows usage={usage.usage} />
        </div>
      ) : null}
    </div>
  )
}
