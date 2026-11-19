import { VIDEO_MARK_TEXT, type SentVideoMarkRow } from '../../../headless'
import VideoMarkStill from './VideoMarkStill'

export type SentVideoMarksProps = {
  name: string
  rows: SentVideoMarkRow[]
  onPlay: (atSec: number) => void
}

/** A sent message's marks on a video, under it and as wide as its card: each plays the video from its moment. */
export default function SentVideoMarks({ name, rows, onPlay }: SentVideoMarksProps) {
  return (
    <ul className="flex w-0 min-w-full flex-col gap-1">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            aria-label={VIDEO_MARK_TEXT.play(name, row.time)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-overlay) px-1.5 py-1 text-left hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
            onClick={() => onPlay(row.timeSec)}
          >
            <VideoMarkStill url={row.stillUrl} />
            <span className="w-10 shrink-0 text-[12px] font-medium tabular-nums text-(--accent-primary)">
              {row.time}
            </span>
            <span
              className={[
                'min-w-0 text-[12px] break-words',
                row.hasNote ? 'text-(--text-secondary)' : 'text-(--text-muted)',
              ].join(' ')}
            >
              {row.note}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
