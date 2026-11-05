import { useEffect, useRef, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AuthProvider,
  fixedChatUploads,
  videoAttachmentView,
  type ChatAttachmentUpload,
  type ChatVideoAttachments,
  type ChatVideoDigest,
} from 'thefactory-ui/headless'
import { ChatInput, MessageRow } from 'thefactory-ui/web'
import type { ChatContext } from '../../src/headless/api'
import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
// Not on the package's public surface: the composer and the message draw these themselves. The
// showcase reaches into the source to draw each state, as the playground renders from source.
import ChatUploadStrip from '../../src/web/compound/chat/ChatUploadStrip'
import SentVideoAttachment from '../../src/web/compound/chat/SentVideoAttachment'
import VideoAttachmentCard from '../../src/web/compound/chat/VideoAttachmentCard'
import VideoCostChip from '../../src/web/compound/chat/VideoCostChip'
import VideoDetailsPanel from '../../src/web/compound/chat/VideoDetailsPanel'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}

const CONTEXT = { type: 'PROJECT', projectId: 'overseer' } as ChatContext
const VIDEO = '.factory/attachments/3f2a9c1d0b7e4a51/8c1d2e3f4a5b-checkout-bug.mov'
const NAME = 'checkout-bug.mov'
const LARGE = 'site-walkthrough.mp4'
const MB = 1024 * 1024
const GB = 1024 * MB
const FIGURES = { overviewTokens: 6200, closerLookTokens: 1600 }
const ROUGH_FIGURES = { overviewTokens: 8700, closerLookTokens: 1600 }
const QUIET_FIGURES = { overviewTokens: 5300, closerLookTokens: 1600 }
const FACTS = { durationSec: 252, sizeBytes: 186 * MB }

const POSTER_ART = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#1f2937"/><rect x="8" y="8" width="144" height="74" rx="3" fill="#f3f4f6"/><rect x="8" y="8" width="144" height="10" fill="#0073ea"/><rect x="16" y="26" width="60" height="6" rx="2" fill="#9ca3af"/><rect x="16" y="38" width="90" height="6" rx="2" fill="#d1d5db"/><rect x="16" y="50" width="74" height="6" rx="2" fill="#d1d5db"/><rect x="110" y="56" width="34" height="16" rx="3" fill="#00a862"/></svg>`
const POSTER = `data:image/svg+xml;utf8,${encodeURIComponent(POSTER_ART)}`
const POSTER_PATH = '.factory/video-digests/3f2a/stills/t-00m00.0s.jpg'
const previewUrl = async () => POSTER
const LANDSCAPE_VIDEO = new URL('./assets/sample-landscape.webm', import.meta.url).href
const PORTRAIT_VIDEO = new URL('./assets/sample-portrait.webm', import.meta.url).href
const NOT_A_VIDEO = 'data:video/mp4;base64,AAAAAAAA'
const FAR_OFF = '2999-01-01T00:00:00.000Z'
const LANDSCAPE = { width: 640, height: 360 }
const PORTRAIT = { width: 270, height: 480 }

const STATES: Record<string, ChatVideoDigest> = {
  checking: { stage: 'probing', ...FACTS },
  frames: { stage: 'picking-frames', percent: 42, tokens: ROUGH_FIGURES, ...FACTS },
  sheets: { stage: 'making-sheets', percent: 60, tokens: ROUGH_FIGURES, ...FACTS },
  transcribing: {
    stage: 'transcribing',
    percent: 18,
    tokens: ROUGH_FIGURES,
    poster: POSTER_PATH,
    ...FACTS,
  },
  ready: { stage: 'ready', tokens: FIGURES, transcript: 'done', poster: POSTER_PATH, ...FACTS },
  noAudio: {
    stage: 'ready',
    tokens: QUIET_FIGURES,
    transcript: 'no-audio',
    poster: POSTER_PATH,
    ...FACTS,
  },
  noSpeech: {
    stage: 'ready',
    tokens: QUIET_FIGURES,
    transcript: 'no-speech',
    poster: POSTER_PATH,
    ...FACTS,
  },
  notSetUp: {
    stage: 'ready',
    tokens: QUIET_FIGURES,
    transcript: 'not-set-up',
    poster: POSTER_PATH,
    ...FACTS,
  },
  transcriptFailed: {
    stage: 'ready',
    tokens: QUIET_FIGURES,
    transcript: 'failed',
    poster: POSTER_PATH,
    ...FACTS,
  },
  noFfmpeg: {
    stage: 'failed',
    reason: 'ffmpeg is not installed on this machine, so the video cannot be read.',
    ...FACTS,
  },
  unreadable: {
    stage: 'failed',
    reason: 'This file has no video that can be read.',
    sizeBytes: 186 * MB,
  },
  timedOut: { stage: 'failed', reason: 'Reading this video took too long.', ...FACTS },
}

const TITLES: Record<string, [string, string]> = {
  checking: ['Checking', 'Just uploaded: the stage alone, no percent or cost yet.'],
  frames: ['Picking frames', 'One line, stage and percent; the first figure, marked rough.'],
  sheets: ['Making sheets', 'The same line, later stage.'],
  transcribing: ['Transcribing', 'The first still has become the poster.'],
  ready: ['Ready', 'The cost chip: the neutral pill with the green dot, opening its details.'],
  noAudio: ['No audio', 'Ready, with a plain note: nothing is wrong.'],
  noSpeech: ['No speech heard', 'Ready, with a plain note: nothing is wrong.'],
  notSetUp: ['No transcript: not set up', 'Warned, with the link to setup, as setup can fix it.'],
  transcriptFailed: ['Transcript failed', 'Warned, with no link: setup cannot fix it.'],
  noFfmpeg: ['Failed: no ffmpeg', 'The reason and the link to setup.'],
  unreadable: ['Failed: not a video', 'The reason, no link: setup cannot fix a bad file.'],
  timedOut: ['Failed: took too long', 'The reason, no link.'],
}

const posterUrl = (digest: ChatVideoDigest) => (digest.poster ? POSTER : null)

const sourceOf = (url: string) => ({ video: async () => ({ url, expiresAt: FAR_OFF }) })

function Card({ digest, retry }: { digest: ChatVideoDigest; retry?: boolean }) {
  return (
    <VideoAttachmentCard
      name={NAME}
      view={videoAttachmentView(digest)}
      posterUrl={posterUrl(digest)}
      onRemove={noop}
      onOpenSetup={noop}
      {...(retry ? { onRetry: noop } : {})}
    />
  )
}

function Tile({ digest }: { digest: ChatVideoDigest }) {
  return (
    <SentVideoAttachment
      name={NAME}
      view={videoAttachmentView(digest)}
      posterUrl={posterUrl(digest)}
      source={sourceOf(LANDSCAPE_VIDEO)}
      onOpenSetup={noop}
    />
  )
}

/** Signed out with no backend: a chip reads its fixed digest, and nothing is asked of a server. */
function Frame({ children, width = 640 }: { children: ReactNode; width?: number }) {
  return (
    <AuthProvider storage={{ read: () => null, write: noop }}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <MemoryRouter>
          <div className="max-w-full" style={{ width }}>
            {children}
          </div>
        </MemoryRouter>
      </ApiProvider>
    </AuthProvider>
  )
}

const chatWith = (digest: ChatVideoDigest): ChatVideoAttachments => ({
  context: CONTEXT,
  fixedDigests: { [VIDEO]: digest },
  fixedMedia: { [VIDEO]: { video: LANDSCAPE_VIDEO, ...(digest.poster ? { still: POSTER } : {}) } },
  onOpenSetup: noop,
})

function Composer({
  digest,
  uploads = [],
  text = 'Here is the bug',
}: {
  digest?: ChatVideoDigest
  uploads?: ChatAttachmentUpload[]
  text?: string
}) {
  return (
    <Frame>
      <ChatInput
        value={text}
        onChange={noop}
        onSend={noop}
        attachments={digest ? [VIDEO] : []}
        onChangeAttachments={noop}
        attachmentUploads={fixedChatUploads(uploads)}
        getAttachmentPreviewUrl={previewUrl}
        {...(digest ? { videoAttachments: chatWith(digest) } : {})}
      />
    </Frame>
  )
}

function Sent({ digest }: { digest: ChatVideoDigest }) {
  return (
    <Frame width={560}>
      <MessageRow
        msg={
          { id: 'u1', role: 'user', content: 'Here is the bug', files: [VIDEO] } as ChatMessageLike
        }
        globalIndex={0}
        totalMessages={1}
        isThinking={false}
        isLast
        prevUserMessagesLen={1}
        enhancedTotalLength={1}
        getAttachmentPreviewUrl={previewUrl}
        videoAttachments={chatWith(digest)}
      />
    </Frame>
  )
}

const UPLOADING: ChatAttachmentUpload = {
  id: 'u1',
  name: LARGE,
  status: 'uploading',
  sizeBytes: 1.8 * GB,
  sentBytes: 0.79 * GB,
  percent: 44,
  secondsLeft: 252,
  canRetry: true,
}

const JUST_STARTED: ChatAttachmentUpload = {
  ...UPLOADING,
  sentBytes: 12 * MB,
  percent: 0,
}
delete (JUST_STARTED as Partial<ChatAttachmentUpload>).secondsLeft

const LAST_MINUTE: ChatAttachmentUpload = {
  ...UPLOADING,
  sentBytes: 1.74 * GB,
  percent: 96,
  secondsLeft: 40,
}

const IMAGE_UPLOADING: ChatAttachmentUpload = {
  ...UPLOADING,
  id: 'u2',
  name: 'error-dialog.png',
  sizeBytes: 3 * MB,
  sentBytes: 2 * MB,
  percent: 66,
  secondsLeft: 2,
}

const STOPPED_AT: ChatAttachmentUpload = {
  ...UPLOADING,
  status: 'failed',
  error: 'The upload stopped at 61%.',
}

const TOO_LARGE: ChatAttachmentUpload = {
  ...UPLOADING,
  status: 'failed',
  sizeBytes: 2.4 * GB,
  sentBytes: 0,
  percent: 0,
  error: `${LARGE} is 2.4 GB — attachments can be up to 2 GB.`,
  canRetry: false,
}

const FILE_FAILED: ChatAttachmentUpload = {
  ...IMAGE_UPLOADING,
  status: 'failed',
  error: 'The upload stopped at 66%.',
}

/** A card pressed as a person would press it, so a scene shows the real playing state. */
function Pressed({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label^="Play"]')?.click()
  }, [])
  return <div ref={ref}>{children}</div>
}

function Player({
  url,
  frame,
  width = 560,
  pressed = true,
  showControls = false,
  digest = STATES.ready as ChatVideoDigest,
}: {
  url: string
  frame?: { width: number; height: number }
  width?: number
  pressed?: boolean
  showControls?: boolean
  digest?: ChatVideoDigest
}) {
  const card = (
    <SentVideoAttachment
      name={NAME}
      view={videoAttachmentView({ ...digest, ...frame })}
      posterUrl={posterUrl(digest)}
      source={sourceOf(url)}
      onOpenSetup={noop}
      showControls={showControls}
    />
  )
  return <Frame width={width}>{pressed ? <Pressed>{card}</Pressed> : card}</Frame>
}

/** A URL that has run out, then a good one, as a card meets when left open past its time. */
function runsOutOnce(url: string) {
  let asked = 0
  return {
    video: async () =>
      asked++ === 0
        ? { url: NOT_A_VIDEO, expiresAt: '2000-01-01T00:00:00.000Z' }
        : { url, expiresAt: FAR_OFF },
  }
}

function TwoVideos() {
  const digest = STATES.ready as ChatVideoDigest
  return (
    <Frame width={560}>
      <div className="flex flex-col gap-2">
        {[LANDSCAPE_VIDEO, PORTRAIT_VIDEO].map((url) => (
          <SentVideoAttachment
            key={url}
            name={NAME}
            view={videoAttachmentView(digest)}
            posterUrl={POSTER}
            source={sourceOf(url)}
          />
        ))}
      </div>
    </Frame>
  )
}

const stateOf = (key: string, render: (digest: ChatVideoDigest) => ReactNode): SceneState => {
  const [title, description] = TITLES[key] as [string, string]
  const digest = STATES[key] as ChatVideoDigest
  return {
    id: key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
    title,
    description,
    render: () => render(digest),
  }
}

function Details({ digest }: { digest: ChatVideoDigest }) {
  return (
    <div className="inline-flex rounded-lg border border-(--border-default) bg-(--surface-raised) p-3">
      <VideoDetailsPanel name={NAME} view={videoAttachmentView(digest)} />
    </div>
  )
}

const COST_READY = videoAttachmentView(STATES.ready).cost
const COST_ROUGH = videoAttachmentView(STATES.frames).cost

export const VIDEO_ATTACHMENT_SCENES: Scene[] = [
  {
    id: 'video-composer-card',
    title: 'Video in the composer',
    component: 'VideoAttachmentCard',
    group: 'Chat',
    description:
      'Decision 1B: a card with the poster, length and how the video stands, in one line of stage and percent (3A). What it costs is the cost chip, not a line of text (4A, redone). The Set up link shows only on a failure setup can fix.',
    states: [
      ...Object.keys(STATES).map((key) =>
        stateOf(key, (digest) => (
          <Frame width={420}>
            <Card digest={digest} />
          </Frame>
        )),
      ),
      {
        id: 'upload-stopped',
        title: 'Upload stopped',
        description: 'The connection dropped: how far it got, and Try again with the same file.',
        render: () => (
          <Frame width={420}>
            <Card retry digest={{ stage: 'failed', reason: 'The upload stopped at 61%.' }} />
          </Frame>
        ),
      },
    ],
  },
  {
    id: 'video-sent-poster',
    title: 'Video in a sent message',
    component: 'SentVideoAttachment',
    group: 'Chat',
    description:
      'Decision 2A: a poster beside the images a message shows, which stays live: the row follows the digest for as long as the chat is open. It plays in the card (see Video playing); details are on the info button beside the name.',
    states: [
      ...Object.keys(STATES).map((key) =>
        stateOf(key, (digest) => (
          <Frame width={260}>
            <Tile digest={digest} />
          </Frame>
        )),
      ),
      {
        id: 'in-a-message',
        title: 'In a message',
        description: 'The real message row, the poster under the bubble.',
        render: () => <Sent digest={STATES.ready as ChatVideoDigest} />,
      },
      {
        id: 'in-a-message-preparing',
        title: 'In a message, still being read',
        description: 'The message went while the digest goes on; the poster follows it.',
        render: () => <Sent digest={STATES.frames as ChatVideoDigest} />,
      },
    ],
  },
  {
    id: 'video-playing',
    title: 'Video playing',
    component: 'SentVideoAttachment · ChatVideoPlayer',
    group: 'Chat',
    description:
      'A sent video plays in its card from a short-lived signed URL. The card grows to the video’s own shape, no crop and no bars, up to 420 wide and 360 tall, and goes back on close. Play and full screen show on hover or keyboard focus, and after a tap where there is no hover. Details stay on the info button, always in view.',
    states: [
      {
        id: 'poster',
        title: 'Poster',
        description: 'At rest: no controls, and nothing is downloaded until someone presses play.',
        render: () => <Player url={LANDSCAPE_VIDEO} pressed={false} frame={LANDSCAPE} />,
      },
      {
        id: 'hover',
        title: 'Hover or focus',
        description: 'Play in the middle, full screen at the top right. On a phone: after a tap.',
        render: () => (
          <Player url={LANDSCAPE_VIDEO} pressed={false} showControls frame={LANDSCAPE} />
        ),
      },
      {
        id: 'playing-landscape',
        title: 'Playing, landscape',
        description:
          'The card grows to 420 wide, at the video’s own shape, with the player’s controls.',
        render: () => <Player url={LANDSCAPE_VIDEO} frame={LANDSCAPE} />,
      },
      {
        id: 'playing-portrait',
        title: 'Playing, portrait',
        description: 'Height capped at 360, and the width follows: it never fills the chat.',
        render: () => <Player url={PORTRAIT_VIDEO} frame={PORTRAIT} />,
      },
      {
        id: 'playing-size-unknown',
        title: 'Playing before the digest knows the size',
        description:
          'Still being read: it plays anyway, and takes its shape once the player reads it.',
        render: () => <Player url={PORTRAIT_VIDEO} digest={STATES.frames as ChatVideoDigest} />,
      },
      {
        id: 'full-screen-button',
        title: 'Full screen and close',
        description: 'While playing: full screen and close at the top right, in view on hover.',
        render: () => <Player url={LANDSCAPE_VIDEO} showControls frame={LANDSCAPE} />,
      },
      {
        id: 'digest-failed',
        title: 'Failed digest, file fine',
        description: 'Agents cannot read it, but it plays: playing needs only the upload.',
        render: () => (
          <Player
            url={LANDSCAPE_VIDEO}
            pressed={false}
            showControls
            digest={STATES.timedOut as ChatVideoDigest}
          />
        ),
      },
      {
        id: 'format-not-playable',
        title: 'Format not playable',
        description:
          'The browser cannot decode it: a plain line on the card, and no broken player.',
        render: () => <Player url={NOT_A_VIDEO} frame={LANDSCAPE} />,
      },
      {
        id: 'url-ran-out',
        title: 'The link ran out',
        description: 'Links last 15 minutes: the card quietly asks for another and carries on.',
        render: () => (
          <Frame width={560}>
            <Pressed>
              <SentVideoAttachment
                name={NAME}
                view={videoAttachmentView({ ...(STATES.ready as ChatVideoDigest), ...LANDSCAPE })}
                posterUrl={POSTER}
                source={runsOutOnce(LANDSCAPE_VIDEO)}
              />
            </Pressed>
          </Frame>
        ),
      },
      {
        id: 'two-videos',
        title: 'Two videos',
        description: 'One open at a time: starting one closes the other, freeing its connection.',
        render: () => <TwoVideos />,
      },
      {
        id: 'phone-width',
        title: 'Small screen',
        description: 'The card takes the width there is, keeping the video’s shape.',
        render: () => <Player url={LANDSCAPE_VIDEO} width={320} frame={LANDSCAPE} />,
      },
      {
        id: 'in-a-message',
        title: 'Playing in a message',
        description:
          'The real message row: the card stays with the bubble, on its side of the chat.',
        render: () => (
          <Pressed>
            <Sent digest={{ ...(STATES.ready as ChatVideoDigest), ...LANDSCAPE }} />
          </Pressed>
        ),
      },
    ],
  },
  {
    id: 'video-cost-chip',
    title: 'Video cost chip',
    component: 'VideoCostChip · CostChip',
    group: 'Chat',
    description:
      'The app’s cost chip, adapted: the same neutral pill and green dot, but in tokens, as no model is known when a video is attached. No figure before the upload is done (7A). Its details say what a closer look is.',
    states: [
      {
        id: 'ready',
        title: 'Ready',
        description: 'The whole notice, where a card has the room.',
        render: () => COST_READY && <VideoCostChip cost={COST_READY} />,
      },
      {
        id: 'compact',
        title: 'Compact',
        description: 'The reading cost alone, on a poster; the details still give both.',
        render: () => COST_READY && <VideoCostChip cost={COST_READY} compact />,
      },
      {
        id: 'rough',
        title: 'Rough',
        description: 'The length is known but the video is not read yet.',
        render: () => COST_ROUGH && <VideoCostChip cost={COST_ROUGH} />,
      },
    ],
  },
  {
    id: 'video-status-details',
    title: 'Video status details',
    component: 'VideoDetailsPanel',
    group: 'Chat',
    description:
      'What clicking a video opens: a popover on a big screen, a sheet on a small one. Each step, the cost, and what a closer look is.',
    states: [
      {
        id: 'preparing',
        title: 'Preparing',
        render: () => <Details digest={STATES.frames as ChatVideoDigest} />,
      },
      {
        id: 'ready',
        title: 'Ready',
        render: () => <Details digest={STATES.ready as ChatVideoDigest} />,
      },
      {
        id: 'no-transcript',
        title: 'No transcript',
        render: () => <Details digest={STATES.notSetUp as ChatVideoDigest} />,
      },
      {
        id: 'failed',
        title: 'Failed',
        render: () => <Details digest={STATES.noFfmpeg as ChatVideoDigest} />,
      },
    ],
  },
  {
    id: 'chat-upload-strip',
    title: 'Upload strip',
    component: 'ChatUploadStrip',
    group: 'Chat',
    description:
      'Decision 5C: files on their way, in a strip above the composer, with the time left. The strip stands for the file until it arrives, when the card takes over. Stopping asks first.',
    states: [
      {
        id: 'uploading',
        title: 'Uploading',
        description: 'A large video, with the time left and where the cost will come from.',
        render: () => (
          <Frame>
            <ChatUploadStrip uploads={[UPLOADING]} onStop={noop} />
          </Frame>
        ),
      },
      {
        id: 'just-started',
        title: 'Just started',
        description: 'No speed to go on yet, so no time left.',
        render: () => (
          <Frame>
            <ChatUploadStrip uploads={[JUST_STARTED]} onStop={noop} />
          </Frame>
        ),
      },
      {
        id: 'last-minute',
        title: 'Under a minute left',
        render: () => (
          <Frame>
            <ChatUploadStrip uploads={[LAST_MINUTE]} onStop={noop} />
          </Frame>
        ),
      },
      {
        id: 'two-files',
        title: 'Two files',
        description: 'Each on its own row; only a video promises a cost.',
        render: () => (
          <Frame>
            <ChatUploadStrip uploads={[UPLOADING, IMAGE_UPLOADING]} onStop={noop} />
          </Frame>
        ),
      },
      {
        id: 'narrow',
        title: 'Small screen',
        render: () => (
          <Frame width={360}>
            <ChatUploadStrip uploads={[UPLOADING]} onStop={noop} />
          </Frame>
        ),
      },
    ],
  },
  {
    id: 'chat-composer-video',
    title: 'Composer with a video',
    component: 'ChatInput',
    group: 'Chat',
    description:
      'The whole composer. Send waits for uploads (6A), which ends a send going without its file; the hint says why. Failed uploads stay in the chip row with their reason.',
    states: [
      {
        id: 'send-held',
        title: 'Send held during an upload',
        description: 'The strip above, Send faded, and the hint in place of the shortcut.',
        render: () => <Composer uploads={[UPLOADING]} />,
      },
      {
        id: 'preparing',
        title: 'Uploaded, being read',
        description: 'Send works: a digest goes on after the message.',
        render: () => <Composer digest={STATES.frames as ChatVideoDigest} />,
      },
      {
        id: 'ready',
        title: 'Ready',
        render: () => <Composer digest={STATES.ready as ChatVideoDigest} />,
      },
      {
        id: 'upload-stopped',
        title: 'Upload stopped',
        description: 'Send works for the rest of the message; the card offers another go.',
        render: () => <Composer uploads={[STOPPED_AT]} />,
      },
      {
        id: 'too-large',
        title: 'Over the limit',
        description: 'Never sent: the reason, no retry.',
        render: () => <Composer uploads={[TOO_LARGE]} />,
      },
      {
        id: 'other-file-failed',
        title: 'Another file failed',
        description: 'A file that is not a video keeps the small chip, with Try again.',
        render: () => <Composer uploads={[FILE_FAILED]} />,
      },
    ],
  },
]
