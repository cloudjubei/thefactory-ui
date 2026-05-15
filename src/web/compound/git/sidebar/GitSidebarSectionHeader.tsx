import type { ReactNode } from 'react'
import { IconChevronDown } from '../../../icons'

export type GitSidebarSectionHeaderProps = {
  label: string
  icon: ReactNode
  open: boolean
  onToggle: () => void
}

export default function GitSidebarSectionHeader({
  label,
  icon,
  open,
  onToggle,
}: GitSidebarSectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left select-none hover:bg-(--surface-muted) transition-colors rounded"
    >
      <IconChevronDown
        className={`shrink-0 w-3.5 h-3.5 transition-transform text-(--text-muted) ${open ? '' : '-rotate-90'}`}
      />
      <span className="w-3.5 h-3.5 flex items-center justify-center text-(--text-muted)">
        {icon}
      </span>
      <span className="text-[11px] font-semibold tracking-wide uppercase text-(--text-secondary)">
        {label}
      </span>
    </button>
  )
}
