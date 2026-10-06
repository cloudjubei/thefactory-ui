import { describe, expect, it } from 'vitest'

import { signoffDecisionItems } from './signoffDecision'
import type { ScreenPair } from './reviewEvidenceViewTypes'
import type { SignoffAttentionItem, SignoffRequestOutcome } from './signoffPageTypes'

const pair = (key: string): ScreenPair => ({
  key,
  index: 1,
  title: key,
  class: 'pair',
  counted: true,
})

const met: SignoffRequestOutcome = {
  sectionId: 'fix:r2',
  label: 'Fix · pass 2',
  state: 'met',
  text: 'Your request “x” is met — 1 before/after pair',
  pairs: [pair('overview')],
}

const fix = {
  label: 'Fix · pass 2',
  sectionId: 'fix:r2',
  step: { runId: 'r2', stepId: 'verify', entryId: 'e9' },
}

const dry: SignoffAttentionItem = {
  key: '2-0',
  sectionId: '2',
  dependency: '14.2',
  label: 'In-flight work',
  text: 'was verified dry — not against the live backend.',
  action: 'See what Verify said',
}

describe('signoffDecisionItems', () => {
  it('is empty when nothing needs a look', () => {
    expect(signoffDecisionItems({ request: undefined, fix: undefined, attention: [] })).toEqual([])
  })

  it('leads with the request, its pairs as chips and its fix pass as a step chip', () => {
    const [item] = signoffDecisionItems({ request: met, fix, attention: [] })
    expect(item).toEqual({
      key: 'request',
      tone: 'done',
      dependency: undefined,
      label: undefined,
      text: met.text,
      pairs: met.pairs,
      actions: [{ kind: 'step', label: 'Fix · pass 2', sectionId: 'fix:r2', step: fix.step }],
    })
  })

  it('reads a request not met in the stuck tone, with no pairs', () => {
    const [item] = signoffDecisionItems({
      request: { ...met, state: 'unmet', text: 'Your request “x” is not met: y', pairs: [] },
      fix,
      attention: [],
    })
    expect(item).toMatchObject({ tone: 'stuck', pairs: [] })
  })

  it('opens the request’s section when its fix pass has no proof step to show', () => {
    const [item] = signoffDecisionItems({
      request: met,
      fix: { ...fix, step: undefined },
      attention: [],
    })
    expect(item.actions).toEqual([
      { kind: 'step', label: 'Fix · pass 2', sectionId: 'fix:r2', step: undefined },
    ])
  })

  it('names the request’s fix pass from the request when no fix is given', () => {
    const [item] = signoffDecisionItems({ request: met, fix: undefined, attention: [] })
    expect(item.actions).toEqual([
      { kind: 'step', label: 'Fix · pass 2', sectionId: 'fix:r2', step: undefined },
    ])
  })

  it('lists each attention item after the request, with what Verify said as its action', () => {
    const items = signoffDecisionItems({ request: met, fix, attention: [dry] })
    expect(items.map((i) => i.key)).toEqual(['request', 'attention-2-0'])
    expect(items[1]).toEqual({
      key: 'attention-2-0',
      tone: 'working',
      dependency: '14.2',
      label: 'In-flight work',
      text: dry.text,
      pairs: [],
      actions: [{ kind: 'verify', label: 'See what Verify said', sectionId: '2' }],
    })
  })

  it('keeps a fix pass’s attention item labelled by its pass when it has no reference', () => {
    const [item] = signoffDecisionItems({
      request: undefined,
      fix: undefined,
      attention: [{ ...dry, dependency: undefined, label: 'Fix · pass 1', sectionId: 'fix:r1' }],
    })
    expect(item).toMatchObject({ dependency: undefined, label: 'Fix · pass 1' })
  })
})
