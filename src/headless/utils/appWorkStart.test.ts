import { describe, expect, it } from 'vitest'
import {
  isWorkStartRequest,
  parseWorkStartPayload,
  workStartDeclined,
  workStartDraftError,
  workStartEditable,
  workStartFeatures,
  workStartStarted,
} from './appWorkStart'
import {
  APP_WORK_START_FEATURE_TITLE_REQUIRED,
  APP_WORK_START_FEATURES_INVALID,
  APP_WORK_START_PROCESS_INVALID,
  APP_WORK_START_TITLE_REQUIRED,
} from './appWorkStartConstants'

describe('isWorkStartRequest', () => {
  it('matches work.start only', () => {
    expect(isWorkStartRequest({ type: 'overseer:work.start' })).toBe(true)
    expect(isWorkStartRequest({ type: 'overseer:work.started' })).toBe(false)
    expect(isWorkStartRequest({ type: 'overseer:story.create' })).toBe(false)
  })
})

describe('parseWorkStartPayload', () => {
  it('reads the title, description and features, trimmed', () => {
    expect(
      parseWorkStartPayload({
        title: ' Official sources: apply r3 ',
        description: 'Carry the decisions out.\n',
        features: [{ title: ' Apply r3 ', description: 'Transcribe r3.' }],
      }),
    ).toEqual({
      title: 'Official sources: apply r3',
      description: 'Carry the decisions out.',
      features: [{ title: 'Apply r3', description: 'Transcribe r3.' }],
    })
  })

  it('reads work with no features and no description', () => {
    expect(parseWorkStartPayload({ title: 'Fix it' })).toEqual({
      title: 'Fix it',
      description: '',
      features: [],
    })
  })

  it('reads a feature with no description', () => {
    expect(parseWorkStartPayload({ title: 'T', features: [{ title: 'F' }] })).toEqual({
      title: 'T',
      description: '',
      features: [{ title: 'F', description: '' }],
    })
  })

  it.each([undefined, null, 'T', [], {}, { title: '  ' }, { title: 7 }])(
    'asks for a title in %j',
    (payload) => {
      expect(parseWorkStartPayload(payload)).toEqual({ error: APP_WORK_START_TITLE_REQUIRED })
    },
  )

  it.each([{ features: 'a' }, { features: {} }, { features: ['a'] }, { features: [null] }])(
    'refuses malformed features %j',
    (extra) => {
      expect(parseWorkStartPayload({ title: 'T', ...extra })).toEqual({
        error: APP_WORK_START_FEATURES_INVALID,
      })
    },
  )

  it('reads the process the work runs by, trimmed', () => {
    expect(parseWorkStartPayload({ title: 'T', processId: ' reference-intake ' })).toEqual({
      title: 'T',
      description: '',
      features: [],
      processId: 'reference-intake',
    })
  })

  it.each([' ', '../x', 'a b', 7])('refuses a process id that is not one: %j', (processId) => {
    expect(parseWorkStartPayload({ title: 'T', processId })).toEqual({
      error: APP_WORK_START_PROCESS_INVALID,
    })
  })

  it('asks for a title on every feature', () => {
    expect(parseWorkStartPayload({ title: 'T', features: [{ description: 'd' }] })).toEqual({
      error: APP_WORK_START_FEATURE_TITLE_REQUIRED,
    })
  })
})

describe('workStartDraftError', () => {
  const draft = { title: 'T', description: '', features: [{ title: 'F', description: '' }] }

  it('passes a draft with a title and titled features', () => {
    expect(workStartDraftError(draft)).toBeNull()
  })

  it('asks for the title the person cleared', () => {
    expect(workStartDraftError({ ...draft, title: ' ' })).toBe(APP_WORK_START_TITLE_REQUIRED)
  })

  it('asks for a feature title the person cleared', () => {
    expect(workStartDraftError({ ...draft, features: [{ title: '', description: 'd' }] })).toBe(
      APP_WORK_START_FEATURE_TITLE_REQUIRED,
    )
  })
})

describe('workStartFeatures', () => {
  it('makes the features asked for, trimmed', () => {
    expect(
      workStartFeatures({
        title: 'T',
        description: 'D',
        features: [{ title: ' A ', description: ' a ' }],
      }),
    ).toEqual([{ title: 'A', description: 'a' }])
  })

  it('makes the work one feature when none were asked for, since a run works features', () => {
    expect(workStartFeatures({ title: ' T ', description: ' D ', features: [] })).toEqual([
      { title: 'T', description: 'D' },
    ])
  })
})

describe('workStartEditable', () => {
  it('is editable until the story exists and while nothing runs', () => {
    expect(workStartEditable({ busy: false, progress: {} })).toBe(true)
    expect(workStartEditable({ busy: true, progress: {} })).toBe(false)
    expect(workStartEditable({ busy: false, progress: { storyId: 's1' } })).toBe(false)
  })
})

describe('replies', () => {
  it('says started with the story and, when one started, the run', () => {
    expect(workStartStarted('s1', 'r1')).toEqual({ status: 'started', storyId: 's1', runId: 'r1' })
    expect(workStartStarted('s1')).toEqual({ status: 'started', storyId: 's1' })
  })

  it('says declined, with a reason when there is one', () => {
    expect(workStartDeclined()).toEqual({ status: 'declined' })
    expect(workStartDeclined('closed')).toEqual({ status: 'declined', reason: 'closed' })
  })
})
