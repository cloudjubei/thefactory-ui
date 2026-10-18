import type { ScreensDecisionNote as ScreensDecisionNoteView } from '../../../headless'
import { IconEye, IconEyeOff } from '../../icons'

export type ScreensDecisionNoteProps = {
  note: ScreensDecisionNoteView
}

/**
 * Whether the story's change must be shown on screen, on its sign-off: the
 * need and what decided it — how its parts were judged, else its files —
 * naming the files users see a judgement left unshown. Native peer:
 * `native/compound/process/ScreensDecisionNote`.
 */
export default function ScreensDecisionNote({ note }: ScreensDecisionNoteProps) {
  const Icon = note.tone === 'not-needed' ? IconEyeOff : IconEye
  return (
    <div
      className="flex min-w-0 items-start gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-4 py-3 text-[12.5px]"
      title={note.disputedUiPaths.length > 0 ? note.disputedUiPaths.join('\n') : undefined}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 text-(--text-secondary)" />
      <span className="min-w-0">
        <span className="font-semibold text-(--text-primary)">{note.label}</span>
        <span className="text-(--text-secondary)"> — {note.reason}</span>
      </span>
    </div>
  )
}
