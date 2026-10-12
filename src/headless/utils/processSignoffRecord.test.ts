import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'

import { processSignoffDiscussDraft, processSignoffRecord } from './processSignoffRecord'

const workBranch = { name: 'factory/x-1', baseRef: 'system-scope', baseSha: 'a'.repeat(40) }
const ids = { id: 'run-1', projectId: 'p' }

const entry = (id: string, overrides: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id,
  stepId: 'sign-off',
  iteration: 1,
  status: 'done',
  outcome: 'failed',
  startedAt: 0,
  ...overrides,
})

const asked = entry('e1', {
  override: { choice: 'request-changes', at: 100, note: 'Fix the format issues' },
})
const proofAsked = entry('e2', {
  override: { choice: 'request-changes', at: 200, requestedProof: ['ui-before-after'] },
})
const closed = entry('e3', { outcome: 'skipped', summary: 'Closed without a decision' })
const approved = entry('e4', {
  outcome: 'passed',
  override: { choice: 'approve', at: 300, integration: 'squash' },
})

describe('processSignoffRecord', () => {
  it('leads with the latest decision and lists the earlier ones newest first', () => {
    const record = processSignoffRecord(
      { ...ids, workBranch },
      { entries: [asked, proofAsked, closed, approved] },
    )
    expect(record?.latest).toEqual({
      entryId: 'e4',
      attempt: 4,
      choice: 'approve',
      label: 'Approved',
      tone: 'done',
      at: 300,
      integration: 'Merge as one commit',
    })
    expect(record?.earlier.map((d) => [d.entryId, d.attempt, d.label])).toEqual([
      ['e2', 2, 'Changes requested'],
      ['e1', 1, 'Changes requested'],
    ])
  })

  it('carries the note and the proof a request for changes required, in words', () => {
    const record = processSignoffRecord({ ...ids, workBranch }, { entries: [asked, proofAsked] })
    expect(record?.latest.requestedProof).toEqual([
      'Require on-screen proof (before/after screens)',
    ])
    expect(record?.earlier[0]?.note).toBe('Fix the format issues')
  })

  it('names no way in for a project with no git of its own', () => {
    const record = processSignoffRecord(
      { ...ids, workBranch: { ...workBranch, shadow: true } },
      { entries: [approved] },
    )
    expect(record?.latest.integration).toBeUndefined()
  })

  it('names no way in for a run without a work branch', () => {
    expect(processSignoffRecord(ids, { entries: [approved] })?.latest.integration).toBeUndefined()
  })

  it('says a rejection as such', () => {
    const rejected = entry('e5', { override: { choice: 'reject', at: 5 } })
    expect(
      processSignoffRecord({ ...ids, workBranch }, { entries: [rejected] })?.latest,
    ).toMatchObject({
      label: 'Rejected',
      tone: 'empty',
    })
  })

  describe('who decided', () => {
    const run = { ...ids, workBranch }
    const decided = (override: Partial<NonNullable<ProcessLedgerEntry['override']>>) =>
      processSignoffRecord(run, {
        entries: [entry('e7', { override: { choice: 'approve', at: 7, ...override } })],
      })?.latest.decidedBy

    it.each([
      ['web', 'by you · on web'],
      ['desktop', 'by you · on desktop'],
      ['mobile', 'by you · on mobile'],
      ['chat', 'by you · in the agent’s chat'],
      ['feature-question', 'by you · on the feature’s question'],
    ] as const)('names the person and where they decided — %s', (decidedVia, words) => {
      expect(decided({ decidedBy: 'person', decidedVia })).toBe(words)
    })

    it('names the run’s own chat agent and the tool it called, which the person approved', () => {
      expect(
        decided({
          decidedBy: 'agent',
          decidedVia: 'tool',
          toolName: 'proposeRunStart',
          chatContextId: getChatContextKey(processRunChatContext(run)),
        }),
      ).toBe('by the run’s chat agent · proposeRunStart, approved by you')
    })

    it('names another chat’s agent as a chat agent', () => {
      expect(
        decided({
          decidedBy: 'agent',
          decidedVia: 'tool',
          toolName: 'proposeRunStart',
          chatContextId: 'project:p',
        }),
      ).toBe('by a chat agent · proposeRunStart, approved by you')
    })

    it('names the person alone, and the agent alone, when the record says no more', () => {
      expect(decided({ decidedBy: 'person' })).toBe('by you')
      expect(decided({ decidedBy: 'agent', chatContextId: 'project:p' })).toBe('by a chat agent')
    })

    it('names the agent manager for a decision it took on its own', () => {
      expect(
        decided({
          decidedBy: 'manager',
          decidedVia: 'manager',
          toolName: 'answerRunPark',
          chatContextId: 'c',
        }),
      ).toBe('by the agent manager')
    })

    it('says no one for a decision recorded before decisions were attributed', () => {
      expect(decided({})).toBeUndefined()
    })

    it('names who decided each earlier decision too', () => {
      const record = processSignoffRecord(run, {
        entries: [
          entry('e8', {
            override: { choice: 'reject', at: 8, decidedBy: 'person', decidedVia: 'mobile' },
          }),
          approved,
        ],
      })
      expect(record?.earlier[0]?.decidedBy).toBe('by you · on mobile')
      expect(record?.latest.decidedBy).toBeUndefined()
    })
  })

  it('is nothing while no attempt was decided', () => {
    expect(processSignoffRecord({ ...ids, workBranch }, { entries: [closed] })).toBeUndefined()
  })
})

describe('processSignoffDiscussDraft', () => {
  it('quotes the decision and its note for the run’s chat', () => {
    const record = processSignoffRecord({ ...ids, workBranch }, { entries: [asked] })!
    expect(processSignoffDiscussDraft(record.latest)).toBe(
      '> **Sign-off — Changes requested, attempt 1**\n> Fix the format issues\n\n',
    )
  })

  it('quotes every line of a note', () => {
    const multi = entry('e6', { override: { choice: 'reject', at: 1, note: 'one\ntwo' } })
    const record = processSignoffRecord({ ...ids, workBranch }, { entries: [multi] })!
    expect(processSignoffDiscussDraft(record.latest)).toBe(
      '> **Sign-off — Rejected, attempt 1**\n> one\n> two\n\n',
    )
  })

  it('names how approved work came in when there is no note', () => {
    const record = processSignoffRecord({ ...ids, workBranch }, { entries: [approved] })!
    expect(processSignoffDiscussDraft(record.latest)).toBe(
      '> **Sign-off — Approved, attempt 1** · Merge as one commit\n\n',
    )
  })
})
