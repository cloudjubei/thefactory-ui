export type BranchChipType = 'local' | 'remote' | 'current' | 'same' | 'updated' | 'story'

const TYPE_CLASS: Record<BranchChipType, string> = {
  local: 'badge--empty',
  remote: 'badge--working',
  current: 'badge--done',
  same: 'badge--empty',
  updated: 'badge--review',
  story: 'badge--queued',
}

const DEFAULT_LABEL: Record<BranchChipType, string> = {
  local: 'Local',
  remote: 'Remote',
  current: 'Current',
  same: 'Same',
  updated: 'Updated',
  story: 'Story',
}

export type BranchChipProps = {
  type: BranchChipType
  label?: string
  size?: 'sm' | 'xs'
  className?: string
}

export function BranchChip({ type, label, size = 'sm', className = '' }: BranchChipProps) {
  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'

  return (
    <span
      className={`badge badge--soft ${TYPE_CLASS[type]} ${sizeClass} leading-none font-medium ${className}`}
    >
      {label ?? DEFAULT_LABEL[type]}
    </span>
  )
}
