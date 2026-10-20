import { describe, expect, it } from 'vitest'

import { signoffDecisionItems } from './signoffDecision'
import type { ProcessDroppedChangeAcceptedRow } from 'thefactory-tools/types'

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

const droppedTest: ProcessDroppedChangeAcceptedRow = {
  key: 'cf9386d4:src/routes/completions.integration.test.ts',
  path: 'src/routes/completions.integration.test.ts',
  mergeSha: 'cf9386d4',
  note: 'dev removed the approval details this test covered, so its test goes too',
  text: 'You accepted dropping the work’s change in src/routes/completions.integration.test.ts at merge cf9386d: dev removed the approval details this test covered, so its test goes too',
}
const droppedRoute: ProcessDroppedChangeAcceptedRow = {
  key: 'cf9386d4:src/routes/completions.ts',
  path: 'src/routes/completions.ts',
  mergeSha: 'cf9386d4',
  note: 'kept dev',
  text: 'You accepted dropping the work’s change in src/routes/completions.ts at merge cf9386d: kept dev',
}

describe('signoffDecisionItems', () => {
  it('is empty when nothing needs a look', () => {
    expect(
      signoffDecisionItems({
        request: undefined,
        fix: undefined,
        attention: [],
        droppedAccepted: [],
      }),
    ).toEqual([])
  })

  it('leads with the request, its pairs as chips and its fix pass as a step chip', () => {
    const [item] = signoffDecisionItems({ request: met, fix, attention: [], droppedAccepted: [] })
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
      droppedAccepted: [],
    })
    expect(item).toMatchObject({ tone: 'stuck', pairs: [] })
  })

  it('opens the request’s section when its fix pass has no proof step to show', () => {
    const [item] = signoffDecisionItems({
      request: met,
      fix: { ...fix, step: undefined },
      attention: [],
      droppedAccepted: [],
    })
    expect(item.actions).toEqual([
      { kind: 'step', label: 'Fix · pass 2', sectionId: 'fix:r2', step: undefined },
    ])
  })

  it('names the request’s fix pass from the request when no fix is given', () => {
    const [item] = signoffDecisionItems({
      request: met,
      fix: undefined,
      attention: [],
      droppedAccepted: [],
    })
    expect(item.actions).toEqual([
      { kind: 'step', label: 'Fix · pass 2', sectionId: 'fix:r2', step: undefined },
    ])
  })

  it('lists each attention item after the request, with what Verify said as its action', () => {
    const items = signoffDecisionItems({ request: met, fix, attention: [dry], droppedAccepted: [] })
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
      droppedAccepted: [],
    })
    expect(item).toMatchObject({ dependency: undefined, label: 'Fix · pass 1' })
  })

  it('names each change accepted as dropped, after the attention items, worth a look with nothing to open', () => {
    const items = signoffDecisionItems({
      request: met,
      fix,
      attention: [dry],
      droppedAccepted: [droppedTest, droppedRoute],
    })
    expect(items.map((i) => i.key)).toEqual([
      'request',
      'attention-2-0',
      `dropped-${droppedTest.key}`,
      `dropped-${droppedRoute.key}`,
    ])
    expect(items[2]).toEqual({
      key: `dropped-${droppedTest.key}`,
      tone: 'working',
      dependency: undefined,
      label: undefined,
      text: droppedTest.text,
      pairs: [],
      actions: [],
    })
  })

  it('lists an accepted dropped change on its own when nothing else needs a look', () => {
    const items = signoffDecisionItems({
      request: undefined,
      fix: undefined,
      attention: [],
      droppedAccepted: [droppedRoute],
    })
    expect(items.map((i) => [i.key, i.text])).toEqual([
      [`dropped-${droppedRoute.key}`, droppedRoute.text],
    ])
  })
})
