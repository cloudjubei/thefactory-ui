import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import {
  addVideoMark,
  removeVideoMark,
  setVideoMarkNote,
  videoAttachmentView,
  videoTimelineRowAt,
  videoTimelineView,
  type ChatVideoAttachments,
  type ChatVideoDigest,
  type ChatVideoMarkDraft,
  type ChatVideoMarks,
  type ChatVideoTimeline,
} from 'thefactory-ui/headless'
import ChatInput from '../../src/native/compound/chat/ChatInput'
import MessageRow from '../../src/native/compound/chat/MessageRow'
import SentVideoAttachment from '../../src/native/compound/chat/SentVideoAttachment'
import VideoTimelineScreen from '../../src/native/compound/chat/VideoTimelineScreen'
import { MediaHostProvider } from '../../src/native/compound/chat/signoff/MediaHostContext'
import type { InlineVideo, MediaHost } from '../../src/native/compound/chat/signoff/signoffTypes'
import type { ChatContext } from '../../src/headless/api'
import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
import { OnFixtures } from '../scenes/onFixtures'
import {
  COMPOSER_MARKS,
  SENT_MARKS,
  TIMELINE_VIDEO,
  TIMELINE_VIDEO_NAME,
  CHECKOUT_VIDEO_URL,
  videoUrlOf,
  TIMELINES,
} from '../scenes/videoTimelineFixtures'
import type { NativeView } from './views'

const noop = () => {}
const FAR_OFF = '2999-01-01T00:00:00.000Z'
const CONTEXT = { type: 'PROJECT', projectId: 'overseer' } as ChatContext
const POSTER =
  TIMELINES.checkout.entries[0]?.kind === 'still' ? TIMELINES.checkout.entries[0].url : ''

const DIGEST: ChatVideoDigest = {
  stage: 'ready',
  tokens: { overviewTokens: 2400, closerLookTokens: 600 },
  transcript: 'done',
  poster: 'stills/t-00m00.0s.jpg',
  durationSec: 16,
  sizeBytes: 9.8 * 1024 * 1024,
  width: 720,
  height: 405,
}

const TIMELINE_STATES: Record<string, ChatVideoTimeline> = {
  checkout: TIMELINES.checkout,
  'every-screen': TIMELINES.everyScreen,
  long: TIMELINES.long,
  'close-ups': TIMELINES.closeUps,
  'sounds-and-actions': TIMELINES.soundsAndActions,
  preparing: TIMELINES.preparing,
  failed: TIMELINES.failed,
  empty: TIMELINES.empty,
  'not-started': TIMELINES.notStarted,
}

/** The browser's own player standing in for the app's: it seeks, pauses and tells its time. */
function BrowserInlineVideo({ video }: { video: InlineVideo }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { handleRef, startAtSec, onMetadata, onPlayingChange, onTimeChange, onFailed } = video
  useEffect(() => {
    handleRef.current = {
      enterFullscreen: () => void ref.current?.requestFullscreen().catch(noop),
      seek: (atSec) => {
        if (!ref.current) return
        ref.current.currentTime = atSec
        void ref.current.play().catch(noop)
      },
      pause: () => ref.current?.pause(),
      time: () => ref.current?.currentTime ?? 0,
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef])
  return (
    <video
      ref={ref}
      src={video.uri}
      autoPlay
      muted
      playsInline
      controls
      style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
      onLoadedMetadata={({ currentTarget }) => {
        onMetadata({ width: currentTarget.videoWidth, height: currentTarget.videoHeight })
        if (startAtSec) currentTarget.currentTime = startAtSec
      }}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      onTimeUpdate={({ currentTarget }) => onTimeChange?.(currentTarget.currentTime)}
      onError={({ currentTarget }) => onFailed('load', currentTarget.currentTime)}
    />
  )
}

const PLAYER: MediaHost = {
  renderInlineVideo: (video) => <BrowserInlineVideo video={video} />,
}

const sourceOf = (url: string) => ({ video: async () => ({ url, expiresAt: FAR_OFF }) })

/** Presses play as a person would: a first tap shows the controls, the second plays. */
function Pressed({ children }: { children: ReactNode }) {
  useEffect(() => {
    const press = () =>
      document.querySelector<HTMLElement>(`[aria-label="Play ${TIMELINE_VIDEO_NAME}"]`)?.click()
    press()
    const timer = setTimeout(press, 0)
    return () => clearTimeout(timer)
  }, [])
  return <>{children}</>
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <OnFixtures>
      <MediaHostProvider value={PLAYER}>
        <ScrollView>
          <View style={{ padding: 16, width: 390, maxWidth: '100%', gap: 12 }}>{children}</View>
        </ScrollView>
      </MediaHostProvider>
    </OnFixtures>
  )
}

function TimelineCard({ timeline, markAt }: { timeline: ChatVideoTimeline; markAt?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <SentVideoAttachment
      name={TIMELINE_VIDEO_NAME}
      view={videoAttachmentView({
        ...DIGEST,
        durationSec: timeline.durationSec ?? DIGEST.durationSec,
      })}
      poster={{ uri: POSTER }}
      source={sourceOf(videoUrlOf(timeline))}
      timeline={videoTimelineView(timeline)}
      timelineOpen={open}
      onTimelineOpenChange={setOpen}
      onMark={noop}
      {...(markAt !== undefined ? { initialMarkSec: markAt } : {})}
    />
  )
}

function useMarks(initial: ChatVideoMarkDraft[]): ChatVideoMarks {
  const [items, setItems] = useState(initial)
  return useMemo(
    () => ({
      items,
      add: (mark) => setItems((now) => addVideoMark(now, mark)),
      setNote: (key, note) => setItems((now) => setVideoMarkNote(now, key, note)),
      remove: (key) => setItems((now) => removeVideoMark(now, key)),
    }),
    [items],
  )
}

const chatWith = (marks?: ChatVideoMarks): ChatVideoAttachments => ({
  context: CONTEXT,
  fixedDigests: { [TIMELINE_VIDEO]: DIGEST },
  fixedMedia: { [TIMELINE_VIDEO]: { video: CHECKOUT_VIDEO_URL, still: POSTER } },
  fixedTimelines: { [TIMELINE_VIDEO]: TIMELINES.checkout },
  ...(marks ? { marks } : {}),
})

function ComposerMarks({ state }: { state: keyof typeof COMPOSER_MARKS }) {
  const marks = useMarks(COMPOSER_MARKS[state])
  const [text, setText] = useState('Here is where it breaks')
  return (
    <ChatInput value={text} onChange={setText} onSend={noop} videoAttachments={chatWith(marks)} />
  )
}

const SENT: ChatMessageLike = {
  id: 'u1',
  role: 'user',
  content: 'Here is where it breaks',
  videoMarks: SENT_MARKS,
}

function SentMarks() {
  const marks = useMarks([])
  return (
    <MessageRow
      msg={SENT}
      globalIndex={0}
      totalMessages={1}
      isThinking={false}
      isLast
      prevUserMessagesLen={1}
      enhancedTotalLength={1}
      videoAttachments={chatWith(marks)}
    />
  )
}

const timelineOf = (state: string | null) =>
  TIMELINE_STATES[state ?? 'checkout'] ?? TIMELINES.checkout

/** The video timeline and marked moments on native, on fixed data: no network, no clock. */
export const VIDEO_TIMELINE_VIEWS: readonly NativeView[] = [
  {
    id: 'video-timeline-card',
    title: 'Video card with Timeline and flag',
    render: (address) => {
      const card = <TimelineCard timeline={TIMELINES.checkout} />
      return <Frame>{address.get('state') === 'playing' ? <Pressed>{card}</Pressed> : card}</Frame>
    },
  },
  {
    id: 'video-timeline-screen',
    title: 'Video timeline screen',
    render: (address) => {
      const view = videoTimelineView(timelineOf(address.get('state')))
      const playhead = view.state === 'rows' ? videoTimelineRowAt(view.rows, 13) : -1
      return (
        <VideoTimelineScreen
          isOpen
          name={TIMELINE_VIDEO_NAME}
          view={view}
          playheadIndex={playhead}
          onBack={noop}
          onPlayFrom={noop}
        />
      )
    },
  },
  {
    id: 'video-mark-sheet',
    title: 'Mark a moment',
    render: () => (
      <Frame>
        <Pressed>
          <TimelineCard timeline={TIMELINES.checkout} markAt={13} />
        </Pressed>
      </Frame>
    ),
  },
  {
    id: 'video-composer-marks',
    title: 'Marks in the composer',
    render: (address) => {
      const state = address.get('state') ?? 'one'
      const shown = (state in COMPOSER_MARKS ? state : 'one') as keyof typeof COMPOSER_MARKS
      return (
        <Frame>
          <ComposerMarks key={shown} state={shown} />
        </Frame>
      )
    },
  },
  {
    id: 'video-sent-marks',
    title: 'Marks on a sent message',
    render: () => (
      <Frame>
        <SentMarks />
      </Frame>
    ),
  },
]
