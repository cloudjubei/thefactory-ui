import type { UiImpactNote as UiImpactNoteView } from '../../../headless'
import { IconEye, IconEyeOff } from '../../icons'

export type UiImpactNoteProps = {
  note: UiImpactNoteView
}

/**
 * How an attempt judged whether its change alters what users see — "Shows on
 * screen" or "Nothing on screen", who judged it and why — or a code review's
 * view of it. Native peer: `native/compound/process/UiImpactNote`.
 */
export default function UiImpactNote({ note }: UiImpactNoteProps) {
  const Icon = note.tone === 'shows' ? IconEye : IconEyeOff
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2 text-[12px]">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-(--text-secondary)" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-(--text-primary)">
          <span className="font-semibold">{note.label}</span>
          {note.by ? <span className="text-(--text-secondary)"> · {note.by}</span> : null}
        </span>
        <span className="text-(--text-secondary)">{note.reason}</span>
      </div>
    </div>
  )
}
