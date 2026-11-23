import { useMemo, useState } from 'react'
import type { VideoMarkedMoment } from 'thefactory-tools/types'
import {
  addVideoMark,
  removeVideoMark,
  setVideoMarkNote,
  videoAttachmentView,
  videoMarkNoteAt,
  videoTimelineMarksOf,
  videoTimelineView,
  type ChatVideoAttachments,
  type ChatVideoDigest,
  type ChatVideoMarkDraft,
  type ChatVideoMarks,
  type ChatVideoTimeline,
} from 'thefactory-ui/headless'
import { ChatInput, MessageRow } from 'thefactory-ui/web'
import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
// Not on the package's public surface: the card and the screen draw these themselves.
import SentVideoAttachment from '../../src/web/compound/chat/SentVideoAttachment'
import VideoTimelineScreen from '../../src/web/compound/chat/VideoTimelineScreen'
import type { Scene, SceneState } from '../showcase/types'
import {
  CONTEXT,
  Frame,
  LANDSCAPE,
  POSTER,
  Pressed,
  STATES,
  previewUrl,
  sourceOf,
} from './videoAttachments'
import {
  CHECKOUT_VIDEO_URL,
  COMPOSER_MARKS,
  EARLIER_VIDEO,
  SENT_MARKS,
  TIMELINES,
  TIMELINE_MARKS,
  TIMELINE_VIDEO,
  TIMELINE_VIDEO_NAME,
  videoUrlOf,
} from './videoTimelineFixtures'

const noop = () => {}
const READY = {
  ...(STATES.ready as ChatVideoDigest),
  durationSec: 16,
  sizeBytes: 9.8 * 1024 * 1024,
}
const READY_LANDSCAPE = { ...READY, ...LANDSCAPE }

function TimelineCard({
  timeline,
  open = true,
  playheadSec,
}: {
  timeline: ChatVideoTimeline | undefined
  open?: boolean
  playheadSec?: number
}) {
  const [timelineOpen, setTimelineOpen] = useState(open)
  return (
    <SentVideoAttachment
      name={TIMELINE_VIDEO_NAME}
      view={videoAttachmentView({
        ...READY,
        durationSec: timeline?.durationSec ?? READY.durationSec,
      })}
      posterUrl={POSTER}
      source={sourceOf(videoUrlOf(timeline))}
      timeline={videoTimelineView(timeline)}
      timelineOpen={timelineOpen}
      onTimelineOpenChange={setTimelineOpen}
      {...(playheadSec !== undefined ? { fixedPlayheadSec: playheadSec } : {})}
    />
  )
}

function Playing({
  markAtSec,
  showControls = false,
}: {
  markAtSec?: number
  showControls?: boolean
}) {
  const [timelineOpen, setTimelineOpen] = useState(true)
  return (
    <Frame width={560}>
      <Pressed>
        <SentVideoAttachment
          name={TIMELINE_VIDEO_NAME}
          view={videoAttachmentView(READY_LANDSCAPE)}
          posterUrl={POSTER}
          source={sourceOf(CHECKOUT_VIDEO_URL)}
          showControls={showControls}
          timeline={videoTimelineView(TIMELINES.checkout)}
          timelineOpen={timelineOpen}
          onTimelineOpenChange={setTimelineOpen}
          fixedPlayheadSec={13}
          onMark={noop}
          {...(markAtSec !== undefined ? { initialMarkSec: markAtSec } : {})}
        />
      </Pressed>
    </Frame>
  )
}

/** The composer's marks as a scene keeps them: in its own state, so notes and × work. */
function useSceneMarks(initial: ChatVideoMarkDraft[]): ChatVideoMarks {
  const [items, setItems] = useState(initial)
  return useMemo(
    () => ({
      items,
      add: (mark) => setItems((prev) => addVideoMark(prev, mark)),
      setNote: (key, note) => setItems((prev) => setVideoMarkNote(prev, key, note)),
      remove: (key) => setItems((prev) => removeVideoMark(prev, key)),
    }),
    [items],
  )
}

/**
 * A sent card with its timeline open and the composer under it, sharing one set of marks: a row's
 * Mark puts its moment in the composer, and the marks show under the rows they fall in.
 */
function MarkFromRow({
  timeline = TIMELINES.checkout,
  sent = [],
  waiting = [],
  markAtSec,
  closeUpIndex,
}: {
  timeline?: ChatVideoTimeline
  sent?: VideoMarkedMoment[]
  waiting?: ChatVideoMarkDraft[]
  markAtSec?: number
  closeUpIndex?: number
}) {
  const marks = useSceneMarks(waiting)
  const [timelineOpen, setTimelineOpen] = useState(true)
  return (
    <Frame width={560}>
      <div className="flex flex-col gap-4">
        <SentVideoAttachment
          name={TIMELINE_VIDEO_NAME}
          view={videoAttachmentView(READY)}
          posterUrl={POSTER}
          source={sourceOf(videoUrlOf(timeline))}
          timeline={videoTimelineView(
            timeline,
            videoTimelineMarksOf(TIMELINE_VIDEO, sent, marks.items),
          )}
          timelineOpen={timelineOpen}
          onTimelineOpenChange={setTimelineOpen}
          onMark={(timeSec, note) => marks.add({ video: TIMELINE_VIDEO, timeSec, note })}
          markNoteAt={(timeSec) => videoMarkNoteAt(marks.items, TIMELINE_VIDEO, timeSec)}
          {...(markAtSec !== undefined ? { initialRowMarkSec: markAtSec } : {})}
          {...(closeUpIndex !== undefined ? { initialCloseUpIndex: closeUpIndex } : {})}
        />
        <ChatInput
          value=""
          onChange={noop}
          onSend={noop}
          attachments={[]}
          onChangeAttachments={noop}
          getAttachmentPreviewUrl={previewUrl}
          videoAttachments={chatWith(marks)}
        />
      </div>
    </Frame>
  )
}

const chatWith = (marks?: ChatVideoMarks): ChatVideoAttachments => ({
  context: CONTEXT,
  fixedDigests: { [TIMELINE_VIDEO]: READY_LANDSCAPE, [EARLIER_VIDEO]: READY_LANDSCAPE },
  fixedMedia: {
    [TIMELINE_VIDEO]: { video: CHECKOUT_VIDEO_URL, still: POSTER },
    [EARLIER_VIDEO]: { video: CHECKOUT_VIDEO_URL, still: POSTER },
  },
  fixedTimelines: { [TIMELINE_VIDEO]: TIMELINES.checkout, [EARLIER_VIDEO]: TIMELINES.checkout },
  ...(marks ? { marks } : {}),
})

function Composer({ marks, attached = true }: { marks: ChatVideoMarkDraft[]; attached?: boolean }) {
  const handle = useSceneMarks(marks)
  return (
    <Frame>
      <ChatInput
        value="Here is where it breaks"
        onChange={noop}
        onSend={noop}
        attachments={attached ? [TIMELINE_VIDEO] : []}
        onChangeAttachments={noop}
        getAttachmentPreviewUrl={previewUrl}
        videoAttachments={chatWith(handle)}
      />
    </Frame>
  )
}

function Sent({
  files = [TIMELINE_VIDEO],
  videoMarks,
  text = 'Here is where it breaks',
}: {
  files?: string[]
  videoMarks?: VideoMarkedMoment[]
  text?: string
}) {
  const marks = useSceneMarks([])
  const msg = {
    id: 'u1',
    role: 'user',
    content: text,
    files,
    ...(videoMarks ? { videoMarks } : {}),
  } as ChatMessageLike
  return (
    <Frame width={560}>
      <MessageRow
        msg={msg}
        globalIndex={0}
        totalMessages={1}
        isThinking={false}
        isLast
        prevUserMessagesLen={1}
        enhancedTotalLength={1}
        getAttachmentPreviewUrl={previewUrl}
        videoAttachments={chatWith(marks)}
      />
    </Frame>
  )
}

const timelineState = (
  id: string,
  title: string,
  description: string,
  timeline: ChatVideoTimeline | undefined,
  playheadSec?: number,
): SceneState => ({
  id,
  title,
  description,
  render: () => (
    <Frame width={460}>
      <TimelineCard timeline={timeline} {...(playheadSec !== undefined ? { playheadSec } : {})} />
    </Frame>
  ),
})

export const VIDEO_TIMELINE_SCENES: Scene[] = [
  {
    id: 'video-timeline',
    title: 'Video timeline',
    component: 'SentVideoAttachment · VideoTimelineList',
    group: 'Chat',
    description:
      'Decision 1A: the sent card’s Timeline pill opens the digest under the card, 420 wide, in time order: stills with their text and close-ups, actions, what was said and sounds. Each time plays the video from there; the row at the playhead stands out. On a small screen it is a screen of its own.',
    states: [
      {
        id: 'closed',
        title: 'Closed',
        description: 'The pill beside the info button, not pressed.',
        render: () => (
          <Frame width={460}>
            <TimelineCard timeline={TIMELINES.checkout} open={false} />
          </Frame>
        ),
      },
      timelineState(
        'open',
        'Open',
        'The fold under the card: TIMELINE, the count, then the rows.',
        TIMELINES.checkout,
      ),
      timelineState(
        'at-the-playhead',
        'At the playhead',
        'Playing at 00:13: that row stands out in the accent tint.',
        TIMELINES.checkout,
        13.4,
      ),
      {
        id: 'playing',
        title: 'Open while playing',
        description: 'The player above, the fold under it, the flag in the corner.',
        render: () => <Playing showControls />,
      },
      timelineState(
        'in-progress',
        'Being read',
        'Still being made: the same one line of stage and percent as the card.',
        TIMELINES.preparing,
      ),
      timelineState('not-read', 'Not read yet', 'No digest begun.', TIMELINES.notStarted),
      timelineState('loading', 'Reading', 'Asked for, not answered yet.', undefined),
      timelineState('failed', 'Failed', 'The digest’s reason, in one line.', TIMELINES.failed),
      timelineState(
        'empty',
        'Nothing on it',
        'A finished digest with no moments.',
        TIMELINES.empty,
      ),
      timelineState(
        'long-list',
        'A long video',
        'Forty moments: the fold scrolls at 300 tall, the card stays put.',
        TIMELINES.long,
      ),
      timelineState(
        'close-ups',
        'Close-ups',
        'A still with close-ups: a line each, its crop, place and text.',
        TIMELINES.closeUps,
      ),
      timelineState(
        'sounds-and-actions',
        'Sounds and actions',
        'Silence and music until when they end, a sudden sound, and every kind of action, one that failed.',
        TIMELINES.soundsAndActions,
      ),
      timelineState(
        'on-every-screen',
        'On every screen',
        'What sits on most stills is said once, over the rows.',
        TIMELINES.everyScreen,
      ),
      {
        id: 'phone-screen',
        title: 'Small screen',
        description:
          'Its own screen over the chat, with Back; a time goes back and plays the card from there.',
        overlay: true,
        render: () => (
          <VideoTimelineScreen
            isOpen
            name={TIMELINE_VIDEO_NAME}
            view={videoTimelineView(TIMELINES.checkout)}
            playheadIndex={7}
            onBack={noop}
            onPlayFrom={noop}
          />
        ),
      },
      {
        id: 'in-a-message',
        title: 'In a message',
        description: 'The real message row: the pill opens and closes the fold.',
        render: () => <Sent />,
      },
      {
        id: 'row-mark',
        title: 'Mark from a row',
        description:
          'Decision 4A: hovering or focusing a row shows Mark at its end, beside the row’s own play button, not in it. The composer under the card gets what Add to message adds.',
        render: () => <MarkFromRow />,
      },
      {
        id: 'row-mark-open',
        title: 'Marking a row',
        description:
          'Mark on the 00:13 row opens the flag’s own note box under the row: Mark 00:13, the row’s text, the optional note, Cancel and Add to message.',
        render: () => <MarkFromRow markAtSec={13} />,
      },
      {
        id: 'marks-in-timeline',
        title: 'Marks in the timeline',
        description:
          'Decision 5B: each of the person’s marks of the video is a line under the row it falls in: the flag, its time, its note or No note, and Sent or In your message. The rows are as they were.',
        render: () => <MarkFromRow sent={TIMELINE_MARKS.sent} waiting={TIMELINE_MARKS.composer} />,
      },
      {
        id: 'close-up-viewer',
        title: 'Close-up opened',
        description:
          'Decision 6A: a close-up line is a button of its own. It opens the crop at its real size over the chat, with its time, place and text, the arrows through every close-up of the video and Play from its time.',
        render: () => <MarkFromRow timeline={TIMELINES.closeUps} closeUpIndex={0} />,
        overlay: true,
      },
      {
        id: 'close-up-viewer-middle',
        title: 'Close-up, one of several',
        description: 'The second of four: both arrows step, the count says where it is.',
        render: () => <MarkFromRow timeline={TIMELINES.closeUps} closeUpIndex={1} />,
        overlay: true,
      },
    ],
  },
  {
    id: 'video-mark',
    title: 'Mark a moment',
    component: 'SentVideoAttachment · VideoMarkPopover',
    group: 'Chat',
    description:
      'Decision 2A: a flag joins the player’s corner buttons while it plays. It pauses, and asks for an optional note; Add to message puts the mark in the composer. Escape or Cancel close it with no mark.',
    states: [
      {
        id: 'flag',
        title: 'The flag',
        description: 'Playing: flag, full screen and close, in view on hover or focus.',
        render: () => <Playing showControls />,
      },
      {
        id: 'popover',
        title: 'Marking 00:13',
        description: 'Paused at 00:13: the time, the note, Cancel and Add to message.',
        render: () => <Playing markAtSec={13} />,
      },
    ],
  },
  {
    id: 'video-marks',
    title: 'Marks on a message',
    component: 'ChatInput · ComposerVideoMarks · SentVideoMarks',
    group: 'Chat',
    description:
      'Decision 3C: each mark is a row under its video, with the still at or before it. In the composer each takes a note and can go; once sent, each plays the video from its moment.',
    states: [
      {
        id: 'composer-none',
        title: 'Composer, no marks',
        render: () => <Composer marks={COMPOSER_MARKS.none} />,
      },
      {
        id: 'composer-one',
        title: 'Composer, one mark',
        render: () => <Composer marks={COMPOSER_MARKS.one} />,
      },
      {
        id: 'composer-three',
        title: 'Composer, three marks',
        description: 'In time order, with and without notes.',
        render: () => <Composer marks={COMPOSER_MARKS.three} />,
      },
      {
        id: 'composer-refused',
        title: 'A mark refused',
        description: 'The send came back: the reason by the mark, the composer as it was.',
        render: () => <Composer marks={COMPOSER_MARKS.refused} />,
      },
      {
        id: 'composer-earlier-video',
        title: 'Marks on a video sent before',
        description:
          'The video went with an earlier message: its card stands over its marks, with no way off.',
        render: () => (
          <Composer
            attached={false}
            marks={[{ ...COMPOSER_MARKS.one[0]!, video: EARLIER_VIDEO }]}
          />
        ),
      },
      {
        id: 'sent',
        title: 'Sent',
        description:
          'Under the sent card: each mark’s still, time in the accent, and note or No note.',
        render: () => <Sent videoMarks={SENT_MARKS} />,
      },
      {
        id: 'sent-marks-only',
        title: 'Sent, marks alone',
        description:
          'A message that only marks a video sent before: the card shows with its marks.',
        render: () => <Sent files={[]} videoMarks={SENT_MARKS} text="These two" />,
      },
    ],
  },
]
