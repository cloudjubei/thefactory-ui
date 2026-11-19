import { IconVideo } from '../../icons'

/** The still a mark is shown by, 48 by 28; the video's glyph until the timeline is read. */
export default function VideoMarkStill({ url }: { url: string | undefined }) {
  return (
    <span className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--surface-muted) text-(--text-muted)">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <IconVideo className="h-3.5 w-3.5" />
      )}
    </span>
  )
}
