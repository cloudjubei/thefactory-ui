import { describe, expect, it } from 'vitest'
import type { ProcessProofChangeOffer } from 'thefactory-tools/types'

import {
  proofChangeDraftStart,
  proofChangeView,
  toggleProofChangeKind,
} from './processProofChangeView'

/** A feature run stopped on screens no screen of a library can show — the shape of run 5d5c17ce. */
const library: ProcessProofChangeOffer = {
  featureId: 'aa3e3acb',
  stepId: 'implement',
  current: ['checks', 'code-review', 'ui-before-after'],
  standings: [
    { kind: 'checks', status: 'pending', detail: 'The checks step has not run yet.' },
    { kind: 'code-review', status: 'pending', detail: 'The code review has not run yet.' },
    { kind: 'ui-before-after', status: 'unmet', detail: 'The developer filed no evidence.' },
  ],
  unavailable: [],
}

/** The story fix of run 47f485cf: its fixer blocked on screens a backend-only package cannot produce. */
const blockedFix: ProcessProofChangeOffer = {
  stepId: 'verify',
  current: ['ui-before-after'],
  standings: [
    {
      kind: 'ui-before-after',
      status: 'unmet',
      detail: 'Could not produce the requested screenshots.',
    },
  ],
  unavailable: [{ kind: 'ui-before-after', reason: 'No runnable browser app or serve recipe.' }],
}

/** A project nothing here can capture, stopped on a reading proof. */
const noApp: ProcessProofChangeOffer = {
  featureId: 'f2',
  stepId: 'verify',
  current: ['unit-tests', 'live-backend'],
  standings: [
    { kind: 'unit-tests', status: 'met', detail: '12 tests passed.' },
    { kind: 'live-backend', status: 'unchecked', detail: 'Verified dry.' },
  ],
  unavailable: [{ kind: 'ui-before-after', reason: 'No app to capture.' }],
}

describe('proofChangeDraftStart', () => {
  it('starts from what proves it now, less what stopped the step', () => {
    expect(proofChangeDraftStart(library)).toEqual({
      kinds: ['checks', 'code-review'],
      save: false,
      note: '',
    })
  })

  it('keeps everything when dropping what stopped it would leave nothing', () => {
    const onlyStopped = { current: ['live-backend' as const], standings: [noApp.standings[1]!] }
    expect(proofChangeDraftStart(onlyStopped).kinds).toEqual(['live-backend'])
  })
})

describe('toggleProofChangeKind', () => {
  it('adds a kind in its canonical place', () => {
    const draft = toggleProofChangeKind(
      { kinds: ['code-review'], save: false, note: '' },
      'unit-tests',
    )
    expect(draft.kinds).toEqual(['unit-tests', 'code-review'])
  })

  it('drops a picked kind', () => {
    const draft = toggleProofChangeKind(
      { kinds: ['checks', 'code-review'], save: true, note: 'n' },
      'checks',
    )
    expect(draft).toEqual({ kinds: ['code-review'], save: true, note: 'n' })
  })
})

describe('proofChangeView', () => {
  it('shows every kind, how each stood, and lets the drop be sent', () => {
    const view = proofChangeView(library, proofChangeDraftStart(library))
    expect(view.canSend).toBe(true)
    expect(view.kinds.find((k) => k.kind === 'ui-before-after')).toMatchObject({
      checked: false,
      standing: { status: 'unmet', word: 'Not met', detail: 'The developer filed no evidence.' },
      disabled: false,
    })
    expect(view.kinds.map((k) => k.kind)).toEqual([
      'unit-tests',
      'checks',
      'code-review',
      'ui-before-after',
      'live-backend',
      'manual',
    ])
  })

  it('marks a kind the run cannot produce and keeps it from being added', () => {
    const view = proofChangeView(noApp, proofChangeDraftStart(noApp))
    expect(view.kinds.find((k) => k.kind === 'ui-before-after')).toMatchObject({
      unavailable: 'No app to capture.',
      disabled: true,
    })
  })

  it('keeps a kind the feature already needed pickable even when the run cannot produce it', () => {
    const offer = { ...noApp, current: [...noApp.current, 'ui-before-after' as const] }
    const view = proofChangeView(offer, proofChangeDraftStart(offer))
    expect(view.kinds.find((k) => k.kind === 'ui-before-after')?.disabled).toBe(false)
  })

  it('says why it cannot be sent while it changes nothing', () => {
    const view = proofChangeView(library, { kinds: [...library.current], save: false, note: '' })
    expect([view.canSend, view.problem]).toEqual([false, 'That is the proof it already needs.'])
  })

  it('says why it cannot be sent with nothing picked', () => {
    const view = proofChangeView(library, { kinds: [], save: false, note: '' })
    expect(view.canSend).toBe(false)
  })

  it('carries the save choice and the why', () => {
    const view = proofChangeView(library, { kinds: ['checks'], save: true, note: 'Library only.' })
    expect([view.canSave, view.save, view.note, view.featureId]).toEqual([
      true,
      true,
      'Library only.',
      'aa3e3acb',
    ])
  })
})

describe('proofChangeView at a story fix', () => {
  it('starts with the screens dropped — what stopped it — and nothing picked', () => {
    expect(proofChangeDraftStart(blockedFix).kinds).toEqual(['ui-before-after'])
  })

  it('lets the screens be swapped for checks and code review, with no feature to save onto', () => {
    const view = proofChangeView(blockedFix, {
      kinds: ['checks', 'code-review'],
      save: false,
      note: '',
    })
    expect([view.canSend, view.canSave, view.featureId]).toEqual([true, false, undefined])
    expect(view.kinds.find((k) => k.kind === 'ui-before-after')).toMatchObject({
      checked: false,
      unavailable: 'No runnable browser app or serve recipe.',
      disabled: false,
    })
  })

  it('never saves it, whatever the draft says', () => {
    const view = proofChangeView(blockedFix, { kinds: ['checks'], save: true, note: '' })
    expect([view.save, view.canSend]).toEqual([false, true])
  })
})
