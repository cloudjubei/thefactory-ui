import { describe, expect, it } from 'vitest'

import type { ResolvedReviewEvidence, ReviewEvidenceRef } from '../api/generated'
import {
  evidenceCitation,
  evidenceIssueDetail,
  evidenceMediaUrl,
  evidenceMomentOf,
  evidenceReferenceView,
  evidenceTime,
} from './evidenceReference'
import { EVIDENCE_REFERENCE_COPY } from './evidenceReferenceConstants'
import type { EvidenceLink } from './evidenceReferenceTypes'

const LINK: EvidenceLink = { kind: 'evidence', projectId: 'wargames', evidenceId: 'a41c9e02-1111' }
const BASE = 'https://host.test/'
const IMAGE = {
  kind: 'image' as const,
  mediaType: 'image/png',
  url: '/media/a41c9e02?grant=1',
  expiresAt: '2999-01-01T00:00:00.000Z',
}
const VIDEO = {
  kind: 'video' as const,
  mediaType: 'video/webm',
  url: 'https://cdn.test/rec?grant=2',
  expiresAt: '2999-01-01T00:00:00.000Z',
}

const item = (over: Partial<ResolvedReviewEvidence> = {}): ResolvedReviewEvidence => ({
  projectId: 'wargames',
  evidenceId: 'a41c9e02-1111',
  reference: '&wargames/evidence/a41c9e02-1111',
  kind: 'screenshot',
  title: 'Result screen',
  runId: 'tester-run',
  createdAt: 1,
  ...over,
})

const ready = (over: Partial<ResolvedReviewEvidence> = {}) => ({
  status: 'ready' as const,
  item: item(over),
})

describe('evidenceCitation', () => {
  it('writes the reference an agent writes, with its moment when it has one', () => {
    expect(evidenceCitation(LINK)).toBe('&wargames/evidence/a41c9e02-1111')
    expect(evidenceCitation({ ...LINK, at: 90 })).toBe('&wargames/evidence/a41c9e02-1111@90')
  })
})

describe('evidenceMediaUrl', () => {
  it('puts the backend in front of a server-relative URL, once', () => {
    expect(evidenceMediaUrl('/media/x', BASE)).toBe('https://host.test/media/x')
    expect(evidenceMediaUrl('/media/x', 'https://host.test')).toBe('https://host.test/media/x')
  })

  it('keeps a full URL, and a relative one without a backend, as they are', () => {
    expect(evidenceMediaUrl('https://cdn.test/a', BASE)).toBe('https://cdn.test/a')
    expect(evidenceMediaUrl('data:image/png;base64,AA', BASE)).toBe('data:image/png;base64,AA')
    expect(evidenceMediaUrl('/media/x')).toBe('/media/x')
  })
})

describe('evidenceTime', () => {
  it('says a moment as a player does, minutes unpadded', () => {
    expect(evidenceTime(0)).toBe('0:00')
    expect(evidenceTime(8)).toBe('0:08')
    expect(evidenceTime(431)).toBe('7:11')
    expect(evidenceTime(754)).toBe('12:34')
    expect(evidenceTime(3725)).toBe('1:02:05')
  })
})

describe('evidenceMomentOf', () => {
  it('reads the moment an evidence page is opened at', () => {
    expect(evidenceMomentOf('?at=90')).toBe(90)
    expect(evidenceMomentOf('at=12.5&x=1')).toBe(12.5)
    expect(evidenceMomentOf('?at=0')).toBe(0)
  })

  it('reads no moment when there is none, or it is not a time', () => {
    expect(evidenceMomentOf('')).toBeUndefined()
    expect(evidenceMomentOf('?at=')).toBeUndefined()
    expect(evidenceMomentOf('?at=soon')).toBeUndefined()
    expect(evidenceMomentOf('?at=-3')).toBeUndefined()
  })
})

describe('evidenceIssueDetail', () => {
  const ref = (over: Partial<ReviewEvidenceRef>) => ({ id: 'x', ...over }) as ReviewEvidenceRef

  it('reads what an issue says happened and where, from its run’s filings', () => {
    const refs = [
      ref({ id: 'other' }),
      ref({
        id: 'a41c9e02-1111',
        issue: { severity: 'major', title: 'T', happened: 'It showed 0.', view: '/game/result' },
      }),
    ]
    expect(evidenceIssueDetail(refs, 'a41c9e02-1111')).toEqual({
      happened: 'It showed 0.',
      view: '/game/result',
    })
  })

  it('reads an issue with no view, and nothing for an item that is no issue or not listed', () => {
    const refs = [
      ref({ id: 'i', issue: { severity: 'nit', title: 'T', happened: 'Odd.' } }),
      ref({ id: 'shot' }),
    ]
    expect(evidenceIssueDetail(refs, 'i')).toEqual({ happened: 'Odd.' })
    expect(evidenceIssueDetail(refs, 'shot')).toBeUndefined()
    expect(evidenceIssueDetail(refs, 'missing')).toBeUndefined()
  })
})

describe('evidenceReferenceView', () => {
  it('reads a screenshot by its title, opening it large', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({ media: IMAGE }),
      apiBaseUrl: BASE,
    })
    const target = {
      kind: 'image',
      title: 'Result screen',
      caption: 'Result screen',
      url: 'https://host.test/media/a41c9e02?grant=1',
    }
    expect(view).toEqual({
      phase: 'ready',
      glyph: 'screenshot',
      label: 'Result screen',
      citation: '&wargames/evidence/a41c9e02-1111',
      card: {
        caption: 'Screenshot',
        title: 'Result screen',
        lines: [],
        thumbnail: { kind: 'image', url: 'https://host.test/media/a41c9e02?grant=1' },
        actions: [{ label: EVIDENCE_REFERENCE_COPY.open, target, primary: true }],
      },
      open: target,
    })
  })

  it('reads a moment of a recording with its time, playing it from there', () => {
    const view = evidenceReferenceView({
      link: { ...LINK, at: 90 },
      state: ready({ kind: 'recording', title: 'Run-through', media: VIDEO, at: 90 }),
    })
    const target = {
      kind: 'video',
      title: 'Run-through',
      caption: 'Run-through',
      projectId: 'wargames',
      evidenceId: 'a41c9e02-1111',
      mediaType: 'video/webm',
      atSec: 90,
    }
    expect(view.glyph).toBe('recording')
    expect(view.time).toBe('1:30')
    expect(view.citation).toBe('&wargames/evidence/a41c9e02-1111@90')
    expect(view.card).toEqual({
      caption: 'Recording',
      title: 'Run-through',
      lines: [],
      thumbnail: { kind: 'video', url: 'https://cdn.test/rec?grant=2', atSec: 90 },
      actions: [{ label: 'Play 1:30', target, primary: true }],
    })
    expect(view.open).toEqual(target)
  })

  it('takes the moment from the link when the item names none, and plays a whole recording', () => {
    const at = evidenceReferenceView({
      link: { ...LINK, at: 8 },
      state: ready({ kind: 'recording', title: 'Run-through', media: VIDEO }),
    })
    expect(at.time).toBe('0:08')
    const whole = evidenceReferenceView({
      link: LINK,
      state: ready({ kind: 'recording', title: 'Run-through', media: VIDEO }),
    })
    expect(whole.time).toBeUndefined()
    expect(whole.card.actions[0]?.label).toBe(EVIDENCE_REFERENCE_COPY.play)
    expect(whole.card.thumbnail).toEqual({ kind: 'video', url: 'https://cdn.test/rec?grant=2' })
  })

  it('reads an issue by its title and severity, with what happened, its screenshot and its moment', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({
        title: 'Result shows 0 to 0',
        severity: 'major',
        media: IMAGE,
        at: 431,
        recording: {
          evidenceId: 'rec-1',
          reference: '&wargames/evidence/rec-1@431',
          media: VIDEO,
        },
      }),
      issue: { happened: 'Player 1 won, but it showed 0.', view: '/game/result' },
      apiBaseUrl: BASE,
    })
    const severity = { label: 'major', tone: 'stuck' }
    const shot = {
      kind: 'image',
      title: 'Result shows 0 to 0',
      caption: '/game/result · 7:11 in the recording',
      url: 'https://host.test/media/a41c9e02?grant=1',
      severity,
    }
    const play = {
      kind: 'video',
      title: 'Result shows 0 to 0',
      caption: 'Result shows 0 to 0',
      projectId: 'wargames',
      evidenceId: 'rec-1',
      mediaType: 'video/webm',
      atSec: 431,
    }
    expect(view.glyph).toBe('issue')
    expect(view.label).toBe('Result shows 0 to 0')
    expect(view.time).toBeUndefined()
    expect(view.severity).toEqual(severity)
    expect(view.card).toEqual({
      caption: EVIDENCE_REFERENCE_COPY.issue,
      title: 'Result shows 0 to 0',
      severity,
      lines: [
        { label: 'Happened', value: 'Player 1 won, but it showed 0.' },
        { label: 'Where', value: '/game/result · 7:11' },
      ],
      thumbnail: { kind: 'image', url: 'https://host.test/media/a41c9e02?grant=1' },
      actions: [
        { label: 'Open screenshot', target: shot, primary: true },
        { label: 'Play 7:11', target: play, primary: false },
      ],
    })
    expect(view.open).toEqual(shot)
  })

  it('plays an issue met only in its recording, shown by the frame at its moment', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({
        kind: 'report',
        title: 'Turn passes early',
        severity: 'minor',
        at: 90,
        recording: { evidenceId: 'rec-1', reference: 'r', media: VIDEO },
      }),
      issue: { happened: 'The turn passed mid-move.' },
    })
    expect(view.severity).toEqual({ label: 'minor', tone: 'working' })
    expect(view.card.lines).toEqual([
      { label: 'Happened', value: 'The turn passed mid-move.' },
      { label: 'Where', value: '1:30' },
    ])
    expect(view.card.thumbnail).toEqual({
      kind: 'video',
      url: 'https://cdn.test/rec?grant=2',
      atSec: 90,
    })
    expect(view.card.actions.map((a) => [a.label, a.primary])).toEqual([['Play 1:30', true]])
    expect(view.open?.kind).toBe('video')
  })

  it('says where an issue was met before its run’s filings are read, and nothing when unknown', () => {
    const where = evidenceReferenceView({
      link: LINK,
      state: ready({ title: 'Nit', severity: 'nit', media: IMAGE }),
      issue: { happened: 'Odd.', view: '/menu' },
    })
    expect(where.card.lines).toEqual([
      { label: 'Happened', value: 'Odd.' },
      { label: 'Where', value: '/menu' },
    ])
    expect(where.severity).toEqual({ label: 'nit', tone: 'empty' })
    expect(where.card.actions.map((a) => a.label)).toEqual(['Open screenshot'])
    expect(where.open).toMatchObject({ caption: '/menu' })
    const bare = evidenceReferenceView({
      link: LINK,
      state: ready({ title: 'Nit', severity: 'blocker', media: IMAGE }),
    })
    expect(bare.card.lines).toEqual([])
    expect(bare.open).toMatchObject({ caption: 'Nit' })
  })

  it('offers an issue only what it has: a whole recording, or nothing to open', () => {
    const whole = evidenceReferenceView({
      link: LINK,
      state: ready({
        kind: 'report',
        title: 'Slow',
        severity: 'minor',
        recording: { evidenceId: 'rec-1', reference: 'r', media: VIDEO },
      }),
    })
    expect(whole.card.actions.map((a) => a.label)).toEqual([EVIDENCE_REFERENCE_COPY.play])
    expect(whole.card.thumbnail).toEqual({ kind: 'video', url: 'https://cdn.test/rec?grant=2' })
    expect(whole.open).toMatchObject({ kind: 'video', evidenceId: 'rec-1' })
    const still = evidenceReferenceView({
      link: LINK,
      state: ready({
        kind: 'report',
        title: 'Slow',
        severity: 'minor',
        recording: { evidenceId: 'rec-1', reference: 'r', media: IMAGE },
      }),
    })
    expect(still.card.actions).toEqual([])
    expect(still.card.thumbnail).toBeUndefined()
    expect(still.open).toBeUndefined()
  })

  it('names the step an item came from, when it was filed by one', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({
        media: IMAGE,
        owner: { processRunId: 'run', stepId: 'build', stepName: 'Build' },
      }),
    })
    expect(view.card.lines).toEqual([{ label: 'From', value: 'Build' }])
    expect(view.open).toMatchObject({ caption: 'Result screen · Build' })
  })

  it('reads a filed item without media by its kind, opening nothing in place', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({ kind: 'report', title: 'Verifier report' }),
    })
    expect(view.glyph).toBe('file')
    expect(view.card).toEqual({
      caption: 'Report',
      title: 'Verifier report',
      lines: [],
      actions: [],
    })
    expect(view.open).toBeUndefined()
  })

  it('reads a video item filed under another kind as a recording', () => {
    const view = evidenceReferenceView({
      link: LINK,
      state: ready({ kind: 'file', title: 'Clip', media: VIDEO }),
    })
    expect(view.glyph).toBe('recording')
    expect(view.card.caption).toBe('File')
  })

  it('reads an item that is gone calmly: dashed, not kept, with its citation', () => {
    const view = evidenceReferenceView({ link: { ...LINK, at: 8 }, state: { status: 'gone' } })
    expect(view).toEqual({
      phase: 'gone',
      glyph: 'gone',
      label: EVIDENCE_REFERENCE_COPY.evidence,
      time: '0:08',
      citation: '&wargames/evidence/a41c9e02-1111@8',
      card: {
        caption: EVIDENCE_REFERENCE_COPY.evidence,
        title: EVIDENCE_REFERENCE_COPY.goneTitle,
        lines: [
          { label: 'Why', value: EVIDENCE_REFERENCE_COPY.goneReason },
          { label: 'Cited as', value: 'wargames/a41c9e02@8' },
        ],
        actions: [],
      },
    })
  })

  it('reads an item still on its way, and one not readable now, by its moment', () => {
    const loading = evidenceReferenceView({
      link: { ...LINK, at: 90 },
      state: { status: 'loading' },
    })
    expect(loading).toMatchObject({
      phase: 'loading',
      glyph: 'recording',
      label: EVIDENCE_REFERENCE_COPY.evidence,
      time: '1:30',
      card: { title: EVIDENCE_REFERENCE_COPY.loading, lines: [], actions: [] },
    })
    expect(loading.open).toBeUndefined()
    const failed = evidenceReferenceView({ link: LINK, state: { status: 'failed' } })
    expect(failed).toMatchObject({
      phase: 'failed',
      glyph: 'file',
      card: {
        title: EVIDENCE_REFERENCE_COPY.failedTitle,
        lines: [{ label: '', value: EVIDENCE_REFERENCE_COPY.failedBody }],
      },
    })
    expect(failed.time).toBeUndefined()
  })
})
