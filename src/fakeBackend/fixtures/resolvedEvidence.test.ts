import { describe, expect, it } from 'vitest'

import { FAKE_EVIDENCE_IDS, type FakeEvidenceName } from './evidenceIdsConstants'
import { FAKE_PROJECT_ID } from './projects'
import { fakeEvidenceTargetOf, fakeResolvedEvidence } from './resolvedEvidence'
import { FAKE_EVIDENCE_IMAGE_URL, FAKE_EVIDENCE_VIDEO_URL } from './resolvedEvidenceConstants'
import { FAKE_RUN_THROUGH_RUN_ID } from './runThroughRun'
import { FAKE_SCRIPT_RUN_ID } from './scriptStepRun'
import { FAKE_VARIANT_RUN_ID } from './variantRun'

const UUID = '0b6f5a52-6c1e-4d0c-9a51-3f2f6a1d9e10'

const targetOf = (search: string) => fakeEvidenceTargetOf(new URLSearchParams(search))

const resolve = (name: FakeEvidenceName, at?: number) =>
  fakeResolvedEvidence({
    projectId: FAKE_PROJECT_ID,
    evidenceId: FAKE_EVIDENCE_IDS[name],
    ...(at !== undefined ? { at } : {}),
  })

describe('fakeEvidenceTargetOf', () => {
  it('reads a project and an item id, with a moment', () => {
    expect(targetOf('projectId=p1&evidenceId=e1&at=12.5')).toEqual({
      ok: true,
      target: { projectId: 'p1', evidenceId: 'e1', at: 12.5 },
    })
  })

  it('reads a reference, its own project and moment', () => {
    expect(targetOf(`reference=%26p1/evidence/${UUID}@90&at=3`)).toEqual({
      ok: true,
      target: { projectId: 'p1', evidenceId: UUID, at: 90 },
    })
  })

  it('reads a reference without its project in the one given beside it', () => {
    expect(targetOf(`reference=%26evidence/${UUID}&projectId=p2&at=3`)).toEqual({
      ok: true,
      target: { projectId: 'p2', evidenceId: UUID, at: 3 },
    })
  })

  it.each([
    ['no item', 'projectId=p1', /Name the evidence/],
    ['no project', 'evidenceId=e1', /Name the project/],
    ['the item twice', `reference=%26p1/evidence/${UUID}&evidenceId=e1`, /not both/],
    ['a reference to something else', 'reference=%23p1/story-1', /not a reference/],
    ['an item id that is no id', 'reference=%26p1/evidence/current-sign-up', /not a reference/],
    ['a moment that is no number', 'projectId=p1&evidenceId=e1&at=soon', /at/],
    ['a moment before the start', 'projectId=p1&evidenceId=e1&at=-1', /at/],
  ])('refuses %s, saying why', (_, search, why) => {
    const reading = targetOf(search)
    expect(reading.ok).toBe(false)
    expect(reading.ok ? '' : reading.error).toMatch(why)
  })
})

describe('fakeResolvedEvidence', () => {
  it('resolves a recording a variant filed, as a video the fake serves inline', () => {
    expect(resolve('current-sign-up')).toEqual({
      projectId: FAKE_PROJECT_ID,
      evidenceId: FAKE_EVIDENCE_IDS['current-sign-up'],
      reference: `&${FAKE_PROJECT_ID}/evidence/${FAKE_EVIDENCE_IDS['current-sign-up']}`,
      kind: 'recording',
      title: 'Sign-up form',
      media: {
        kind: 'video',
        mediaType: 'video/webm',
        url: FAKE_EVIDENCE_VIDEO_URL,
        expiresAt: expect.any(String),
      },
      runId: 'run-variant-current',
      owner: { processRunId: 'run-variant-current' },
      createdAt: 2,
    })
  })

  it('resolves a screenshot a stopped variant filed, as an image the fake serves inline', () => {
    expect(resolve('short-stopped')).toMatchObject({
      kind: 'screenshot',
      title: 'Where the script stopped',
      media: { kind: 'image', mediaType: 'image/svg+xml', url: FAKE_EVIDENCE_IMAGE_URL },
    })
  })

  it('resolves what the script step and the variants run itself filed, each under its run', () => {
    expect(resolve('stopped-shot')?.owner).toEqual({ processRunId: FAKE_SCRIPT_RUN_ID })
    expect(resolve('final-report')?.owner).toEqual({ processRunId: FAKE_VARIANT_RUN_ID })
  })

  it('shows a report or a log with no media', () => {
    expect(resolve('final-report')).not.toHaveProperty('media')
    expect(resolve('step-log-stopped')).not.toHaveProperty('media')
  })

  it('keeps the moment asked for in the item and its reference, to the tenth', () => {
    expect(resolve('script-recording', 61.04)).toMatchObject({
      at: 61.04,
      reference: `&${FAKE_PROJECT_ID}/evidence/${FAKE_EVIDENCE_IDS['script-recording']}@61`,
    })
  })

  it('hands out media that does not expire while it is shown', () => {
    const expiresAt = resolve('current-sign-up')?.media?.expiresAt ?? ''
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now())
  })

  it('serves the inline media as data the browser loads', () => {
    expect(FAKE_EVIDENCE_IMAGE_URL).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(FAKE_EVIDENCE_VIDEO_URL).toMatch(/^data:video\/webm;base64,GkXfo/)
  })

  it('resolves an issue with its severity, and its recording at the moment it was met', () => {
    const recording = FAKE_EVIDENCE_IDS['run-through-recording']
    expect(resolve('run-through-blocker')).toMatchObject({
      kind: 'screenshot',
      title: 'Create account does nothing',
      severity: 'blocker',
      media: { kind: 'image', url: FAKE_EVIDENCE_IMAGE_URL },
      at: 42,
      reference: `&${FAKE_PROJECT_ID}/evidence/${FAKE_EVIDENCE_IDS['run-through-blocker']}@42`,
      recording: {
        evidenceId: recording,
        reference: `&${FAKE_PROJECT_ID}/evidence/${recording}@42`,
        media: { kind: 'video', url: FAKE_EVIDENCE_VIDEO_URL },
      },
      owner: { processRunId: FAKE_RUN_THROUGH_RUN_ID },
    })
  })

  it('opens an issue with no moment of its own at the moment asked for, or at none', () => {
    expect(resolve('run-through-minor')).toMatchObject({ severity: 'minor' })
    expect(resolve('run-through-minor')).not.toHaveProperty('at')
    expect(resolve('run-through-major', 7)?.recording?.reference).toMatch(/@7$/)
  })

  it('finds nothing for an item the fixtures never filed, or in another project', () => {
    expect(fakeResolvedEvidence({ projectId: FAKE_PROJECT_ID, evidenceId: UUID })).toBe(undefined)
    expect(
      fakeResolvedEvidence({
        projectId: 'wargames',
        evidenceId: FAKE_EVIDENCE_IDS['current-sign-up'],
      }),
    ).toBe(undefined)
  })
})
