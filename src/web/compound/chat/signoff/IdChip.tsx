import type { ReactNode } from 'react'

export type IdChipProps = {
  /** A story id is blue, a feature id green — the same scoping colour everywhere. */
  kind: 'story' | 'feature'
  children: ReactNode
}

const TINT: Record<IdChipProps['kind'], string> = {
  story:
    'border-blue-800/70 text-blue-800 bg-blue-800/[0.06] dark:border-blue-400/55 dark:text-blue-400',
  feature:
    'border-emerald-800/70 text-emerald-800 bg-emerald-800/[0.06] dark:border-emerald-400/55 dark:text-emerald-400',
}

/** The compact story/feature id bubble — the product `.id-chip`, scope-tinted. */
export default function IdChip({ kind, children }: IdChipProps) {
  return <span className={`id-chip max-w-full truncate ${TINT[kind]}`}>{children}</span>
}
