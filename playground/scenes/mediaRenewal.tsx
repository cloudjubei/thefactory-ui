import { useMemo, useRef, useState } from 'react'
import WalkthroughTab from '../../src/web/compound/chat/signoff/WalkthroughTab'
import { OnFixtures, type FixtureRoutes } from './onFixtures'
import { VIDEO_PROJECT, TRACE_TILE } from './beforeAfterVideoFixtures'

const VIDEO = new URL('./assets/proof-video-after.webm', import.meta.url).href

/** Interactive only: expiry is relative to each grant, never a wall-clock schedule.
 * The real hook renews eight seconds after each response (38s TTL minus its 30s margin).
 * Query variants are distinct playable URLs of the SAME bytes, not different recordings.
 */
export default function MediaRenewal() {
  const root = useRef<HTMLDivElement>(null)
  const [grant, setGrant] = useState(0)
  const [transport, setTransport] = useState('Not loaded')
  const [armed, setArmed] = useState(false)
  const [ready, setReady] = useState(false)
  const routes = useMemo<FixtureRoutes>(() => {
    let serial = 0
    return {
      'POST /api/v1/projects/{projectId}/review-evidence/{evidenceId}/media-url': ({
        evidenceId,
      }) => {
        if (evidenceId === 'trace-download')
          return {
            url: new URL('./assets/proof-trace.zip?no-inline', import.meta.url).href,
            expiresAt: '2999-01-01T00:00:00.000Z',
          }
        serial += 1
        setGrant(serial)
        return {
          url: `${VIDEO}?fixture-grant=${serial}`,
          expiresAt: new Date(Date.now() + 38_000).toISOString(),
        }
      },
    }
  }, [])
  const prepare = (playing: boolean) => {
    const video = root.current?.querySelector('video')
    if (!video || !Number.isFinite(video.duration)) return
    video.pause()
    video.currentTime = video.duration * 0.35
    // These bundled navigation clips are short. Slow real decoding rather than
    // looping (which would conceal a reset-to-zero regression).
    video.defaultPlaybackRate = 0.0625
    video.playbackRate = 0.0625
    if (playing) void video.play()
  }
  return (
    <div
      ref={root}
      className="flex flex-col gap-3 p-4 w-[720px] max-w-full"
      onLoadedMetadata={() => setReady(true)}
      onTimeUpdate={(event) => {
        const video = event.target as HTMLVideoElement
        setTransport(
          `${video.paused ? 'Paused' : 'Playing'} at ${video.currentTime.toFixed(2)}s / ${video.duration.toFixed(2)}s`,
        )
      }}
    >
      <h2>Signed URL renewal — real browser playback</h2>
      <p>
        Press Start, then Playing at 35% or Paused at 35%. The real media URL hook renews every 8
        seconds. Watch the grant number increase and the nonzero playhead stay put (paused) or
        advance (playing). Repeat the other mode. No loop, simulated media events, or real services.
      </p>
      <p>
        Playback is slowed to 1/16 speed because the bundled clip is short. Native host continuity
        and backend signing/Range are NOT proven here.
      </p>
      <button onClick={() => setArmed(true)} disabled={armed}>
        Start renewal exercise
      </button>
      <button onClick={() => prepare(true)} disabled={!ready}>
        Playing at 35%
      </button>
      <button onClick={() => prepare(false)} disabled={!ready}>
        Paused at 35%
      </button>
      <button
        onClick={async () => {
          // This fixture is synthetic and public. A data URL avoids Trace Viewer's
          // loopback-network restriction; no app recording is sent anywhere.
          const response = await fetch(
            new URL('./assets/proof-trace.zip?no-inline', import.meta.url).href,
          )
          const bytes = new Uint8Array(await response.arrayBuffer())
          const data = `data:application/zip;base64,${btoa(String.fromCharCode(...bytes))}`
          window.location.assign(`https://trace.playwright.dev/?trace=${encodeURIComponent(data)}`)
        }}
      >
        Inspect bundled synthetic trace in Playwright
      </button>
      <output aria-live="polite">
        Grant {grant} · {transport}
      </output>
      {armed ? (
        <OnFixtures routes={routes}>
          <WalkthroughTab
            projectId={VIDEO_PROJECT}
            recordings={[
              {
                ref: {
                  ...TRACE_TILE.ref,
                  id: 'renewal-video',
                  kind: 'recording',
                  mediaType: 'video/webm',
                  path: 'proof-video-after.webm',
                },
                caption: 'Renewal continuity — bundled navigation',
              },
              TRACE_TILE,
            ]}
          />
        </OnFixtures>
      ) : null}
    </div>
  )
}
