import { useState, type ReactNode } from 'react'
import { TOOL_STEPS_LABEL } from '../../../headless/utils/toolStepGroupsConstants'
import { IconChevron } from '../../icons'

export type ToolStepsFoldProps = {
  /** How many tool-call rows this line stands for. */
  count: number
  /** Those rows, shown once the line is opened. */
  children: ReactNode
}

/**
 * Consecutive tool-call rows drawn as one "N steps" line. Closed until the
 * line is clicked, then the rows it stands for.
 */
export default function ToolStepsFold({ count, children }: ToolStepsFoldProps) {
  const [open, setOpen] = useState(false)
  const label = TOOL_STEPS_LABEL(count)
  return (
    <div className="w-full">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-overlay) px-3 py-1.5 text-left text-[13px] text-(--text-secondary) hover:text-(--text-primary)"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <IconChevron
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
        />
        <span className="font-medium">{label}</span>
      </button>
      {open ? <div className="mt-1.5 flex flex-col gap-1.5">{children}</div> : null}
    </div>
  )
}
