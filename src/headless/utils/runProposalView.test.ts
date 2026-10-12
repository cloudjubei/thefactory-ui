import { describe, expect, it } from 'vitest'

import {
  isRunProposalGrant,
  runProposalArgs,
  runProposalCriteria,
  runProposalOneLine,
  runProposalStartDetail,
  runProposalStepName,
  runProposalView,
} from './runProposalView'
import {
  RUN_PROPOSAL_DELETE,
  RUN_PROPOSAL_GROUP_DELETE,
  RUN_PROPOSAL_GROUP_PARK,
  RUN_PROPOSAL_GROUP_LANDED,
  RUN_PROPOSAL_GROUP_RESUME,
  RUN_PROPOSAL_GROUP_STOP,
  RUN_PROPOSAL_REMOVE_PROCESS,
  RUN_PROPOSAL_GATE,
  RUN_PROPOSAL_LAND,
  RUN_PROPOSAL_PARK,
  RUN_PROPOSAL_RESOLVE_CONFLICT,
  RUN_PROPOSAL_REVIVE,
  RUN_PROPOSAL_SEND_BACK,
  RUN_PROPOSAL_STOP,
  RUN_PROPOSAL_START,
  RUN_PROPOSAL_SUMMARY_MAX_CHARS,
  RUN_PROPOSAL_WITHDRAW,
  RUN_PROPOSAL_CHANGE,
  RUN_PROPOSAL_DEFER,
  RUN_PROPOSAL_FEATURE,
  RUN_PROPOSAL_LINE_LABELS,
  RUN_PROPOSAL_NEW_STORY,
  RUN_PROPOSAL_RERUN,
  RUN_PROPOSAL_RESOLVE,
} from './runProposalViewConstants'

describe('isRunProposalGrant', () => {
  it('knows a run chat’s proposals by the tool the grant names', () => {
    expect(isRunProposalGrant({ toolName: 'proposeRunFeature' })).toBe(true)
    expect(isRunProposalGrant({ toolName: 'resolveNeedsYouItem' })).toBe(true)
  })

  it('knows one by the tool its payload names', () => {
    expect(isRunProposalGrant({ detail: { tool: 'proposeFeatureChange', args: {} } })).toBe(true)
  })

  it('is false for any other tool', () => {
    expect(isRunProposalGrant({ toolName: 'addStory' })).toBe(false)
    expect(isRunProposalGrant({})).toBe(false)
  })
})

describe('runProposalArgs', () => {
  it('reads the grant’s own arguments first', () => {
    expect(runProposalArgs({ args: { a: 1 }, detail: { args: { b: 2 } } })).toEqual({ a: 1 })
  })

  it('falls back to the payload’s arguments', () => {
    expect(runProposalArgs({ detail: { args: { b: 2 } } })).toEqual({ b: 2 })
  })
})

describe('runProposalView', () => {
  it('shows a new feature with what it asks and how it is proven', () => {
    expect(
      runProposalView('proposeRunFeature', {
        title: 'Cap PDF size',
        description: 'Search skips big PDFs.',
        acceptance: 'A PDF over 8 MB is skipped.',
        proofPlan: { kinds: ['unit-tests', 'checks'], notes: 'Time it' },
        needsYouItemId: 'ny-1',
      }),
    ).toEqual({
      kind: 'feature',
      kindLabel: RUN_PROPOSAL_FEATURE.kindLabel,
      tone: 'review',
      title: 'Cap PDF size',
      featureId: undefined,
      storyId: undefined,
      needsYouItemId: 'ny-1',
      sections: [
        {
          key: 'description',
          label: 'Description',
          summary: 'Search skips big PDFs.',
          markdown: 'Search skips big PDFs.',
        },
        {
          key: 'acceptance',
          label: 'Acceptance criteria',
          summary: 'A PDF over 8 MB is skipped.',
          markdown: 'A PDF over 8 MB is skipped.',
        },
        {
          key: 'proofPlan',
          label: 'Proof plan',
          summary: 'unit-tests, checks — Time it',
          chips: ['unit-tests', 'checks'],
          markdown: 'Time it',
        },
      ],
      effect: RUN_PROPOSAL_FEATURE.effect,
      approveLabel: RUN_PROPOSAL_FEATURE.approveLabel,
    })
  })

  it('shows a change with the feature, the new acceptance and the request', () => {
    const view = runProposalView(
      'proposeFeatureChange',
      {
        featureId: 'f1',
        acceptance: 'Only successes are cached.',
        note: 'Retry failures.',
        proofKinds: ['unit-tests'],
      },
      'Read PDFs',
    )!
    expect(view).toMatchObject({
      kind: 'change',
      kindLabel: RUN_PROPOSAL_CHANGE.kindLabel,
      tone: 'working',
      title: 'Read PDFs',
      featureId: 'f1',
      approveLabel: RUN_PROPOSAL_CHANGE.approveLabel,
    })
    expect(view.sections.map((s) => [s.label, s.summary])).toEqual([
      ['The request', 'Retry failures.'],
      ['Acceptance criteria', 'Only successes are cached.'],
      ['Proof required', 'unit-tests'],
    ])
    expect(view.sections[2].chips).toEqual(['unit-tests'])
  })

  it('titles a change by its feature id when the feature cannot be read', () => {
    expect(runProposalView('proposeFeatureChange', { featureId: 'f1', note: 'n' })?.title).toBe(
      'f1',
    )
  })

  it('shows a decision', () => {
    expect(
      runProposalView('resolveNeedsYouItem', { itemId: 'ny-1', decision: 'Keep caching.' }),
    ).toMatchObject({
      kind: 'resolve',
      kindLabel: RUN_PROPOSAL_RESOLVE.kindLabel,
      tone: 'done',
      title: 'Keep caching.',
      needsYouItemId: 'ny-1',
      sections: [],
      approveLabel: RUN_PROPOSAL_RESOLVE.approveLabel,
    })
  })

  it('shows a deferral', () => {
    expect(
      runProposalView('resolveNeedsYouItem', {
        itemId: 'ny-1',
        decision: 'Later.',
        kind: 'deferred',
      }),
    ).toMatchObject({ kindLabel: RUN_PROPOSAL_DEFER.kindLabel, approveLabel: 'Leave for later' })
  })

  it('shows a decision that was a new story outside the run', () => {
    expect(
      runProposalView('resolveNeedsYouItem', {
        itemId: 'ny-1',
        decision: 'Own story.',
        storyId: 's2',
      }),
    ).toMatchObject({ kindLabel: RUN_PROPOSAL_NEW_STORY.kindLabel, storyId: 's2' })
  })

  it('shows a step to run again, with what must be different', () => {
    const view = runProposalView(
      'proposeStepRerun',
      { stepId: 'measure', note: 'Actually call evaluateKnowledge.', needsYouItemId: 'ny-1' },
      'Evaluate',
    )
    expect(view).toMatchObject({
      kind: 'rerun',
      kindLabel: RUN_PROPOSAL_RERUN.kindLabel,
      title: 'Evaluate',
      needsYouItemId: 'ny-1',
      sections: [
        {
          key: 'note',
          label: RUN_PROPOSAL_LINE_LABELS.note,
          summary: 'Actually call evaluateKnowledge.',
          markdown: 'Actually call evaluateKnowledge.',
        },
      ],
      effect: 'Stages a re-run of Evaluate — nothing starts yet.',
      approveLabel: RUN_PROPOSAL_RERUN.approveLabel,
    })
    expect(view?.approveLabel).toBe('Stage re-run')
  })

  it('titles a step to run again by its id when its name cannot be read', () => {
    const view = runProposalView('proposeStepRerun', { stepId: 'measure', note: 'x' })
    expect(view?.title).toBe('measure')
    expect(view?.effect).toBe('Stages a re-run of measure — nothing starts yet.')
  })

  it('titles a feature the story already has, added to the run, by that feature', () => {
    const view = runProposalView('proposeRunFeature', { featureId: 'f9' }, 'Format check passes')
    expect(view).toMatchObject({ kind: 'feature', title: 'Format check passes', featureId: 'f9' })
  })

  it('is undefined for any other tool', () => {
    expect(runProposalView('addStory', {})).toBeUndefined()
  })

  it('folds a long change to one line per section — criteria numbered, proof as chips', () => {
    // Observed: a “Change a feature” card with its whole description, six
    // criteria, proof plan and request as paragraphs filled the run chat drawer.
    const acceptance = [
      '1) Entering the App with no project selected lands on the North Star dashboard.',
      '2) The dashboard shows held-out as the headline.',
      '3) Main gaps lists the weakest capabilities.',
    ].join(' ')
    const view = runProposalView(
      'proposeFeatureChange',
      {
        featureId: 'f2',
        note: 'Rework to the updated description. '.repeat(10),
        acceptance,
        proofPlan: { kinds: ['unit-tests', 'ui-before-after'], notes: 'Serve the App at viewer.' },
      },
      'North Star dashboard',
    )!
    for (const section of view.sections) {
      expect(section.summary.length).toBeLessThanOrEqual(RUN_PROPOSAL_SUMMARY_MAX_CHARS)
      expect(section.summary).not.toContain('\n')
    }
    expect(view.sections.find((s) => s.key === 'acceptance')).toMatchObject({
      summary: expect.stringMatching(/^3 criteria — Entering the App/),
      items: [
        'Entering the App with no project selected lands on the North Star dashboard.',
        'The dashboard shows held-out as the headline.',
        'Main gaps lists the weakest capabilities.',
      ],
    })
    expect(view.sections.find((s) => s.key === 'proofPlan')).toMatchObject({
      chips: ['unit-tests', 'ui-before-after'],
      markdown: 'Serve the App at viewer.',
    })
    expect(view.effect).toBe(RUN_PROPOSAL_CHANGE.effect)
    expect(view.approveLabel).toBe('Stage change')
  })

  it('shows a start with exactly the changes the host stated and what they run on', () => {
    const view = runProposalView('proposeRunStart', { changeIds: ['c1', 'c2'] }, undefined, {
      changes: [
        { id: 'c1', kind: 'feature-changed', title: 'Dashboard', summary: 'Acceptance changed' },
        { id: 'c2', kind: 'feature-added', title: 'Gap links', summary: 'Add it' },
      ],
      model: 'claude-code · opus',
      leavesSignOff: true,
    })!
    expect(view).toMatchObject({
      kind: 'start',
      kindLabel: RUN_PROPOSAL_START.kindLabel,
      title: '2 staged changes',
      effect: RUN_PROPOSAL_START.effect,
      approveLabel: RUN_PROPOSAL_START.approveLabel,
    })
    expect(view.sections).toEqual([
      {
        key: 'changes',
        label: 'Changes',
        summary: '2 — Rework “Dashboard”, Add “Gap links”',
        items: ['Rework “Dashboard” — Acceptance changed', 'Add “Gap links” — Add it'],
      },
      { key: 'model', label: 'Runs on', summary: 'claude-code · opus' },
    ])
  })

  it('names a step re-run among a start’s changes by its step', () => {
    const view = runProposalView('proposeRunStart', { changeIds: ['c1', 'c3'] }, undefined, {
      changes: [
        { id: 'c1', kind: 'feature-changed', title: 'Dashboard', summary: 'Acceptance changed' },
        {
          id: 'c3',
          kind: 'step-rerun',
          stepId: 'code-review',
          title: 'Code review',
          summary: 'Read the whole diff',
        },
      ],
    })!
    expect(view.sections[0]).toEqual({
      key: 'changes',
      label: 'Changes',
      summary: '2 — Rework “Dashboard”, Re-run “Code review”',
      items: [
        'Rework “Dashboard” — Acceptance changed',
        'Re-run “Code review” — Read the whole diff',
      ],
    })
  })

  it('counts a start’s changes from its ids when the host stated nothing', () => {
    const view = runProposalView('proposeRunStart', { changeIds: ['c1'] })!
    expect(view.title).toBe('1 staged change')
    expect(view.sections).toEqual([{ key: 'changes', label: 'Changes', summary: '1 change' }])
  })

  it('shows a withdrawal by the change the host named', () => {
    const view = runProposalView('withdrawRunChange', { changeId: 'c2' }, undefined, {
      change: { id: 'c2', featureId: 'f3', title: 'Gap links', summary: 'Add it' },
    })!
    expect(view).toMatchObject({
      kind: 'withdraw',
      kindLabel: RUN_PROPOSAL_WITHDRAW.kindLabel,
      title: 'Gap links',
      featureId: 'f3',
    })
    expect(runProposalView('withdrawRunChange', { changeId: 'c2' })?.title).toBe('c2')
  })
})

describe('runProposalView — answering a stop and stopping the run', () => {
  it('knows both as run chat proposals', () => {
    expect(isRunProposalGrant({ toolName: 'answerRunPark' })).toBe(true)
    expect(isRunProposalGrant({ toolName: 'stopProcessRun' })).toBe(true)
  })

  it('shows Try again by the step it runs again, where, and what happens', () => {
    const view = runProposalView('answerRunPark', { choice: 'retry' }, 'Checks', {
      choice: 'retry',
      label: 'Try again',
      stepName: 'Checks',
      runTitle: 'File tools',
      nestedRunTitle: 'Read PDFs',
      parkMessage: 'Checks kept failing and the retry limit is spent.',
      effect: 'Try again at “Checks” in “Read PDFs”: Grant one more attempt on top of the limit.',
    })
    expect(view).toMatchObject({
      kind: 'park',
      kindLabel: 'Try again',
      title: 'Checks · Read PDFs',
      sections: [
        {
          key: 'parkMessage',
          label: RUN_PROPOSAL_LINE_LABELS.parkMessage,
          summary: 'Checks kept failing and the retry limit is spent.',
        },
      ],
      effect: 'Try again at “Checks” in “Read PDFs”: Grant one more attempt on top of the limit.',
      approveLabel: 'Try again',
    })
  })

  it('carries the words of a “more info” answer', () => {
    const view = runProposalView('answerRunPark', { choice: 'more-info', note: 'Use main.' })!
    expect(view.sections).toEqual([
      {
        key: 'note',
        label: RUN_PROPOSAL_LINE_LABELS.answer,
        summary: 'Use main.',
        markdown: 'Use main.',
      },
    ])
  })

  it('says what an answer does when the host stated nothing', () => {
    const view = runProposalView('answerRunPark', { choice: 'retry' })!
    expect(view).toMatchObject({
      kindLabel: RUN_PROPOSAL_PARK.kindLabel,
      title: 'retry',
      effect: RUN_PROPOSAL_PARK.effect('retry'),
      approveLabel: RUN_PROPOSAL_PARK.approveLabel,
    })
  })

  it('shows stopping the run by the run it ends', () => {
    expect(
      runProposalView('stopProcessRun', {}, undefined, { runTitle: 'Read PDFs' }),
    ).toMatchObject({
      kind: 'stop',
      kindLabel: RUN_PROPOSAL_STOP.kindLabel,
      title: 'Read PDFs',
      effect: RUN_PROPOSAL_STOP.effect,
      approveLabel: RUN_PROPOSAL_STOP.approveLabel,
    })
    expect(runProposalView('stopProcessRun', {})?.title).toBe(RUN_PROPOSAL_STOP.untitled)
  })
})

describe('runProposalView — the run’s other buttons', () => {
  it('knows every one of them as a run proposal', () => {
    for (const toolName of [
      'decideRunGate',
      'retryRunIntegration',
      'resolveRunIntegrationConflict',
      'sendRunBackForChanges',
      'reviveProcessRun',
      'removeProcessRun',
    ]) {
      expect(isRunProposalGrant({ toolName })).toBe(true)
    }
  })

  const landing = {
    mode: 'squash',
    modes: ['merge', 'squash', 'pull-request'],
    workBranch: 'factory/read-pdfs',
    baseRef: 'main',
    commitAs: { credentialId: 'acme', name: 'acme-bot', email: 'bot@acme.io' },
    message: 'Read PDFs',
  }

  it('shows an approval by its gate, how the work lands, and what happens', () => {
    const view = runProposalView(
      'decideRunGate',
      { choice: 'approve', mode: 'squash' },
      undefined,
      {
        runTitle: 'File tools',
        gateName: 'Sign-off',
        choice: 'approve',
        label: 'Approve the whole story',
        landing,
        effect: 'Approve “Sign-off”: factory/read-pdfs lands on main as one commit.',
      },
    )!
    expect(view).toMatchObject({
      kind: 'gate',
      kindLabel: 'Approve the whole story',
      tone: 'done',
      title: 'Sign-off',
      effect: 'Approve “Sign-off”: factory/read-pdfs lands on main as one commit.',
      approveLabel: RUN_PROPOSAL_GATE.approveLabels.approve,
    })
    expect(view.landing).toMatchObject({ mode: 'squash', baseRef: 'main' })
    expect(view.sections.find((s) => s.key === 'landing')?.summary).toBe(
      'Merge as one commit into main, as acme-bot <bot@acme.io>',
    )
  })

  it('shows a request for changes by its words and the proof it requires', () => {
    const view = runProposalView(
      'decideRunGate',
      { choice: 'request-changes', note: 'Cap the size.', proofKinds: ['unit-tests'] },
      undefined,
      { gateName: 'Sign-off', label: 'Request changes' },
    )!
    expect(view).toMatchObject({
      tone: 'working',
      approveLabel: RUN_PROPOSAL_GATE.approveLabels['request-changes'],
    })
    expect(view.sections.map((s) => s.key)).toEqual(['note', 'proof'])
    expect(view.landing).toBeUndefined()
  })

  it('shows the proof the sign-off pre-sets when the agent said none, saying so', () => {
    const view = runProposalView('decideRunGate', { choice: 'request-changes' }, undefined, {
      proofKinds: ['ui-before-after'],
      proofPreset: true,
    })!
    expect(view.sections.find((s) => s.key === 'proof')).toMatchObject({
      label: RUN_PROPOSAL_LINE_LABELS.proofPreset,
      chips: ['ui-before-after'],
    })
  })

  it('shows a rejection in red', () => {
    const view = runProposalView('decideRunGate', { choice: 'reject' })!
    expect(view).toMatchObject({
      tone: 'stuck',
      kindLabel: RUN_PROPOSAL_GATE.kindLabel,
      title: 'reject',
      effect: RUN_PROPOSAL_GATE.effect('reject'),
      approveLabel: RUN_PROPOSAL_GATE.approveLabels.reject,
    })
  })

  it('names the run a call names by id', () => {
    const view = runProposalView('stopProcessRun', { runId: 'r1' }, undefined, {
      runTitle: 'File tools',
      effect: 'Stop “File tools”.',
    })!
    expect(view.sections[0]).toMatchObject({ key: 'run', summary: 'File tools' })
    expect(view.effect).toBe('Stop “File tools”.')
    expect(runProposalView('stopProcessRun', { runId: 'r1' })!.sections[0]).toMatchObject({
      key: 'run',
      summary: 'r1',
    })
  })

  it('shows landing again by the run, how it lands and why it failed before', () => {
    const view = runProposalView('retryRunIntegration', { mode: 'merge' }, undefined, {
      runTitle: 'File tools',
      lastError: 'Conflicts in a.ts.',
      landing: { ...landing, mode: 'merge', message: 'Merge it' },
    })!
    expect(view).toMatchObject({
      kind: 'land',
      kindLabel: RUN_PROPOSAL_LAND.kindLabel,
      title: 'File tools',
      effect: RUN_PROPOSAL_LAND.effect,
    })
    expect(view.sections.map((s) => s.key)).toEqual(['lastError', 'landing'])
  })

  it('shows resolving a conflict by the files it resolves', () => {
    const view = runProposalView('resolveRunIntegrationConflict', {}, undefined, {
      runTitle: 'File tools',
      baseRef: 'main',
      paths: ['a.ts', 'b.ts'],
    })!
    expect(view).toMatchObject({
      kind: 'resolve-conflict',
      kindLabel: RUN_PROPOSAL_RESOLVE_CONFLICT.kindLabel,
    })
    expect(view.sections[0]).toMatchObject({ key: 'files', items: ['a.ts', 'b.ts'] })
  })

  it('shows sending back by the request it goes back with', () => {
    const view = runProposalView('sendRunBackForChanges', {}, undefined, {
      runTitle: 'File tools',
      gateName: 'Sign-off',
      note: 'Cap the size.',
    })!
    expect(view).toMatchObject({
      kind: 'send-back',
      kindLabel: RUN_PROPOSAL_SEND_BACK.kindLabel,
      title: 'File tools',
    })
    expect(view.sections[0]).toMatchObject({ key: 'note', summary: 'Cap the size.' })
  })

  it('shows resuming a stopped run by the step it was stopped at', () => {
    const view = runProposalView('reviveProcessRun', {}, undefined, {
      runTitle: 'File tools',
      stoppedAtStep: 'Fix',
      effect: 'Resume “File tools”: takes it back up where it was stopped.',
    })!
    expect(view).toMatchObject({
      kind: 'revive',
      kindLabel: RUN_PROPOSAL_REVIVE.kindLabel,
      tone: 'working',
      title: 'File tools',
      effect: 'Resume “File tools”: takes it back up where it was stopped.',
      approveLabel: RUN_PROPOSAL_REVIVE.approveLabel,
    })
    expect(view.sections[0]).toMatchObject({ key: 'step', summary: 'Fix' })
  })

  it('shows a delete in red, plainly, with the branches that go', () => {
    const view = runProposalView('removeProcessRun', { withBranches: true }, undefined, {
      runTitle: 'File tools',
      deleteBranches: true,
      branches: ['factory/read-pdfs'],
      effect: 'Delete “File tools” and everything it produced. This cannot be undone.',
    })!
    expect(view).toMatchObject({
      kind: 'delete',
      tone: 'stuck',
      danger: true,
      title: 'File tools',
      approveLabel: RUN_PROPOSAL_DELETE.approveLabel,
    })
    expect(view.sections[0]).toMatchObject({ key: 'branches', items: ['factory/read-pdfs'] })
    expect(runProposalView('removeProcessRun', {})!.effect).toBe(RUN_PROPOSAL_DELETE.effect)
    expect(RUN_PROPOSAL_DELETE.effect).toContain('cannot be undone')
  })
})

describe('runProposalView — a group run’s buttons, and deleting a process', () => {
  it('knows every one of them as a proposal', () => {
    for (const toolName of [
      'answerGroupRunPark',
      'stopProcessGroupRun',
      'removeProcessGroupRun',
      'markGroupLegLanded',
      'resumeEndedGroupRun',
      'removeProcess',
    ]) {
      expect(isRunProposalGrant({ toolName })).toBe(true)
    }
  })

  it('shows an answer to a group run’s park by why it waits, the leg and the way', () => {
    const view = runProposalView(
      'answerGroupRunPark',
      { groupRunId: 'g1', choice: 'retry-integration', mode: 'squash' },
      undefined,
      {
        groupRunTitle: 'Dark mode everywhere',
        parkMessage: 'The api merge failed.',
        leg: { projectId: 'api', title: 'API' },
        label: 'Try the merge again',
        mode: 'squash',
        effect: 'Try the merge again — api: Merge this leg again.',
      },
    )!
    expect(view).toMatchObject({
      kind: 'group-park',
      kindLabel: 'Try the merge again',
      title: 'Dark mode everywhere',
      effect: 'Try the merge again — api: Merge this leg again.',
      approveLabel: 'Try the merge again',
    })
    expect(view.sections.map((s) => s.key)).toEqual(['parkMessage', 'leg', 'mode'])
  })

  it('says what an answer does when the host stated nothing', () => {
    expect(
      runProposalView('answerGroupRunPark', { groupRunId: 'g1', choice: 'skip-leg' }),
    ).toMatchObject({
      kindLabel: RUN_PROPOSAL_GROUP_PARK.kindLabel,
      title: 'g1',
      effect: RUN_PROPOSAL_GROUP_PARK.effect('skip-leg'),
    })
  })

  it('shows stopping a group run by the group run', () => {
    expect(
      runProposalView('stopProcessGroupRun', { groupRunId: 'g1' }, undefined, {
        groupRunTitle: 'Dark mode everywhere',
      }),
    ).toMatchObject({
      kind: 'group-stop',
      title: 'Dark mode everywhere',
      effect: RUN_PROPOSAL_GROUP_STOP.effect,
      approveLabel: RUN_PROPOSAL_GROUP_STOP.approveLabel,
    })
  })

  it('shows deleting a group run in red, plainly, with the branches that go', () => {
    const view = runProposalView('removeProcessGroupRun', { groupRunId: 'g1' }, undefined, {
      groupRunTitle: 'Dark mode everywhere',
      deleteBranches: true,
      branches: ['factory/dark-api'],
    })!
    expect(view).toMatchObject({
      kind: 'group-delete',
      tone: 'stuck',
      danger: true,
      effect: RUN_PROPOSAL_GROUP_DELETE.effect,
    })
    expect(view.sections[0]).toMatchObject({ key: 'branches', items: ['factory/dark-api'] })
    expect(RUN_PROPOSAL_GROUP_DELETE.effect).toContain('cannot be undone')
  })

  it('shows marking a leg as landed by the leg, the commit the check found and where', () => {
    const view = runProposalView(
      'markGroupLegLanded',
      { groupRunId: 'g1', legId: 'api', note: 'Merged from its run chat' },
      undefined,
      {
        groupRunTitle: 'Dark mode everywhere',
        leg: { projectId: 'api', title: 'API' },
        commit: 'e9b3c02b8e556cddf40e929faefc993d1a530f20',
        subject: 'Agent run 538c0ebd',
        foundBy: 'merged by an agent from its run’s chat',
        effect: 'Record api as landed on main by e9b3c02.',
      },
    )!
    expect(view).toMatchObject({
      kind: 'group-landed',
      tone: 'working',
      title: 'Dark mode everywhere',
      effect: 'Record api as landed on main by e9b3c02.',
      approveLabel: RUN_PROPOSAL_GROUP_LANDED.approveLabel,
    })
    expect(view.sections.map((s) => [s.key, s.summary])).toEqual([
      ['leg', 'api · API'],
      ['commit', 'e9b3c02 — Agent run 538c0ebd'],
      ['foundBy', 'merged by an agent from its run’s chat'],
      ['note', 'Merged from its run chat'],
    ])
  })

  it('says what marking a leg as landed does when the host stated nothing', () => {
    expect(
      runProposalView('markGroupLegLanded', { groupRunId: 'g1', legId: 'api', commit: 'abc1234' }),
    ).toMatchObject({
      title: 'g1',
      effect: RUN_PROPOSAL_GROUP_LANDED.effect('api'),
      sections: [
        { key: 'leg', summary: 'api' },
        { key: 'commit', summary: 'abc1234' },
      ],
    })
  })

  it('shows resuming a group run by what starts, what is built first and the agent', () => {
    const view = runProposalView('resumeEndedGroupRun', { groupRunId: 'g1' }, undefined, {
      groupRunTitle: 'Dark mode everywhere',
      legs: [{ projectId: 'ui', title: 'UI', storyId: 's2' }],
      rebuilt: ['api'],
      agent: 'claude-code · opus',
      effect: 'Resume “Dark mode everywhere”: ui (UI) starts on claude-code · opus.',
    })!
    expect(view).toMatchObject({
      kind: 'group-resume',
      effect: 'Resume “Dark mode everywhere”: ui (UI) starts on claude-code · opus.',
      approveLabel: RUN_PROPOSAL_GROUP_RESUME.approveLabel,
    })
    expect(view.sections.map((s) => s.key)).toEqual(['starts', 'rebuilt', 'model'])
    expect(runProposalView('resumeEndedGroupRun', { groupRunId: 'g1' })).toMatchObject({
      effect: RUN_PROPOSAL_GROUP_RESUME.effect,
      sections: [],
    })
  })

  it('shows deleting a process definition in red by its name', () => {
    const view = runProposalView('removeProcess', { processId: 'dev-then-eval' }, undefined, {
      name: 'Develop, then evaluate',
      effect: 'Delete this project’s process “Develop, then evaluate”. This cannot be undone.',
    })!
    expect(view).toMatchObject({
      kind: 'remove-process',
      tone: 'stuck',
      danger: true,
      title: 'Develop, then evaluate',
      approveLabel: RUN_PROPOSAL_REMOVE_PROCESS.approveLabel,
    })
    expect(runProposalView('removeProcess', { processId: 'x' })).toMatchObject({
      title: 'x',
      effect: RUN_PROPOSAL_REMOVE_PROCESS.effect,
    })
  })
})

describe('runProposalOneLine', () => {
  it('joins lines and cuts long text with an ellipsis', () => {
    expect(runProposalOneLine('a\n  b')).toBe('a b')
    const cut = runProposalOneLine('x'.repeat(300))
    expect(cut).toHaveLength(RUN_PROPOSAL_SUMMARY_MAX_CHARS)
    expect(cut.endsWith('…')).toBe(true)
  })
})

describe('runProposalCriteria', () => {
  it('reads a bulleted or numbered list one per line', () => {
    expect(runProposalCriteria('- one\n- two')).toEqual(['one', 'two'])
    expect(runProposalCriteria('1. one\n2) two')).toEqual(['one', 'two'])
  })

  it('reads criteria numbered inline', () => {
    expect(runProposalCriteria('1) one. 2) two. 3) three.')).toEqual(['one.', 'two.', 'three.'])
  })

  it('keeps prose as one criterion', () => {
    expect(runProposalCriteria('It works, version 2.0 included.')).toEqual([
      'It works, version 2.0 included.',
    ])
    expect(runProposalCriteria('Line one\nline two')).toEqual(['Line one\nline two'])
  })
})

describe('runProposalStartDetail', () => {
  it('keeps changes with an id and a title, and the model', () => {
    expect(
      runProposalStartDetail({
        changes: [{ id: 'c1', title: 'T', kind: 'feature-added', featureId: 'f1' }, { id: 'x' }, 3],
        model: 'the API',
      }),
    ).toEqual({
      changes: [{ id: 'c1', title: 'T', kind: 'feature-added', summary: '', featureId: 'f1' }],
      model: 'the API',
    })
    expect(runProposalStartDetail({})).toEqual({ changes: [] })
  })
})

describe('runProposalStepName', () => {
  it('reads the step the host named on the ask', () => {
    expect(
      runProposalStepName({
        detail: {
          tool: 'proposeStepRerun',
          args: { stepId: 'measure' },
          detail: { stepName: 'Evaluate' },
        },
      }),
    ).toBe('Evaluate')
  })

  it('is undefined when the host named none', () => {
    expect(runProposalStepName({ detail: { tool: 'proposeStepRerun', args: {} } })).toBeUndefined()
  })
})
