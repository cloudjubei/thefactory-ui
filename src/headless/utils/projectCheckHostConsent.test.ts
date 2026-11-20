import { describe, expect, it } from 'vitest'

import {
  hostCheckConsentAskView,
  hostCheckConsentFromRequest,
  hostCheckConsentOf,
  hostCheckConsentWords,
  isHostCheckConsentKind,
  withHostCheckConsentAllowLabel,
} from './projectCheckHostConsent'
import {
  PROJECT_CHECK_HOST_CONSENT_ALLOW,
  PROJECT_CHECK_HOST_CONSENT_ASK,
  PROJECT_CHECK_HOST_CONSENT_HEADING,
  PROJECT_CHECK_HOST_CONSENT_KIND,
  PROJECT_CHECK_HOST_CONSENT_LEAD,
  PROJECT_CHECK_HOST_CONSENT_NEED,
  PROJECT_CHECK_HOST_CONSENT_TITLE,
} from './projectCheckHostConsentConstants'
import { PROCESS_RUN_NEED_PERMISSIONS } from './processRunAttentionConstants'
import { WAITING_PERMISSION_HEADINGS } from './processWaitingViewConstants'

const payload = {
  title: PROJECT_CHECK_HOST_CONSENT_TITLE,
  projectId: 'p',
  hostReason: 'No sandbox image has python3.',
  commands: ['pytest', 'ruff check'],
  checkIds: ['unit', 'lint'],
  detail: [
    'No sandbox image has python3.',
    PROJECT_CHECK_HOST_CONSENT_LEAD,
    'pytest',
    'ruff check',
  ].join('\n'),
}

describe('isHostCheckConsentKind', () => {
  it('recognises the broker kind', () => {
    expect(isHostCheckConsentKind(PROJECT_CHECK_HOST_CONSENT_KIND)).toBe(true)
    expect(isHostCheckConsentKind('network-unlock')).toBe(false)
  })
})

describe('hostCheckConsentOf', () => {
  it('reads the backend park payload', () => {
    expect(hostCheckConsentOf(payload)).toEqual({
      title: PROJECT_CHECK_HOST_CONSENT_TITLE,
      hostReason: 'No sandbox image has python3.',
      commands: ['pytest', 'ruff check'],
      checkIds: ['unit', 'lint'],
    })
  })

  it('ignores a payload without commands', () => {
    expect(hostCheckConsentOf({ hostReason: 'x', commands: [] })).toBeUndefined()
    expect(hostCheckConsentOf({ hostReason: 'x' })).toBeUndefined()
  })

  it('ignores a commands-only object with no consent markers', () => {
    expect(hostCheckConsentOf({ commands: ['echo hi'] })).toBeUndefined()
  })

  it('ignores title+commands without hostReason, checkIds or kind', () => {
    expect(
      hostCheckConsentOf({
        title: PROJECT_CHECK_HOST_CONSENT_TITLE,
        commands: ['pytest'],
      }),
    ).toBeUndefined()
  })

  it('accepts commands with hostReason, checkIds or an explicit kind', () => {
    expect(hostCheckConsentOf({ hostReason: 'no image', commands: ['pytest'] })?.commands).toEqual([
      'pytest',
    ])
    expect(hostCheckConsentOf({ checkIds: ['unit'], commands: ['pytest'] })?.checkIds).toEqual([
      'unit',
    ])
    expect(
      hostCheckConsentOf({
        kind: PROJECT_CHECK_HOST_CONSENT_KIND,
        commands: ['pytest'],
      })?.commands,
    ).toEqual(['pytest'])
  })
})

describe('host-check consent heading copy', () => {
  it('is shared with the waiting and attention maps', () => {
    expect(WAITING_PERMISSION_HEADINGS[PROJECT_CHECK_HOST_CONSENT_KIND]).toBe(
      PROJECT_CHECK_HOST_CONSENT_HEADING,
    )
    expect(PROCESS_RUN_NEED_PERMISSIONS[PROJECT_CHECK_HOST_CONSENT_KIND]!({})).toBe(
      PROJECT_CHECK_HOST_CONSENT_NEED,
    )
  })
})

describe('hostCheckConsentFromRequest', () => {
  it('reads from args when the kind is host-check consent', () => {
    expect(
      hostCheckConsentFromRequest({
        actionKind: PROJECT_CHECK_HOST_CONSENT_KIND,
        args: payload,
      }),
    ).toMatchObject({ commands: ['pytest', 'ruff check'] })
  })

  it('reads the payload shape even without the kind', () => {
    expect(hostCheckConsentFromRequest({ args: payload })?.hostReason).toBe(
      'No sandbox image has python3.',
    )
  })
})

describe('hostCheckConsentWords', () => {
  it('puts the reason and the lead above the command list', () => {
    const view = hostCheckConsentOf(payload)!
    expect(hostCheckConsentWords(view)).toBe(
      `No sandbox image has python3.\n\n${PROJECT_CHECK_HOST_CONSENT_LEAD}`,
    )
  })
})

describe('withHostCheckConsentAllowLabel', () => {
  it('renames Allow to Allow for this project', () => {
    expect(
      withHostCheckConsentAllowLabel([
        { choice: 'allow', label: 'Allow' },
        { choice: 'abandon', label: 'Stop' },
      ]),
    ).toEqual([
      { choice: 'allow', label: PROJECT_CHECK_HOST_CONSENT_ALLOW },
      { choice: 'abandon', label: 'Stop' },
    ])
  })
})

describe('hostCheckConsentAskView', () => {
  it('lists the commands and offers Allow for this project', () => {
    const view = hostCheckConsentAskView(hostCheckConsentOf(payload)!)
    expect(view).toMatchObject({
      ask: PROJECT_CHECK_HOST_CONSENT_ASK.ask,
      tag: PROJECT_CHECK_HOST_CONSENT_ASK.tag,
      headline: PROJECT_CHECK_HOST_CONSENT_TITLE,
      verb: PROJECT_CHECK_HOST_CONSENT_ALLOW,
      why: 'No sandbox image has python3.',
      body: {
        kind: 'host-check-consent',
        lead: PROJECT_CHECK_HOST_CONSENT_LEAD,
        commands: ['pytest', 'ruff check'],
      },
    })
  })
})
