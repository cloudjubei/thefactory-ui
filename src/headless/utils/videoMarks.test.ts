import { describe, expect, it } from 'vitest'
import {
  addVideoMark,
  composerVideoMarkRows,
  mergeVideoMarks,
  removeVideoMark,
  sentVideoMarkRows,
  setVideoMarkNote,
  videoMarkKey,
  videoMarkTimeOf,
  videoMarkVideos,
  videoMarksOf,
  videoMarksToSend,
  withMarkedVideos,
  withVideoMarkRefusal,
  withoutVideoMarkRefusals,
} from './videoMarks'
import type { ChatVideoMarkDraft } from './videoMarksTypes'
import type { ChatVideoTimeline } from './videoTimelineTypes'

const A = 'attachments/checkout-bug.mov'
const B = 'attachments/settings.mp4'

const mark = (video: string, timeSec: number, note = ''): ChatVideoMarkDraft => ({
  video,
  timeSec,
  note,
})

const still = (timeSec: number) => ({
  kind: 'still' as const,
  timeSec,
  file: `stills/t-${timeSec}.jpg`,
  url: `/media/t-${timeSec}.jpg`,
  text: [],
  closeUps: [],
})

const TIMELINE: ChatVideoTimeline = {
  state: 'done',
  durationSec: 16,
  onEveryScreen: [],
  entries: [still(0), { kind: 'speech', timeSec: 6, endSec: 8, text: 'Now' }, still(9)],
}

describe('videoMarkTimeOf', () => {
  it('keeps a player’s time to a tenth of a second', () => {
    expect(videoMarkTimeOf(13.2345)).toBe(13.2)
    expect(videoMarkTimeOf(13.26)).toBe(13.3)
  })

  it('never goes before the start, nor takes a time that is not one', () => {
    expect(videoMarkTimeOf(-0.4)).toBe(0)
    expect(videoMarkTimeOf(Number.NaN)).toBe(0)
  })
})

describe('videoMarkKey', () => {
  it('is the video and the time', () => {
    expect(videoMarkKey(mark(A, 13.2))).toBe(`${A}#13.2`)
  })
})

describe('addVideoMark', () => {
  it('adds a mark at its tenth of a second, its note trimmed', () => {
    expect(addVideoMark([], { video: A, timeSec: 13.24, note: '  card declined ' })).toEqual([
      mark(A, 13.2, 'card declined'),
    ])
  })

  it('takes a mark with no note', () => {
    expect(addVideoMark([], { video: A, timeSec: 6 })).toEqual([mark(A, 6)])
  })

  it('takes the place of a mark at the same moment, rather than adding it twice', () => {
    const marks = [mark(A, 6), mark(A, 13.2, 'old')]
    expect(addVideoMark(marks, { video: A, timeSec: 13.21, note: 'new' })).toEqual([
      mark(A, 6),
      mark(A, 13.2, 'new'),
    ])
  })

  it('keeps the note already written when the same moment is marked again without one', () => {
    const marks = [mark(A, 13.2, 'kept')]
    expect(addVideoMark(marks, { video: A, timeSec: 13.2 })).toEqual([mark(A, 13.2, 'kept')])
  })

  it('keeps marks on another video apart', () => {
    expect(addVideoMark([mark(A, 6)], { video: B, timeSec: 6 })).toEqual([mark(A, 6), mark(B, 6)])
  })
})

describe('setVideoMarkNote', () => {
  it('changes the note, and lets a refusal go', () => {
    const marks = [{ ...mark(A, 6), refusal: 'no' }, mark(A, 9)]
    expect(setVideoMarkNote(marks, videoMarkKey(mark(A, 6)), 'here')).toEqual([
      mark(A, 6, 'here'),
      mark(A, 9),
    ])
  })

  it('leaves the marks as they are for a key it does not hold', () => {
    const marks = [mark(A, 6)]
    expect(setVideoMarkNote(marks, 'nothing', 'x')).toBe(marks)
  })
})

describe('removeVideoMark', () => {
  it('takes the mark out', () => {
    expect(removeVideoMark([mark(A, 6), mark(A, 9)], videoMarkKey(mark(A, 6)))).toEqual([
      mark(A, 9),
    ])
  })
})

describe('mergeVideoMarks', () => {
  it('puts the first marks first, and adds only the moments they do not hold', () => {
    expect(mergeVideoMarks([mark(A, 6, 'first')], [mark(A, 6, 'second'), mark(B, 1)])).toEqual([
      mark(A, 6, 'first'),
      mark(B, 1),
    ])
  })

  it('is what there is when one side is empty', () => {
    const marks = [mark(A, 6)]
    expect(mergeVideoMarks(undefined, marks)).toEqual(marks)
    expect(mergeVideoMarks(marks, undefined)).toEqual(marks)
    expect(mergeVideoMarks(undefined, undefined)).toEqual([])
  })
})

describe('videoMarksToSend', () => {
  it('sends each mark as the backend takes it, a note only when one was written', () => {
    expect(
      videoMarksToSend([{ ...mark(A, 6), refusal: 'no' }, mark(A, 13.2, ' card declined ')]),
    ).toEqual([
      { video: A, timeSec: 6 },
      { video: A, timeSec: 13.2, note: 'card declined' },
    ])
  })
})

describe('videoMarksOf', () => {
  it('reads back stored marks, leaving any refusal behind', () => {
    const stored = [{ video: A, timeSec: 6, note: 'n', refusal: 'no' }]
    expect(videoMarksOf(stored)).toEqual([mark(A, 6, 'n')])
  })

  it('drops what is not a mark', () => {
    expect(
      videoMarksOf([
        null,
        'x',
        { video: '', timeSec: 1 },
        { video: A, timeSec: 'soon' },
        { video: A, timeSec: -1 },
        { video: A, timeSec: 2 },
        { video: A, timeSec: 3, note: 4 },
      ]),
    ).toEqual([mark(A, 2), mark(A, 3)])
    expect(videoMarksOf('marks')).toEqual([])
  })
})

describe('withVideoMarkRefusal', () => {
  it('puts the reason by the mark on the video it names', () => {
    const marks = [mark(A, 6), mark(B, 2)]
    const reason = `${B} is not a video attached in this chat, so nothing in it can be marked.`
    expect(withVideoMarkRefusal(marks, reason)).toEqual([
      mark(A, 6),
      { ...mark(B, 2), refusal: reason },
    ])
  })

  it('puts it by the mark at the time it names', () => {
    const marks = [mark(A, 6), mark(A, 21.5)]
    const reason = 'This video is 00:16 long (16 s), so there is nothing at 21.5 s to mark.'
    expect(withVideoMarkRefusal(marks, reason)).toEqual([
      mark(A, 6),
      { ...mark(A, 21.5), refusal: reason },
    ])
  })

  it('puts it by the first mark when it names neither', () => {
    const marks = [mark(A, 6), mark(A, 9)]
    expect(withVideoMarkRefusal(marks, 'A mark’s note is text.')).toEqual([
      { ...mark(A, 6), refusal: 'A mark’s note is text.' },
      mark(A, 9),
    ])
  })

  it('has nowhere to put it without marks', () => {
    expect(withVideoMarkRefusal([], 'no')).toEqual([])
  })
})

describe('withoutVideoMarkRefusals', () => {
  it('lets every refusal go', () => {
    expect(withoutVideoMarkRefusals([{ ...mark(A, 6), refusal: 'no' }])).toEqual([mark(A, 6)])
  })
})

describe('videoMarkVideos', () => {
  it('lists the marked videos once each, in the order first marked', () => {
    expect(videoMarkVideos([mark(B, 1), mark(A, 6), mark(B, 3)])).toEqual([B, A])
  })
})

describe('withMarkedVideos', () => {
  it('adds each marked video the message does not carry, after its files', () => {
    expect(withMarkedVideos(['notes.txt', A], [mark(A, 1), mark(B, 2), mark(B, 3)])).toEqual([
      'notes.txt',
      A,
      B,
    ])
  })

  it('is the files alone without marks, and the marked videos alone without files', () => {
    expect(withMarkedVideos(['notes.txt'], undefined)).toEqual(['notes.txt'])
    expect(withMarkedVideos(undefined, [mark(A, 1)])).toEqual([A])
  })
})

describe('composerVideoMarkRows', () => {
  it('shows one video’s marks in time order, each with the still at or before it', () => {
    const marks = [mark(A, 13.2, 'declined'), mark(B, 1), { ...mark(A, 6), refusal: 'no' }]
    expect(composerVideoMarkRows(marks, A, TIMELINE)).toEqual([
      {
        key: `${A}#6`,
        timeSec: 6,
        time: '00:06',
        note: '',
        stillUrl: '/media/t-0.jpg',
        refusal: 'no',
      },
      {
        key: `${A}#13.2`,
        timeSec: 13.2,
        time: '00:13',
        note: 'declined',
        stillUrl: '/media/t-9.jpg',
      },
    ])
  })

  it('has no stills before the timeline is read', () => {
    expect(composerVideoMarkRows([mark(A, 6)], A, undefined)).toEqual([
      { key: `${A}#6`, timeSec: 6, time: '00:06', note: '' },
    ])
  })
})

describe('sentVideoMarkRows', () => {
  it('shows a message’s marks on one video in time order, by the still each was sent with', () => {
    const moments = [
      { video: A, timeSec: 13, note: 'declined', still: { timeSec: 9, file: 'stills/t-9.jpg' } },
      { video: B, timeSec: 1 },
      { video: A, timeSec: 6 },
    ]
    expect(sentVideoMarkRows(moments, A, TIMELINE)).toEqual([
      {
        key: `${A}#6`,
        timeSec: 6,
        time: '00:06',
        note: 'No note',
        hasNote: false,
        stillUrl: '/media/t-0.jpg',
      },
      {
        key: `${A}#13`,
        timeSec: 13,
        time: '00:13',
        note: 'declined',
        hasNote: true,
        stillUrl: '/media/t-9.jpg',
      },
    ])
  })

  it('has no still for one the timeline no longer holds', () => {
    const moments = [{ video: A, timeSec: 4, still: { timeSec: 4, file: 'stills/gone.jpg' } }]
    expect(sentVideoMarkRows(moments, A, TIMELINE)[0]).not.toHaveProperty('stillUrl')
  })

  it('has none at all for no marks', () => {
    expect(sentVideoMarkRows(undefined, A, TIMELINE)).toEqual([])
  })
})
