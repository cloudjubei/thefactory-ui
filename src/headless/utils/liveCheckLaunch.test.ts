import { describe, expect, it } from 'vitest'
import type { LaunchProofPlan } from 'thefactory-tools/types'

import {
  changeGroupLiveCheckPick,
  changeLiveCheckDraft,
  groupLaunchLiveCheckMetadata,
  groupLegLiveCheckRows,
  isLiveCheckMode,
  launchLiveCheckView,
  launchStartDraft,
  liveCheckDraftOf,
  liveCheckOfferDraft,
  liveCheckOptionsOf,
  liveCheckSecretHint,
  withLiveCheckChip,
  withLiveCheckDraft,
} from './liveCheckLaunch'
import {
  LIVE_CHECK_CHOICE_LINES,
  LIVE_CHECK_CHOICE_OPTIONS,
  LIVE_CHECK_COPY,
} from './liveCheckLaunchConstants'
import type { GroupLegLiveCheckOffer, LiveCheckOffer } from './liveCheckLaunchTypes'
import type { ProposalChip } from './processProposalView'

const offer = (over: Partial<LiveCheckOffer> = {}): LiveCheckOffer => ({
  platform: 'android',
  accounts: ['qa'],
  advice: 'Recommended: ask me.',
  ...over,
})

const plan = (over: Partial<LaunchProofPlan> = {}): LaunchProofPlan => ({
  featureId: 'f1',
  title: 'Feed',
  source: 'suggested',
  plan: { kinds: ['unit-tests', 'manual'] },
  ...over,
})

describe('isLiveCheckMode', () => {
  it('holds for the two modes only', () => {
    expect(isLiveCheckMode('required')).toBe(true)
    expect(isLiveCheckMode('ask-me')).toBe(true)
    expect(isLiveCheckMode('off')).toBe(false)
    expect(isLiveCheckMode(undefined)).toBe(false)
  })
})

describe('liveCheckDraftOf', () => {
  it('is off while the plan holds no live-check kind, whatever options linger', () => {
    expect(
      liveCheckDraftOf({
        kinds: ['unit-tests'],
        liveCheck: { mode: 'ask-me', beforeAndAfter: true },
      }),
    ).toEqual({ choice: 'off', beforeAndAfter: false })
  })

  it('reads the mode and before and after the plan carries', () => {
    expect(
      liveCheckDraftOf({
        kinds: ['live-check'],
        liveCheck: { mode: 'ask-me', beforeAndAfter: true },
      }),
    ).toEqual({ choice: 'ask-me', beforeAndAfter: true })
  })

  it('reads the kind without options as required, only the after', () => {
    expect(liveCheckDraftOf({ kinds: ['live-check'] })).toEqual({
      choice: 'required',
      beforeAndAfter: false,
    })
  })
})

describe('liveCheckOfferDraft', () => {
  it('starts from the recommended mode, before and after off', () => {
    expect(liveCheckOfferDraft({ recommended: 'required' })).toEqual({
      choice: 'required',
      beforeAndAfter: false,
    })
  })

  it('starts off when nothing is recommended', () => {
    expect(liveCheckOfferDraft({})).toEqual({ choice: 'off', beforeAndAfter: false })
  })
})

describe('liveCheckOptionsOf', () => {
  it('sends nothing while off', () => {
    expect(liveCheckOptionsOf({ choice: 'off', beforeAndAfter: true })).toBeUndefined()
  })

  it('sends beforeAndAfter only when it is on', () => {
    expect(liveCheckOptionsOf({ choice: 'ask-me', beforeAndAfter: false })).toEqual({
      mode: 'ask-me',
    })
    expect(liveCheckOptionsOf({ choice: 'required', beforeAndAfter: true })).toEqual({
      mode: 'required',
      beforeAndAfter: true,
    })
  })
})

describe('changeLiveCheckDraft', () => {
  it('keeps before and after across a mode switch', () => {
    expect(
      changeLiveCheckDraft({ choice: 'required', beforeAndAfter: true }, { choice: 'ask-me' }),
    ).toEqual({ choice: 'ask-me', beforeAndAfter: true })
  })

  it('turns before and after off with the check', () => {
    expect(
      changeLiveCheckDraft({ choice: 'ask-me', beforeAndAfter: true }, { choice: 'off' }),
    ).toEqual({ choice: 'off', beforeAndAfter: false })
  })

  it('cannot turn before and after on while off', () => {
    expect(
      changeLiveCheckDraft({ choice: 'off', beforeAndAfter: false }, { beforeAndAfter: true }),
    ).toEqual({
      choice: 'off',
      beforeAndAfter: false,
    })
  })

  it('toggles before and after on a mode', () => {
    expect(
      changeLiveCheckDraft({ choice: 'required', beforeAndAfter: false }, { beforeAndAfter: true }),
    ).toEqual({ choice: 'required', beforeAndAfter: true })
  })
})

describe('withLiveCheckDraft', () => {
  it('puts the kind in its canonical place with its options', () => {
    expect(
      withLiveCheckDraft(
        { kinds: ['unit-tests', 'manual'], notes: 'n' },
        { choice: 'ask-me', beforeAndAfter: true },
      ),
    ).toEqual({
      kinds: ['unit-tests', 'live-check', 'manual'],
      notes: 'n',
      liveCheck: { mode: 'ask-me', beforeAndAfter: true },
    })
  })

  it('takes the kind and its options out when off', () => {
    expect(
      withLiveCheckDraft(
        { kinds: ['live-check', 'unit-tests'], notes: '', liveCheck: { mode: 'required' } },
        { choice: 'off', beforeAndAfter: false },
      ),
    ).toEqual({ kinds: ['unit-tests'], notes: '' })
  })

  it('never lists the kind twice', () => {
    const draft = withLiveCheckDraft(
      { kinds: ['live-check'], notes: '' },
      { choice: 'required', beforeAndAfter: false },
    )
    expect(draft.kinds).toEqual(['live-check'])
  })
})

describe('launchStartDraft', () => {
  it('adds the recommended live check to a plan holding none', () => {
    const draft = launchStartDraft(plan({ liveCheckOffer: offer({ recommended: 'ask-me' }) }))
    expect(draft.kinds).toEqual(['unit-tests', 'live-check', 'manual'])
    expect(draft.liveCheck).toEqual({ mode: 'ask-me' })
  })

  it('keeps the plan as it is when nothing is recommended', () => {
    expect(launchStartDraft(plan({ liveCheckOffer: offer() }))).toEqual({
      kinds: ['unit-tests', 'manual'],
      notes: '',
    })
  })

  it('keeps a live check the plan already holds over the recommendation', () => {
    const draft = launchStartDraft(
      plan({
        plan: { kinds: ['live-check'], liveCheck: { mode: 'required', beforeAndAfter: true } },
        liveCheckOffer: offer({ recommended: 'ask-me' }),
      }),
    )
    expect(draft.liveCheck).toEqual({ mode: 'required', beforeAndAfter: true })
  })

  it('leaves a feature offered none untouched, notes kept', () => {
    expect(launchStartDraft(plan({ plan: { kinds: ['checks'], notes: 'Show it' } }))).toEqual({
      kinds: ['checks'],
      notes: 'Show it',
    })
  })
})

describe('liveCheckSecretHint', () => {
  it('asks to make an open logins note a secret', () => {
    expect(liveCheckSecretHint({ openNote: true })).toBe(LIVE_CHECK_COPY.secretHint)
  })

  it('says nothing when the logins are secret', () => {
    expect(liveCheckSecretHint({})).toBeUndefined()
  })
})

describe('launchLiveCheckView', () => {
  it('shows off with no toggle, the advice and a muted chip', () => {
    const view = launchLiveCheckView(offer(), { choice: 'off', beforeAndAfter: false })
    expect(view).toEqual({
      choice: 'off',
      options: LIVE_CHECK_CHOICE_OPTIONS,
      showsBeforeAndAfter: false,
      beforeAndAfter: false,
      line: LIVE_CHECK_CHOICE_LINES.off,
      advice: 'Recommended: ask me.',
      chip: 'Live check: Off',
    })
  })

  it('shows the toggle while on and says what is walked', () => {
    const after = launchLiveCheckView(offer({ recommended: 'required' }), {
      choice: 'required',
      beforeAndAfter: false,
    })
    expect(after.showsBeforeAndAfter).toBe(true)
    expect(after.line).toBe(
      `${LIVE_CHECK_CHOICE_LINES.required} ${LIVE_CHECK_COPY.beforeAndAfterOff}`,
    )
    expect(after.recommended).toBe('required')
    expect(after.chip).toBe('Live check: Required')
    const both = launchLiveCheckView(offer(), { choice: 'ask-me', beforeAndAfter: true })
    expect(both.beforeAndAfter).toBe(true)
    expect(both.line).toBe(
      `${LIVE_CHECK_CHOICE_LINES['ask-me']} ${LIVE_CHECK_COPY.beforeAndAfterOn}`,
    )
    expect(both.chip).toBe('Live check: Ask me')
  })

  it('carries the secret hint for an open logins note', () => {
    expect(
      launchLiveCheckView(offer({ openNote: true }), { choice: 'off', beforeAndAfter: false })
        .secretHint,
    ).toBe(LIVE_CHECK_COPY.secretHint)
  })

  it('says picking a check lets the run use logins kept in a note that asks first', () => {
    expect(
      launchLiveCheckView(offer({ askFirstNote: true }), { choice: 'off', beforeAndAfter: false })
        .clearsLogins,
    ).toBe(LIVE_CHECK_COPY.clearsLogins)
    expect(
      launchLiveCheckView(offer(), { choice: 'required', beforeAndAfter: false }),
    ).not.toHaveProperty('clearsLogins')
  })

  it('never names an account', () => {
    const view = launchLiveCheckView(offer({ accounts: ['qa-admin'] }), {
      choice: 'ask-me',
      beforeAndAfter: false,
    })
    expect(JSON.stringify(view)).not.toContain('qa-admin')
  })
})

const legOffers: GroupLegLiveCheckOffer[] = [
  { featureId: 'f1', title: 'Feed', offer: offer({ recommended: 'ask-me' }) },
  { featureId: 'f2', title: 'Inbox', offer: offer() },
]
const legs = [{ projectId: 'web', liveCheckOffers: legOffers }, { projectId: 'api' }]

describe('groupLegLiveCheckRows', () => {
  it('lists each offered feature at its start', () => {
    const rows = groupLegLiveCheckRows(legs[0]!, {})
    expect(rows.map((r) => [r.featureId, r.view.choice])).toEqual([
      ['f1', 'ask-me'],
      ['f2', 'off'],
    ])
  })

  it('lists nothing for a leg offered none', () => {
    expect(groupLegLiveCheckRows(legs[1]!, {})).toEqual([])
  })

  it('shows the person’s pick over the start', () => {
    const rows = groupLegLiveCheckRows(legs[0]!, {
      web: { f2: { choice: 'required', beforeAndAfter: true } },
    })
    expect(rows[1]?.view.choice).toBe('required')
    expect(rows[1]?.view.beforeAndAfter).toBe(true)
  })
})

describe('changeGroupLiveCheckPick', () => {
  it('changes one feature from where it stands', () => {
    const picks = changeGroupLiveCheckPick(legs, {}, 'web', 'f1', { beforeAndAfter: true })
    expect(picks).toEqual({ web: { f1: { choice: 'ask-me', beforeAndAfter: true } } })
  })

  it('ignores a feature the leg does not offer', () => {
    const picks = {}
    expect(changeGroupLiveCheckPick(legs, picks, 'api', 'f9', { choice: 'required' })).toBe(picks)
  })
})

describe('groupLaunchLiveCheckMetadata', () => {
  it('sends the checks switched on, by project then feature', () => {
    expect(groupLaunchLiveCheckMetadata(legs, {})).toEqual({
      liveChecks: { web: { f1: { mode: 'ask-me' } } },
    })
  })

  it('sends nothing once every check is off', () => {
    expect(
      groupLaunchLiveCheckMetadata(legs, { web: { f1: { choice: 'off', beforeAndAfter: false } } }),
    ).toBeUndefined()
  })
})

describe('withLiveCheckChip', () => {
  const chain: ProposalChip[] = [
    { id: 'implement', name: 'Implement', agent: true, stepKind: 'agent' },
    { id: 'verify', name: 'Verify', agent: true, stepKind: 'agent' },
    { id: 'report', name: 'Report', agent: true, stepKind: 'report' },
  ]

  it('puts the picked check before the first report, gate or cleanup step', () => {
    expect(
      withLiveCheckChip(chain, { choice: 'ask-me', beforeAndAfter: false }).map((c) => c.name),
    ).toEqual(['Implement', 'Verify', 'Watch it live', 'Report'])
  })

  it('marks a required check as an agent step', () => {
    const placed = withLiveCheckChip(chain, { choice: 'required', beforeAndAfter: false })
    expect(placed[2]).toEqual({
      id: 'live-check',
      name: 'Live check',
      agent: true,
      stepKind: 'agent',
      liveCheck: true,
    })
  })

  it('goes last when nothing comes after the proof', () => {
    expect(
      withLiveCheckChip(chain.slice(0, 2), { choice: 'required', beforeAndAfter: false }).map(
        (c) => c.id,
      ),
    ).toEqual(['implement', 'verify', 'live-check'])
  })

  it('takes out the check the preview placed when switched off or changed', () => {
    const previewed: ProposalChip[] = [
      chain[0]!,
      { id: 'live-check', name: 'Live check', agent: true, stepKind: 'agent', liveCheck: true },
      chain[2]!,
    ]
    expect(
      withLiveCheckChip(previewed, { choice: 'off', beforeAndAfter: false }).map((c) => c.id),
    ).toEqual(['implement', 'report'])
    expect(
      withLiveCheckChip(previewed, { choice: 'ask-me', beforeAndAfter: false }).map((c) => c.id),
    ).toEqual(['implement', 'live-check-watch', 'report'])
  })
})
