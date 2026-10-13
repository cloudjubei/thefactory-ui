import { describe, expect, it } from 'vitest'
import {
  featureWorkAskView,
  featureWorkLaunchCheck,
  gitChangeAskView,
  gitSetupAskView,
  groupWorkAskView,
  runProposalAskView,
  toolAskCardView,
  toolAskDecidedLine,
  toolAskDecidedLinesAwaitingRows,
  toolAskScopeOptions,
} from './toolAskCard'
import {
  FEATURE_WORK_ASK,
  GIT_SETUP_ASK,
  GROUP_WORK_ASK,
  RUN_PROPOSAL_ASK,
  TOOL_ASK_COPY,
  TOOL_ASK_SCOPE,
  TOOL_ASK_SCOPE_DONE,
  TOOL_ASK_SITE_HINT,
} from './toolAskCardConstants'
import type { GitChangeCardView } from './gitChangeApprovalTypes'
import type { RunProposalView } from './runProposalViewTypes'
import { PROCESS_GROUP_LAUNCH_BLURB } from './processGroupLaunchConstants'

const sandbox = (tool: string, args: Record<string, unknown>, detail = 'sentence') => ({
  label: tool,
  toolName: tool,
  args,
  detail: { tool, args, detail },
})

describe('toolAskCardView — sandbox requests', () => {
  it('shows a package install as the package itself, with the agent’s reason', () => {
    const view = toolAskCardView(
      sandbox('requestInstallPackage', {
        ecosystem: 'npm',
        name: 'zod',
        version: '3.23.8',
        reason: 'To validate payloads.',
      }),
    )
    expect(view).toMatchObject({
      icon: 'package',
      tone: 'ask',
      ask: 'The agent wants to install a package',
      tag: 'Sandbox',
      headline: 'Install zod 3.23.8 from npm',
      why: 'To validate payloads.',
      verb: 'Install',
      body: { kind: 'package', ecosystem: 'npm', name: 'zod', version: '3.23.8' },
    })
  })

  it('names the latest version when the agent asked for none', () => {
    expect(
      toolAskCardView(
        sandbox('requestInstallPackage', { ecosystem: 'pip', name: 'requests', version: '' }),
      ).headline,
    ).toBe('Install requests from pip')
  })

  it('shows a network unlock as the host it opens', () => {
    expect(
      toolAskCardView(sandbox('requestNetworkUnlock', { host: 'pypi.org', reason: 'r' })),
    ).toMatchObject({
      icon: 'network',
      headline: 'Open pypi.org to the sandbox',
      verb: 'Allow',
      body: { kind: 'network', host: 'pypi.org' },
    })
  })

  it('shows a fetch as the address it reads', () => {
    expect(
      toolAskCardView(sandbox('requestExternalFetch', { url: 'https://x.dev/spec', reason: 'r' })),
    ).toMatchObject({
      icon: 'fetch',
      headline: 'Fetch https://x.dev/spec',
      verb: 'Fetch',
      body: { kind: 'fetch', url: 'https://x.dev/spec' },
    })
  })
})

describe('toolAskCardView — chats, files and deletes', () => {
  it('shows a message to another chat with its target, text and wait-for-reply', () => {
    const view = toolAskCardView({
      label: 'sendChatMessage',
      toolName: 'sendChatMessage',
      args: { chatId: 'k1', message: 'Can you add the field?', awaitReply: true },
      detail: {
        tool: 'sendChatMessage',
        args: {},
        detail: {
          targetChatId: 'k1',
          targetLabel: 'Backend · Project chat',
          targetProjectId: 'p2',
        },
      },
    })
    expect(view).toMatchObject({
      icon: 'message',
      ask: 'The agent wants to message another chat',
      tag: 'Chats',
      headline: 'Message Backend · Project chat',
      verb: 'Send',
      body: {
        kind: 'message',
        target: 'Backend · Project chat',
        targetProjectId: 'p2',
        message: 'Can you add the field?',
        awaitReply: true,
      },
    })
  })

  it('names the chat by its id when the host resolved no target', () => {
    const view = toolAskCardView({
      label: 'sendChatMessage',
      toolName: 'sendChatMessage',
      args: { chatId: 'k9', message: 'hi' },
    })
    expect(view.body).toMatchObject({ kind: 'message', target: 'k9', awaitReply: false })
  })

  it('shows a new file with its path and its line count', () => {
    const view = toolAskCardView({
      label: 'writeProjectFile',
      toolName: 'writeProjectFile',
      args: { projectId: 'p1', path: 'docs/plan.md', content: 'a\nb\nc' },
    })
    expect(view).toMatchObject({
      icon: 'file',
      headline: 'Create docs/plan.md',
      verb: 'Write it',
      body: { kind: 'write', projectId: 'p1', path: 'docs/plan.md', content: 'a\nb\nc', lines: 3 },
    })
  })

  it('makes a story delete a danger card naming the story', () => {
    const view = toolAskCardView({
      label: 'deleteStory',
      toolName: 'deleteStory',
      args: { storyId: 's9', reason: 'Duplicates #12.' },
    })
    expect(view).toMatchObject({
      icon: 'delete',
      tone: 'danger',
      tag: TOOL_ASK_COPY.cannotUndo,
      why: 'Duplicates #12.',
      verb: 'Delete story',
      body: { kind: 'delete-story', storyId: 's9' },
    })
  })

  it.each([
    [
      'the host’s sentence when it sent one',
      { detail: 'Delete the Assistant conversation "Release prep" (4 messages)' },
      'Delete the Assistant conversation "Release prep" (4 messages)',
    ],
    ['its own words when the host sent none', undefined, 'Delete an Assistant conversation'],
  ])('makes an Assistant conversation delete a danger card in %s', (_label, detail, headline) => {
    const view = toolAskCardView({
      label: 'deleteAssistantConversation',
      toolName: 'deleteAssistantConversation',
      args: { chatId: 'general_2', reason: 'Superseded by the new plan.' },
      ...(detail ? { detail: { tool: 'deleteAssistantConversation', args: {}, ...detail } } : {}),
    })
    expect(view).toMatchObject({
      tone: 'danger',
      icon: 'delete',
      ask: 'The agent wants to delete an Assistant conversation',
      tag: TOOL_ASK_COPY.cannotUndo,
      why: 'Superseded by the new plan.',
      headline,
      consequence: 'Its messages and attachments go for good.',
      verb: 'Delete conversation',
      body: { kind: 'delete', what: headline },
    })
  })

  it('makes any other delete a danger card in the host’s own words', () => {
    const view = toolAskCardView({
      label: 'deleteDesignScreen',
      toolName: 'deleteDesignScreen',
      detail: {
        tool: 'deleteDesignScreen',
        args: {},
        detail: "Delete the screen 'Evaluation' (3 items)",
      },
    })
    expect(view).toMatchObject({
      tone: 'danger',
      headline: "Delete the screen 'Evaluation' (3 items)",
      verb: 'Delete',
      body: { kind: 'delete', what: "Delete the screen 'Evaluation' (3 items)" },
    })
  })

  it('shows any other tool with the host’s sentence and its details', () => {
    const view = toolAskCardView({
      label: 'readProjectNote',
      toolName: 'readProjectNote',
      args: { noteId: 'n1', reason: 'the login' },
      detail: { tool: 'readProjectNote', args: { noteId: 'n1' }, detail: 'Read the note “Login”' },
    })
    expect(view).toMatchObject({
      icon: 'tool',
      ask: TOOL_ASK_COPY.genericAsk,
      tag: 'readProjectNote',
      headline: 'Read the note “Login”',
      why: 'the login',
      verb: 'Approve',
      body: { kind: 'details' },
    })
  })

  it('falls back to the tool’s name when the host wrote no sentence', () => {
    expect(toolAskCardView({ label: 'Network unlock', detail: { host: 'x' } }).headline).toBe(
      'Use Network unlock',
    )
  })
})

describe('toolAskScopeOptions', () => {
  it('offers just this once, then each place an always-allow may apply', () => {
    expect(
      toolAskScopeOptions(['chat', 'everywhere'], 'requestInstallPackage', 'exact-call'),
    ).toEqual([
      { decision: 'once', ...TOOL_ASK_SCOPE.once },
      {
        decision: 'always-in-chat',
        label: TOOL_ASK_SCOPE.chat.label,
        hint: 'This exact call, whenever it repeats in this chat',
      },
      {
        decision: 'always-everywhere',
        label: TOOL_ASK_SCOPE.everywhere.label,
        hint: 'This exact call, in every chat, with any model or sign-in',
      },
    ])
  })

  it('offers trusting the site an ask is about, beside the always-allows', () => {
    // Observed (wargames 67e902b9): the same hosts asked about again and again.
    const options = toolAskScopeOptions(
      ['chat', 'everywhere'],
      'requestNetworkUnlock',
      'exact-call',
      'sc.starcraft-tmg.com',
    )
    expect(options.map((o) => o.decision)).toEqual([
      'once',
      'always-in-chat',
      'always-everywhere',
      'trust-site',
    ])
    expect(options[3]).toEqual({
      decision: 'trust-site',
      label: TOOL_ASK_SCOPE.site.label,
      hint: TOOL_ASK_SITE_HINT('sc.starcraft-tmg.com'),
    })
  })

  it('says a trusted site was trusted, once decided', () => {
    expect(toolAskDecidedLine({ headline: 'Open x' }, 'trust-site').text).toContain(
      TOOL_ASK_SCOPE_DONE['trust-site'],
    )
  })

  it('describes a whole-tool allow by the tool', () => {
    expect(toolAskScopeOptions(['chat'], 'readProjectNote', 'tool')[1]?.hint).toBe(
      'Every later readProjectNote call in this chat',
    )
  })

  it('offers no choice where no always-allow is on offer', () => {
    expect(toolAskScopeOptions([], 'deleteStory', 'tool')).toEqual([])
  })
})

describe('toolAskDecidedLine', () => {
  const view = toolAskCardView(sandbox('requestNetworkUnlock', { host: 'pypi.org' }))

  it('says what was allowed, and for how long', () => {
    expect(toolAskDecidedLine(view, 'once')).toEqual({
      tone: 'done',
      text: 'Approved — Open pypi.org to the sandbox',
    })
    expect(toolAskDecidedLine(view, 'always-in-chat').text).toBe(
      'Approved — Open pypi.org to the sandbox · always in this chat',
    )
  })

  it('says the agent was told when it was turned down', () => {
    expect(toolAskDecidedLine(view, 'deny')).toEqual({
      tone: 'declined',
      text: TOOL_ASK_COPY.declined,
    })
  })
})

describe('toolAskDecidedLinesAwaitingRows', () => {
  const approved = { id: 'a1', line: { tone: 'done' as const, text: 'Approved — Push 2 commits' } }
  const declined = { id: 'a2', line: { tone: 'declined' as const, text: TOOL_ASK_COPY.declined } }

  it('keeps every line while the server has not reported a decision yet', () => {
    expect(toolAskDecidedLinesAwaitingRows([approved, declined], [])).toEqual([approved, declined])
  })

  it.each([
    ['one decision', [{ id: 'a2' }], [approved]],
    ['both decisions', [{ id: 'a1' }, { id: 'a2' }], []],
    ['decisions of other asks only', [{ id: 'zz' }], [approved, declined]],
  ])(
    'drops the lines whose row already shows the decision — %s reported',
    (_label, decided, kept) => {
      expect(toolAskDecidedLinesAwaitingRows([approved, declined], decided)).toEqual(kept)
    },
  )

  it('shows nothing when nothing was decided here', () => {
    expect(toolAskDecidedLinesAwaitingRows([], [{ id: 'a1' }])).toEqual([])
  })
})

describe('gitChangeAskView', () => {
  const card = (over: Partial<GitChangeCardView>): GitChangeCardView => ({
    operation: 'merge',
    headline: 'Merge feat into dev (2 commits)',
    projectId: 'p1',
    repoPath: '/repo',
    branch: 'dev',
    warning: 'This changes your real repository at /repo',
    facts: [],
    ...over,
  })

  it('reads a merge with its verb and the agent’s reason', () => {
    expect(gitChangeAskView(card({}), { source: 'feat', reason: 'Tests pass.' })).toMatchObject({
      icon: 'merge',
      tone: 'ask',
      ask: 'The agent wants to merge a branch',
      tag: 'Git',
      headline: 'Merge feat into dev (2 commits)',
      why: 'Tests pass.',
      consequence: 'This changes your real repository at /repo',
      verb: 'Merge',
    })
  })

  it('counts the commits a push sends on its button', () => {
    expect(
      gitChangeAskView(
        card({
          operation: 'push',
          commits: { gained: [], gainedTotal: 3, dropped: [], droppedTotal: 0, fastForward: true },
        }),
        {},
      ).verb,
    ).toBe('Push 3 commits')
  })

  it('makes a change that throws work away a danger card', () => {
    expect(gitChangeAskView(card({ operation: 'drop-stash', danger: true }), {})).toMatchObject({
      tone: 'danger',
      icon: 'delete',
      verb: 'Approve — cannot be undone',
    })
  })

  it('reads an operation it has no words for as a git change', () => {
    expect(gitChangeAskView(card({ operation: 'something-new' }), {})).toMatchObject({
      icon: 'git',
      ask: 'The agent wants to change the repository',
      verb: 'Approve',
    })
  })
})

describe('featureWorkAskView', () => {
  it('reads a story launch as starting its work, with the agent’s reason', () => {
    expect(
      featureWorkAskView({
        storyTitle: 'Stash safety',
        joinsOpenRun: false,
        args: { storyId: 's1', reason: 'Both features are specified.' },
      }),
    ).toEqual({
      icon: 'run',
      tone: 'ask',
      ask: FEATURE_WORK_ASK.ask,
      tag: FEATURE_WORK_ASK.tag,
      headline: 'Start work on Stash safety',
      why: 'Both features are specified.',
      consequence: FEATURE_WORK_ASK.consequence,
      verb: 'Start work',
      body: { kind: 'launch' },
    })
  })

  it('reads work added to the story’s open run as joining it', () => {
    const view = featureWorkAskView({ storyTitle: 'Stash safety', joinsOpenRun: true })
    expect(view).toMatchObject({
      headline: 'Add Stash safety to its open run',
      verb: 'Add to that run',
    })
    expect(view.why).toBeUndefined()
  })

  it('names the story plainly while its title is still unknown', () => {
    expect(featureWorkAskView({ joinsOpenRun: false, args: 'not a record' }).headline).toBe(
      `Start work on ${FEATURE_WORK_ASK.untitled}`,
    )
  })
})

describe('featureWorkLaunchCheck', () => {
  const ready = {
    storyId: 's1',
    proposalLoaded: true,
    openWorkUnchosen: false,
    storyLoaded: true,
    featureCount: 2,
  }

  it('is ready once the plan is read, the story has work and nothing waits on a choice', () => {
    expect(featureWorkLaunchCheck(ready)).toEqual({ ready: true })
  })

  it('names the server’s refusal over everything else', () => {
    expect(
      featureWorkLaunchCheck({ ...ready, refusal: 'Nothing left to work.', featureCount: 0 }),
    ).toEqual({ ready: false, problem: 'Nothing left to work.' })
  })

  it('names a story with no feature left to work', () => {
    expect(featureWorkLaunchCheck({ ...ready, featureCount: 0 })).toEqual({
      ready: false,
      problem: FEATURE_WORK_ASK.nothingLeft,
    })
  })

  it('waits quietly while the plan or the story is still being read', () => {
    expect(featureWorkLaunchCheck({ ...ready, proposalLoaded: false })).toEqual({ ready: false })
    expect(featureWorkLaunchCheck({ ...ready, storyLoaded: false, featureCount: 0 })).toEqual({
      ready: true,
    })
  })

  it('asks for the open work to be settled first', () => {
    expect(featureWorkLaunchCheck({ ...ready, openWorkUnchosen: true })).toEqual({
      ready: false,
      problem: FEATURE_WORK_ASK.chooseOpenWork,
    })
  })

  it('needs no plan for a launch that names no story', () => {
    const { storyId: _omit, ...noStory } = ready
    expect(
      featureWorkLaunchCheck({ ...noStory, proposalLoaded: false, storyLoaded: false }),
    ).toEqual({ ready: true })
  })
})

describe('groupWorkAskView', () => {
  const leg = (projectId: string) => ({ projectId, storyId: 's', dependsOn: [] })

  it('reads a group launch by its title, counting its projects', () => {
    expect(
      groupWorkAskView(
        { title: 'Work bridge', legs: [leg('a'), leg('b')] },
        { reason: 'Both ready.' },
      ),
    ).toEqual({
      icon: 'run',
      tone: 'ask',
      ask: GROUP_WORK_ASK.ask,
      tag: '2 projects',
      headline: 'Work bridge',
      why: 'Both ready.',
      consequence: PROCESS_GROUP_LAUNCH_BLURB,
      verb: GROUP_WORK_ASK.verb,
      body: { kind: 'launch' },
    })
  })

  it('says what starts where the agent gave no title', () => {
    const view = groupWorkAskView({ legs: [leg('a')] }, undefined)
    expect(view).toMatchObject({ tag: '1 project', headline: 'Start work across 1 project' })
    expect(view.why).toBeUndefined()
  })
})

describe('runProposalAskView', () => {
  const proposal = (over: Partial<RunProposalView>): RunProposalView => ({
    kind: 'feature',
    kindLabel: 'New feature',
    tone: 'review',
    title: 'Retry button',
    featureId: undefined,
    storyId: undefined,
    needsYouItemId: undefined,
    sections: [],
    effect: 'Adds it to the story and stages it on this run — nothing starts yet.',
    approveLabel: 'Add to this run (staged)',
    ...over,
  })

  it('reads a proposal by its kind, subject and effect', () => {
    expect(runProposalAskView(proposal({}), { reason: 'The sign-off asked for it.' })).toEqual({
      icon: 'run',
      tone: 'ask',
      ask: RUN_PROPOSAL_ASK.ask('New feature'),
      tag: RUN_PROPOSAL_ASK.run,
      headline: 'Retry button',
      why: 'The sign-off asked for it.',
      consequence: 'Adds it to the story and stages it on this run — nothing starts yet.',
      verb: 'Add to this run (staged)',
      body: { kind: 'proposal' },
    })
  })

  it('tags a group run’s proposal as the group’s', () => {
    expect(runProposalAskView(proposal({ kind: 'group-stop' }), {}).tag).toBe(
      RUN_PROPOSAL_ASK.group,
    )
  })

  it('makes one that cannot be undone a danger card', () => {
    expect(runProposalAskView(proposal({ kind: 'delete', danger: true }), {})).toMatchObject({
      icon: 'delete',
      tone: 'danger',
      tag: TOOL_ASK_COPY.cannotUndo,
    })
  })

  it('falls back to the kind when the proposal names no subject', () => {
    expect(runProposalAskView(proposal({ title: '' }), {}).headline).toBe('New feature')
  })
})

describe('gitSetupAskView', () => {
  it('reads creating a repository by its plan, with the agent’s reason', () => {
    expect(
      gitSetupAskView(
        {
          headline: 'Put Notes on GitHub',
          lines: ['Creates the private repository me/notes.'],
          createsRepo: true,
          target: 'me/notes',
        },
        { reason: 'So the work is backed up.' },
      ),
    ).toEqual({
      icon: 'push',
      tone: 'ask',
      ask: GIT_SETUP_ASK.createAsk,
      tag: GIT_SETUP_ASK.tag,
      headline: 'Put Notes on GitHub',
      why: 'So the work is backed up.',
      verb: GIT_SETUP_ASK.createVerb,
      body: { kind: 'git' },
    })
  })

  it('reads a project that already has a repository as a push to it', () => {
    const view = gitSetupAskView(
      { headline: 'Push Notes to its repository', lines: [], createsRepo: false },
      undefined,
    )
    expect(view).toMatchObject({
      ask: GIT_SETUP_ASK.pushAsk,
      headline: 'Push Notes to its repository',
      verb: GIT_SETUP_ASK.pushVerb,
    })
    expect(view.why).toBeUndefined()
  })
})
