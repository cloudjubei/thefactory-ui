import { VIDEO_MARK_TEXT, type ComposerVideoMarkRow } from '../../../headless'
import { IconFlag } from '../../icons'
import { Input } from '../../primitives/Input'
import VideoMarkStill from './VideoMarkStill'

export type ComposerVideoMarksProps = {
  rows: ComposerVideoMarkRow[]
  onNote: (key: string, note: string) => void
  onRemove: (key: string) => void
}

/** A video's marks waiting in the composer: each its still, time and note, and a way off. */
export default function ComposerVideoMarks({ rows, onNote, onRemove }: ComposerVideoMarksProps) {
  return (
    <ul className="flex w-[392px] max-w-full flex-col gap-1">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-0.5">
          <div
            className={[
              'flex items-center gap-2 rounded-md border bg-(--surface-overlay) px-1.5 py-1',
              row.refusal ? 'border-red-500/60' : 'border-(--border-subtle)',
            ].join(' ')}
          >
            <VideoMarkStill url={row.stillUrl} />
            <span className="inline-flex w-[52px] shrink-0 items-center gap-1 text-[12px] font-medium tabular-nums text-(--text-primary)">
              <IconFlag className="h-2.5 w-2.5 text-(--accent-primary)" />
              {row.time}
            </span>
            <Input
              size="sm"
              value={row.note}
              placeholder={VIDEO_MARK_TEXT.noteLabel}
              aria-label={VIDEO_MARK_TEXT.noteFor(row.time)}
              invalid={!!row.refusal}
              onChange={(event) => onNote(row.key, event.target.value)}
              className="h-[26px] min-w-0 flex-1 px-2 text-[12px]"
            />
            <button
              type="button"
              aria-label={VIDEO_MARK_TEXT.remove(row.time)}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[13px] leading-none opacity-60 hover:opacity-100"
              onClick={() => onRemove(row.key)}
            >
              ×
            </button>
          </div>
          {row.refusal ? (
            <span
              role="alert"
              className="px-1.5 text-[11px] leading-[15px] text-red-600 dark:text-red-400"
            >
              {row.refusal}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
