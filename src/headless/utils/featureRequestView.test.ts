import { describe, expect, it } from 'vitest'
import type {
  FeatureRequest,
  FeatureRequestBrief,
  FeatureRequestStatus,
} from 'thefactory-tools/types'

import {
  canSettleFeatureRequest,
  canStartFeatureRequestAgain,
  canStartFeatureRequestWork,
  featureRequestAcceptHint,
  featureRequestBriefOfToolArgs,
  featureRequestChatContext,
  featureRequestCountsLine,
  featureRequestCycleWarning,
  featureRequestPhase,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestSections,
  featureRequestSettledLine,
  featureRequestSettleFormReady,
  featureRequestSettleHint,
  featureRequestStartAgainChoice,
  featureRequestStatusView,
  featureRequestTakenOverLinks,
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
      'Accepting places it on a story here and starts the work the way you choose. Each step is reported back to Knowledge.',
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

  const waitCycle = {
    waits: [
      {
        requestId: 'be',
        projectId: 'thefactory-backend',
        onRequestId: 'ui',
        onProjectId: 'thefactory-ui',
        reason: 'r1',
      },
      {
        requestId: 'ui',
        projectId: 'thefactory-ui',
        onRequestId: 'be',
        onProjectId: 'thefactory-backend',
        reason: 'r2',
      },
    ],
    decideFirstRequestId: 'be',
    detectedAt: '2026-10-18T12:00:00.000Z',
  }

  it('tells the side that owns what the other waits on to decide first', () => {
    expect(featureRequestCycleWarning({ id: 'be', waitCycle }, 'K')).toBe(
      'This request and the request in thefactory-ui are waiting on each other. This side owns what the other waits on: decide it here first.',
    )
  })

  it('tells the other side where to decide first', () => {
    expect(featureRequestCycleWarning({ id: 'ui', waitCycle }, 'K')).toBe(
      'This request and the request in thefactory-backend are waiting on each other. Decide first in thefactory-backend, which owns what this side waits on.',
    )
  })

  it('puts the wait it is in before the one accepting could cause', () => {
    expect(
      featureRequestCycleWarning(
        { id: 'ui', waitCycle, cycleFlag: { detected: true, path: ['a', 'b', 'a'] } },
        'K',
      ),
    ).toContain('are waiting on each other')
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

describe('canSettleFeatureRequest', () => {
  it.each([
    'pending',
    'accepted',
    'in_progress',
    'in_review',
    'blocked',
    'failed',
    'rejected',
  ] as const)('offers to settle a %s request elsewhere', (status) => {
    expect(canSettleFeatureRequest({ status })).toBe(true)
  })

  it.each(['completed', 'handed_over'] as const)('offers nothing for a %s request', (status) => {
    expect(canSettleFeatureRequest({ status })).toBe(false)
  })
})

describe('featureRequestSettledLine', () => {
  const titleOf = (id: string) => (id === 'fr-9' ? 'Server-side stop' : undefined)

  it('says what delivered a request, with its note', () => {
    expect(
      featureRequestSettledLine(
        { deliveredBy: { ref: 'a1b2c3d', note: 'Same change', at: 't' } },
        titleOf,
      ),
    ).toEqual({ text: 'Delivered by a1b2c3d', note: 'Same change' })
  })

  it('names the request a request was handed over to, by its title', () => {
    expect(
      featureRequestSettledLine(
        { handedOverTo: { projectId: 'backend', ref: 'fr-9', requestId: 'fr-9', at: 't' } },
        titleOf,
      ),
    ).toEqual({
      text: 'Handed over to backend',
      link: { requestId: 'fr-9', label: 'Server-side stop' },
    })
  })

  it('names a request it does not know yet by its reference', () => {
    expect(
      featureRequestSettledLine(
        { handedOverTo: { projectId: 'backend', ref: 'fr-7', requestId: 'fr-7', at: 't' } },
        titleOf,
      ),
    ).toEqual({ text: 'Handed over to backend', link: { requestId: 'fr-7', label: 'fr-7' } })
  })

  it('names a story it was handed over to in words', () => {
    expect(
      featureRequestSettledLine(
        { handedOverTo: { projectId: 'web', ref: '#web/s4', note: 'Moved', at: 't' } },
        titleOf,
      ),
    ).toEqual({ text: 'Handed over to web/#web/s4', note: 'Moved' })
  })

  it('is nothing for a request settled by its own run', () => {
    expect(featureRequestSettledLine({}, titleOf)).toBeUndefined()
  })
})

describe('featureRequestTakenOverLinks', () => {
  it('links each request whose work this one took over, by title or id', () => {
    const request = { takenOverFrom: ['fr-1', 'fr-2'] } as Pick<FeatureRequest, 'takenOverFrom'>
    expect(
      featureRequestTakenOverLinks(request, (id) => (id === 'fr-1' ? 'Stop UI' : undefined)),
    ).toEqual([
      { requestId: 'fr-1', label: 'Stop UI' },
      { requestId: 'fr-2', label: 'fr-2' },
    ])
  })

  it('is empty for a request that took nothing over', () => {
    expect(featureRequestTakenOverLinks({}, () => undefined)).toEqual([])
  })
})

describe('featureRequestSettleHint', () => {
  it('says who hears it', () => {
    expect(featureRequestSettleHint('Tools')).toBe('Tools’s chat is told. Its review closes.')
  })
})

describe('featureRequestStatusView — handed over', () => {
  it('reads a request handed over as on hold, with its own word', () => {
    expect(featureRequestStatusView('handed_over')).toEqual({
      label: 'Handed over',
      tone: 'on_hold',
      phase: 'settled',
    })
  })
})

describe('featureRequestSettleFormReady', () => {
  it('is ready to mark delivered once something is named', () => {
    expect(featureRequestSettleFormReady('delivered', { projectId: '', ref: 'a1b2' })).toBe(true)
  })

  it('is not ready to mark delivered with a blank reference', () => {
    expect(featureRequestSettleFormReady('delivered', { projectId: 'p', ref: '  ' })).toBe(false)
  })

  it('needs both a project and a reference to hand over', () => {
    expect(featureRequestSettleFormReady('handed-over', { projectId: 'p', ref: 'r' })).toBe(true)
    expect(featureRequestSettleFormReady('handed-over', { projectId: ' ', ref: 'r' })).toBe(false)
    expect(featureRequestSettleFormReady('handed-over', { projectId: 'p', ref: '' })).toBe(false)
  })
})

describe('featureRequestPhase', () => {
  it('reads a request marked delivered as settled, though its status is completed', () => {
    expect(featureRequestPhase({ status: 'completed', deliveredBy: { ref: 'a', at: 't' } })).toBe(
      'settled',
    )
  })

  it('reads a request handed over as settled', () => {
    expect(featureRequestPhase({ status: 'handed_over' })).toBe('settled')
  })

  it('reads every other request by its status', () => {
    expect(featureRequestPhase({ status: 'completed' })).toBe('accepted')
    expect(featureRequestPhase({ status: 'pending' })).toBe('pending')
    expect(featureRequestPhase({ status: 'rejected' })).toBe('rejected')
  })
})

describe('featureRequestChatContext', () => {
  it('is the request’s own chat, in the project it was sent to', () => {
    expect(featureRequestChatContext({ id: 'fr-9', targetProjectId: 'backend' })).toEqual({
      type: 'FEATURE_REQUEST',
      projectId: 'backend',
      featureRequestId: 'fr-9',
    })
  })
})

describe('canStartFeatureRequestWork', () => {
  it('offers starting an accepted request whose work never started', () => {
    expect(canStartFeatureRequestWork({ status: 'accepted', handling: { storyId: 's1' } })).toBe(
      true,
    )
  })

  it('does not offer it once its work started, in a run or in the chat', () => {
    expect(
      canStartFeatureRequestWork({
        status: 'accepted',
        handling: {
          storyId: 's1',
          work: { mode: 'process', processRunId: 'r1', startedAt: '2026-10-20T00:00:00.000Z' },
        },
      }),
    ).toBe(false)
    expect(
      canStartFeatureRequestWork({
        status: 'accepted',
        handling: {
          storyId: 's1',
          work: {
            mode: 'chat',
            chatContextId: '/projects/p',
            startedAt: '2026-10-20T00:00:00.000Z',
          },
        },
      }),
    ).toBe(false)
  })

  it.each([
    'pending',
    'in_progress',
    'in_review',
    'blocked',
    'failed',
    'completed',
    'rejected',
  ] as const)('does not offer it for a %s request', (status) => {
    expect(canStartFeatureRequestWork({ status, handling: { storyId: 's1' } })).toBe(false)
  })
})

describe('canStartFeatureRequestAgain', () => {
  const placed = { storyId: 's1' }

  it.each(['blocked', 'failed'] as const)('offers starting a %s request again', (status) => {
    expect(canStartFeatureRequestAgain({ status, handling: placed })).toBe(true)
  })

  it('does not offer it for a request never placed on a story', () => {
    expect(canStartFeatureRequestAgain({ status: 'blocked' })).toBe(false)
  })

  it.each(['pending', 'accepted', 'in_progress', 'in_review', 'completed', 'rejected'] as const)(
    'does not offer it for a %s request',
    (status) => {
      expect(canStartFeatureRequestAgain({ status, handling: placed })).toBe(false)
    },
  )
})

describe('featureRequestStartAgainChoice', () => {
  it('goes the way the last work went', () => {
    expect(
      featureRequestStartAgainChoice({
        handling: { work: { mode: 'process', processRunId: 'r1', startedAt: 't' } },
      }),
    ).toEqual({ mode: 'process' })
  })

  it('works it in the request’s chat when no work started before', () => {
    expect(featureRequestStartAgainChoice({ handling: { storyId: 's1' } })).toEqual({
      mode: 'chat',
    })
    expect(featureRequestStartAgainChoice(undefined)).toEqual({ mode: 'chat' })
  })
})
