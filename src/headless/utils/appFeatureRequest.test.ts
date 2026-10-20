import { describe, expect, it } from 'vitest'
import {
  featureRequestBody,
  featureRequestDeclined,
  featureRequestDraftError,
  featureRequestLines,
  featureRequestLinesText,
  featureRequestSent,
  isFeatureRequestRequest,
  parseFeatureRequestPayload,
} from './appFeatureRequest'
import {
  APP_FEATURE_REQUEST_LISTS_INVALID,
  APP_FEATURE_REQUEST_OWN_PROJECT,
  APP_FEATURE_REQUEST_TARGET_REQUIRED,
  APP_FEATURE_REQUEST_TITLE_REQUIRED,
} from './appFeatureRequestConstants'
import type { AppFeatureRequestDraft } from './appFeatureRequestTypes'

const draft: AppFeatureRequestDraft = {
  targetProjectId: 'thefactory-knowledge',
  title: 'Explorer subagent',
  summary: 'A cheap explorer that returns map citations.',
  description: '',
  doneWhen: ['The chat delegates code search to it.'],
  references: ['refs/fastcontext.md'],
}

describe('isFeatureRequestRequest', () => {
  it('matches feature.request', () => {
    expect(isFeatureRequestRequest({ type: 'overseer:feature.request' })).toBe(true)
  })

  it('does not match another message', () => {
    expect(isFeatureRequestRequest({ type: 'overseer:work.start' })).toBe(false)
  })
})

describe('parseFeatureRequestPayload', () => {
  it('reads every field, trimmed', () => {
    expect(
      parseFeatureRequestPayload({
        targetProjectId: ' thefactory-knowledge ',
        title: ' Explorer subagent ',
        summary: ' A cheap explorer that returns map citations. ',
        description: ' ',
        doneWhen: [' The chat delegates code search to it. ', ' '],
        references: ['refs/fastcontext.md'],
      }),
    ).toEqual(draft)
  })

  it('reads a request with only a project and a title', () => {
    expect(parseFeatureRequestPayload({ targetProjectId: 'p', title: 'T' })).toEqual({
      targetProjectId: 'p',
      title: 'T',
      summary: '',
      description: '',
      doneWhen: [],
      references: [],
    })
  })

  it.each([undefined, null, 'x', [], { title: 'T' }, { targetProjectId: ' ', title: 'T' }])(
    'asks for the project in %j',
    (payload) => {
      expect(parseFeatureRequestPayload(payload)).toEqual({
        error: APP_FEATURE_REQUEST_TARGET_REQUIRED,
      })
    },
  )

  it('asks for a title', () => {
    expect(parseFeatureRequestPayload({ targetProjectId: 'p', title: 7 })).toEqual({
      error: APP_FEATURE_REQUEST_TITLE_REQUIRED,
    })
  })

  it.each([{ doneWhen: 'x' }, { references: [1] }, { doneWhen: {} }])(
    'refuses lists that are not lists of text: %j',
    (extra) => {
      expect(parseFeatureRequestPayload({ targetProjectId: 'p', title: 'T', ...extra })).toEqual({
        error: APP_FEATURE_REQUEST_LISTS_INVALID,
      })
    },
  )
})

describe('featureRequestDraftError', () => {
  it('passes a request to another project with a title', () => {
    expect(featureRequestDraftError(draft, 'thefactory-references')).toBeNull()
  })

  it('asks for the title the person cleared', () => {
    expect(featureRequestDraftError({ ...draft, title: ' ' }, 'thefactory-references')).toBe(
      APP_FEATURE_REQUEST_TITLE_REQUIRED,
    )
  })

  it('refuses a request to the project it comes from', () => {
    expect(featureRequestDraftError(draft, 'thefactory-knowledge')).toBe(
      APP_FEATURE_REQUEST_OWN_PROJECT,
    )
  })
})

describe('featureRequestBody', () => {
  it('sends what was asked, from the app’s project', () => {
    expect(featureRequestBody('thefactory-references', draft)).toEqual({
      targetProjectId: 'thefactory-knowledge',
      fromProjectId: 'thefactory-references',
      title: 'Explorer subagent',
      summary: 'A cheap explorer that returns map citations.',
      doneWhen: [{ text: 'The chat delegates code search to it.' }],
      references: ['refs/fastcontext.md'],
    })
  })

  it('sends done-when lines trimmed, without the blank ones', () => {
    expect(featureRequestBody('a', { ...draft, doneWhen: [' first ', '', '  '] }).doneWhen).toEqual(
      [{ text: 'first' }],
    )
  })

  it('leaves out what is empty', () => {
    expect(
      featureRequestBody('a', {
        ...draft,
        summary: ' ',
        description: 'Why.',
        doneWhen: [],
        references: [],
      }),
    ).toEqual({
      targetProjectId: 'thefactory-knowledge',
      fromProjectId: 'a',
      title: 'Explorer subagent',
      description: 'Why.',
    })
  })
})

describe('featureRequestLines', () => {
  it('keeps every line as typed, so a new empty line stays while it is written', () => {
    expect(featureRequestLines('first\n')).toEqual(['first', ''])
  })

  it('writes entries back as lines', () => {
    expect(featureRequestLinesText(['first', 'second'])).toBe('first\nsecond')
  })
})

describe('replies', () => {
  it('says sent with the request it made', () => {
    expect(featureRequestSent('r1')).toEqual({ status: 'sent', requestId: 'r1' })
  })

  it('says declined, with a reason when there is one', () => {
    expect(featureRequestDeclined()).toEqual({ status: 'declined' })
    expect(featureRequestDeclined('closed')).toEqual({ status: 'declined', reason: 'closed' })
  })
})
