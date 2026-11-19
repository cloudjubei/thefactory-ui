import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessWaitingAsk } from 'thefactory-tools/types'

import { isOutsideWaitPending, processOutsideWaitView } from './processOutsideWait'

const ask: ProcessWaitingAsk = {
  kind: 'blocker',
  agent: 'host',
  title: 'Waiting for a reply in Saif’s thread',
  detail: 'Your reply is posted.',
  outside: { awaits: 'a reply in Saif’s thread' },
}
const arrived = (detail: string): ProcessWaitingAsk => ({
  ...ask,
  outside: {
    awaits: 'a reply',
    arrived: { title: 'ZNR-767: Saif replied', detail, carryOnLabel: 'Start round 2', at: 1 },
  },
})
const park = (a: ProcessWaitingAsk | undefined, reason = 'step-waiting') =>
  ({ park: { reason, message: 'm', parkedAt: 1, ...(a ? { ask: a } : {}) } }) as Pick<
    ProcessRun,
    'park'
  >

describe('isOutsideWaitPending', () => {
  it('is true only while what the run waits for outside has not come', () => {
    expect(isOutsideWaitPending(park(ask).park)).toBe(true)
    expect(isOutsideWaitPending(park(arrived('x')).park)).toBe(false)
    expect(isOutsideWaitPending(park(ask, 'gate').park)).toBe(false)
    expect(isOutsideWaitPending(park({ ...ask, outside: undefined } as never).park)).toBe(false)
    expect(isOutsideWaitPending(undefined)).toBe(false)
  })
})

describe('processOutsideWaitView', () => {
  it('says what it waits for while nothing came', () => {
    expect(processOutsideWaitView(park(ask))).toEqual({
      kind: 'waiting',
      title: 'Waiting for a reply in Saif’s thread',
      detail: 'Your reply is posted.',
    })
  })

  it('shows what came, whole when short, with the answer that carries on', () => {
    expect(processOutsideWaitView(park(arrived('Fixed it')))).toEqual({
      kind: 'arrived',
      title: 'ZNR-767: Saif replied',
      preview: 'Fixed it',
      detail: 'Fixed it',
      cut: false,
      carryOnLabel: 'Start round 2',
    })
  })

  it('cuts a long reply to its first lines', () => {
    const view = processOutsideWaitView(park(arrived('1\n2\n3\n4\n5\n6')))
    expect(view).toMatchObject({ preview: '1\n2\n3\n4', cut: true, detail: '1\n2\n3\n4\n5\n6' })
  })

  it('is nothing for any other stop', () => {
    expect(processOutsideWaitView(park(ask, 'gate'))).toBeUndefined()
    expect(processOutsideWaitView(park({ ...ask, outside: undefined } as never))).toBeUndefined()
    expect(processOutsideWaitView({ park: undefined } as never)).toBeUndefined()
  })
})
