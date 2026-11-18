import { useEffect, useRef, useState } from 'react'

import Alert from '../../primitives/Alert'

/** Internal Files player. The host supplies a signed URL, not an in-memory copy of the video. */
export default function VideoViewer({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    setFailed(false)
    video.src = src
    return () => {
      // Removing a player alone can leave its range request holding a server connection.
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-4">
      {failed && (
        <Alert>
          This video could not be played. Its format may not be supported by this browser.
        </Alert>
      )}
      <video
        ref={ref}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        className="min-h-0 w-full flex-1 bg-black object-contain"
        onError={() => setFailed(true)}
      >
        This browser does not support inline video.
      </video>
    </div>
  )
}
