import { describe, expect, it } from 'vitest'
import type { FeatureRequestBrief, FeatureRequestStatus } from 'thefactory-tools/types'

import {
  featureRequestAcceptHint,
  featureRequestBriefOfToolArgs,
  featureRequestCountsLine,
  featureRequestCycleWarning,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestSections,
  featureRequestStatusView,
  featureRequestStoryLabel,
  featureRequestSummary,
  featureRequestViaLabel,
  featureRequestWaitingLine,
  hiddenFeatureRequestIntro,
} from './featureRequestView'

const full: FeatureRequestBrief = {
  title: 'Shared approval card',
  summary: 'Before a stop runs, the person sees what will stop.',
  changes: ['Activity type', 'Time running'],
  doneWhen: [
    { text: 'Approve stops it' },
    { text: 'Deny leaves it running' },
    { text: 'Screens in each app', byHand: true },
  ],
  rules: ['Denying never stops the work'],
  proof: ['unit-tests', 'manual'],
  adopters: ['overseer-web'],
  origin: 'Blocked story in the tools.',
  references: ['#tools/abc'],
  description: 'More words.',
}

describe('featureRequestSummary', () => {
  it('is the summary when there is one', () => {
    expect(featureRequestSummary(full)).toBe('Before a stop runs, the person sees what will stop.')
  })

  it('falls back to the description for a request without a summary', () => {
    expect(featureRequestSummary({ title: 'Old', description: 'All of it.' })).toBe('All of it.')
  })

  it('is empty when there is neither', () => {
    expect(featureRequestSummary({ title: 'Bare', summary: '  ' })).toBe('')
  })
})

describe('featureRequestSections', () => {
  it('lists every filled part in reading order, with its count', () => {
    expect(
      featureRequestSections(full, 'TheFactory Knowledge').map((s) => [s.id, s.title, s.meta]),
    ).toEqual([
      ['changes', 'What changes', '2'],
      ['doneWhen', 'Done when', '3 criteria · 1 by hand'],
      ['rules', 'Rules', '1'],
      ['proof', 'Proof it must carry', '2'],
      ['origin', 'Where it came from', 'TheFactory Knowledge'],
      ['detail', 'More detail', ''],
    ])
  })

  it('numbers what changes and the criteria, and marks the ones checked by hand', () => {
    const [changes, doneWhen] = featureRequestSections(full, 'K')
    expect(changes.items.map((i) => [i.marker, i.text])).toEqual([
      ['1', 'Activity type'],
      ['2', 'Time running'],
    ])
    expect(doneWhen.numbered).toBe(true)
    expect(doneWhen.items.map((i) => i.byHand)).toEqual([false, false, true])
  })

  it('bullets rules, proof and origin', () => {
    const sections = featureRequestSections(full, 'K')
    const rules = sections.find((s) => s.id === 'rules')!
    const proof = sections.find((s) => s.id === 'proof')!
    const origin = sections.find((s) => s.id === 'origin')!
    expect(rules.numbered).toBe(false)
    expect(proof.items.map((i) => i.text)).toEqual(['Unit tests', 'Manual check'])
    expect(origin.items.map((i) => i.text)).toEqual(['Blocked story in the tools.', '#tools/abc'])
  })

  it('says one criterion in the singular and leaves out a by-hand count of none', () => {
    const [doneWhen] = featureRequestSections({ title: 'T', doneWhen: [{ text: 'x' }] }, 'K')
    expect(doneWhen.meta).toBe('1 criterion')
  })

  it('shows an older request, with only a description, as no sections — the summary carries it', () => {
    expect(featureRequestSections({ title: 'Old', description: 'All of it.' }, 'K')).toEqual([])
  })

  it('keeps the description as more detail only beside a summary', () => {
    const sections = featureRequestSections({ title: 'T', summary: 'S', description: 'D' }, 'K')
    expect(sections.map((s) => s.id)).toEqual(['detail'])
    expect(sections[0].items.map((i) => i.text)).toEqual(['D'])
  })

  it('gives where it came from from references alone', () => {
    const sections = featureRequestSections({ title: 'T', references: ['@a.ts'] }, 'K')
    expect(sections.map((s) => s.id)).toEqual(['origin'])
  })
})

describe('featureRequestStatusView', () => {
  it.each<[FeatureRequestStatus, string, string, string]>([
    ['pending', 'Needs you', 'pending', 'blocked'],
    ['accepted', 'Starting', 'accepted', 'queued'],
    ['in_progress', 'Running', 'accepted', 'running'],
    ['in_review', 'Sign off', 'accepted', 'review'],
    ['completed', 'Done', 'accepted', 'done'],
    ['failed', 'Failed', 'accepted', 'stuck'],
    ['rejected', 'Rejected', 'rejected', 'stuck'],
  ])('reads %s as %s', (status, label, phase, tone) => {
    const view = featureRequestStatusView(status)
    expect(view.label).toBe(label)
    expect(view.phase).toBe(phase)
    expect(view.tone).toBe(tone)
  })
})

describe('featureRequestViaLabel', () => {
  it.each([
    [{ type: 'PROJECT', projectId: 'a' }, 'its project chat'],
    [{ type: 'PROJECT_TOPIC', projectId: 'a', topicId: 't' }, 'a project chat'],
    [{ type: 'STORY', projectId: 'a', storyId: 's' }, 'a story chat'],
    [{ type: 'FEATURE', projectId: 'a', storyId: 's', featureId: 'f' }, 'a feature chat'],
    [{ type: 'AGENT_RUN_STORY', projectId: 'a', storyId: 's' }, 'an agent run'],
    [{ type: 'AGENT_RUN_FEATURE', projectId: 'a', storyId: 's', featureId: 'f' }, 'an agent run'],
    [{ type: 'FEATURE_REQUEST', projectId: 'a', featureRequestId: 'r' }, 'a request it took on'],
    [{ type: 'GROUP', groupId: 'g' }, 'a group chat'],
    [{ type: 'GROUP_TOPIC', groupId: 'g', topicId: 't' }, 'a group chat'],
    [{ type: 'GENERAL' }, 'the assistant'],
  ] as const)('names %o', (context, label) => {
    expect(featureRequestViaLabel(context as never)).toBe(label)
  })
})

describe('featureRequestCountsLine', () => {
  it('counts the parts that are filled', () => {
    expect(featureRequestCountsLine(full)).toBe('What changes 2 · Done when 3 · Rules 1')
  })

  it('is empty for an older request', () => {
    expect(featureRequestCountsLine({ title: 'Old', description: 'D' })).toBe('')
  })
})

describe('featureRequestBriefOfToolArgs', () => {
  it('reads the brief out of a tool call’s arguments', () => {
    expect(
      featureRequestBriefOfToolArgs({ targetProjectId: 'B', title: 'T', summary: 'S' }),
    ).toEqual({ title: 'T', summary: 'S' })
  })

  it('reads arguments sent as JSON text', () => {
    expect(featureRequestBriefOfToolArgs('{"title":"T","doneWhen":[{"text":"x"}]}')).toEqual({
      title: 'T',
      doneWhen: [{ text: 'x' }],
    })
  })

  it('drops parts that are not the shape a card can show', () => {
    expect(
      featureRequestBriefOfToolArgs({
        title: 'T',
        changes: 'one',
        doneWhen: ['x', { text: 'y', byHand: 'no' }, { text: 'z', byHand: true }],
        proof: ['checks', 'vibes'],
        rules: ['ok', 3],
      }),
    ).toEqual({
      title: 'T',
      doneWhen: [{ text: 'y' }, { text: 'z', byHand: true }],
      proof: ['checks'],
      rules: ['ok'],
    })
  })

  it('is undefined for arguments with no title', () => {
    expect(featureRequestBriefOfToolArgs({ summary: 'S' })).toBeUndefined()
    expect(featureRequestBriefOfToolArgs('not json')).toBeUndefined()
    expect(featureRequestBriefOfToolArgs(null)).toBeUndefined()
  })
})

describe('hiddenFeatureRequestIntro', () => {
  const intro = { role: 'user' as const, content: 'Incoming…' }
  const reply = { role: 'assistant' as const, content: 'On it' }
  const later = { role: 'user' as const, content: 'Thanks' }

  it('drops only the seeded opening message of a request chat', () => {
    expect(hiddenFeatureRequestIntro([intro, reply, later], true)).toEqual([reply, later])
  })

  it('keeps an opening message that is not the person’s', () => {
    expect(hiddenFeatureRequestIntro([reply, later], true)).toEqual([reply, later])
  })

  it('leaves every other chat alone', () => {
    expect(hiddenFeatureRequestIntro([intro, reply], false)).toEqual([intro, reply])
  })
})

describe('the decision copy', () => {
  it('names the asking project in each line', () => {
    expect(featureRequestAcceptHint('Knowledge')).toBe(
      'Accepting places it on a story here, starts an agent in this chat, and reports each step back to Knowledge.',
    )
    expect(featureRequestRejectPrompt('Knowledge')).toBe('Why? Knowledge’s chat is told.')
    expect(featureRequestRejectedLine('Knowledge')).toBe('Knowledge was told; nothing was started.')
    expect(featureRequestWaitingLine('Knowledge')).toBe(
      'Knowledge is waiting on it. Its chat hears your decision.',
    )
  })
})

describe('featureRequestCycleWarning', () => {
  it('warns when the request closes a wait cycle', () => {
    expect(
      featureRequestCycleWarning({ cycleFlag: { detected: true, path: ['a', 'b', 'a'] } }, 'K'),
    ).toBe('This project is already waiting on K. Accepting can leave each waiting on the other.')
  })

  it('says nothing otherwise', () => {
    expect(featureRequestCycleWarning({ cycleFlag: { detected: false, path: [] } }, 'K')).toBe(
      undefined,
    )
    expect(featureRequestCycleWarning({}, 'K')).toBe(undefined)
  })
})

describe('featureRequestStoryLabel', () => {
  it('reads as the story list numbers it', () => {
    expect(featureRequestStoryLabel('Approval card', 12)).toBe('#12 Approval card')
  })

  it('keeps the title alone when the story is not in the list', () => {
    expect(featureRequestStoryLabel('Approval card', undefined)).toBe('Approval card')
  })

  it('says a story while it has not loaded', () => {
    expect(featureRequestStoryLabel(undefined, undefined)).toBe('a story')
  })
})
