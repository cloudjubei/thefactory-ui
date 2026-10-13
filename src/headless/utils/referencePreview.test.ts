import { describe, expect, it } from 'vitest'
import type { ProcessRun, ReferenceDescription } from 'thefactory-tools/types'
import { processRunBadge } from './processView'
import { referencePreview, runReferencePreview } from './referencePreview'

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'b205ae55-0000-4000-8000-000000000000',
    projectId: 'tools',
    title: 'Test-fixture rework',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story delivery',
      steps: [
        { id: 'impl', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    ...over,
  } as ProcessRun
}

const RUN_LINK = { kind: 'run', projectId: 'tools', runId: 'b205ae55-0000-4000-8000-000000000000' }

describe('referencePreview', () => {
  it('shows a story by its number and title, its status as a pill, and opens it', () => {
    const description: ReferenceDescription = {
      kind: 'story',
      label: '#7',
      detail: 'Agent types',
      title: 'Agent types',
      status: 'in_progress',
      facts: [{ label: 'Features', value: '2 · 1 done' }],
      link: { kind: 'story', projectId: 'tools', storyId: 's7' },
    }
    expect(referencePreview(description)).toEqual({
      caption: 'Story',
      title: '#7 Agent types',
      status: { label: 'Working', tone: 'working' },
      lines: [{ label: 'Features', value: '2 · 1 done' }],
      primary: { label: 'Open story', link: description.link },
    })
  })

  it('names another project in the caption, not twice in the title', () => {
    const view = referencePreview({
      kind: 'feature',
      label: 'Backend #6.1',
      title: 'sendChatMessage tool',
      status: 'deferred',
      projectName: 'Backend',
      facts: [{ label: 'Project', value: 'Backend' }],
      link: { kind: 'feature', projectId: 'backend', storyId: 's', featureId: 'f' },
    })
    expect(view.caption).toBe('Feature in Backend')
    expect(view.title).toBe('#6.1 sendChatMessage tool')
    expect(view.status).toEqual({ label: 'Deferred', tone: 'on_hold' })
  })

  it('tells a folder from a file, and shows a note’s description as its line', () => {
    expect(
      referencePreview({
        kind: 'file',
        label: '.factory/agentTypes/',
        link: { kind: 'file', projectId: 'p', path: '.factory/agentTypes/' },
      }),
    ).toMatchObject({ caption: 'Folder', lines: [], primary: { label: 'Open in Files' } })
    expect(referencePreview({ kind: 'note', label: 'drafts/' }).caption).toBe('Note')
    expect(referencePreview({ kind: 'note', label: 'QA login', detail: 'Test account' })).toEqual({
      caption: 'Note',
      title: 'QA login',
      lines: [{ label: '', value: 'Test account' }],
    })
  })

  it('says a reference is being looked up while its project loads, with nothing to open', () => {
    expect(
      referencePreview({
        kind: 'story',
        label: 'Backend',
        detail: 'Looking it up',
        loading: true,
        projectName: 'Backend',
        link: { kind: 'story', projectId: 'backend', storyId: 's' },
      }),
    ).toEqual({
      caption: 'Looking it up',
      title: 'Backend',
      lines: [{ label: '', value: 'Looking it up' }],
    })
  })

  it('says what is gone is not found, and offers nothing to open', () => {
    expect(
      referencePreview({
        kind: 'feature',
        label: '#?',
        detail: 'This feature no longer exists',
        missing: true,
        link: { kind: 'feature', projectId: 'p', storyId: 's', featureId: 'f' },
      }),
    ).toEqual({
      caption: 'Not found',
      title: '#?',
      lines: [{ label: '', value: 'This feature no longer exists' }],
    })
  })

  it('leaves out a status it does not know', () => {
    expect(
      referencePreview({ kind: 'story', label: '#1', title: 'X', status: 'weird' }).status,
    ).toBeUndefined()
  })
})

describe('runReferencePreview', () => {
  it('shows a run at its sign-off: its story, the step waiting, its time and cost', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'sign-off', message: 'Sign it off', parkedAt: 0 },
      totals: { workMs: 7_800_000, costUsd: 1.8, at: 0, ticking: false } as ProcessRun['totals'],
    })
    expect(runReferencePreview(r, { now: 0, story: '#8 Fixture rework' })).toEqual({
      caption: 'Process run',
      title: 'Test-fixture rework',
      status: processRunBadge(r),
      lines: [
        { label: 'Story', value: '#8 Fixture rework' },
        { label: 'Step', value: 'Sign-off · waiting for you' },
        { label: 'Time', value: expect.stringMatching(/^2h 10m · \$1\.80$/) },
      ],
      primary: { label: 'Open sign-off', link: RUN_LINK },
      offersChat: true,
    })
  })

  it('asks for an answer when a step waits on the person, saying what it needs', () => {
    const view = runReferencePreview(
      run({
        status: 'parked',
        park: { reason: 'step-failed', stepId: 'impl', message: 'Retry or stop?', parkedAt: 0 },
      }),
      { now: 0 },
    )
    expect(view.lines).toEqual([{ label: 'Needs', value: 'Retry or stop?' }])
    expect(view.primary).toEqual({ label: 'Answer', link: RUN_LINK })
  })

  it('names the step a running run is on, and opens the run', () => {
    const view = runReferencePreview(
      run({
        cursor: { stepId: 'impl' },
        ledger: [{ id: 'e1', stepId: 'impl', iteration: 1, status: 'running', startedAt: 0 }],
      } as Partial<ProcessRun>),
      { now: 0 },
    )
    expect(view.lines).toEqual([{ label: 'Step', value: 'Implement' }])
    expect(view.primary).toEqual({ label: 'Open run', link: RUN_LINK })
  })

  it('names no step once the run has ended', () => {
    expect(
      runReferencePreview(
        run({ status: 'succeeded', cursor: { stepId: 'impl' } } as Partial<ProcessRun>),
        {
          now: 0,
        },
      ).lines,
    ).toEqual([])
  })

  it('offers no run chat on a nested run, whose chat is its parent’s', () => {
    expect(runReferencePreview(run({ parentRunId: 'p1' }), { now: 0 }).offersChat).toBe(false)
  })
})
