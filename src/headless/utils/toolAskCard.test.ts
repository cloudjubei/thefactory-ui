import { describe, expect, it } from 'vitest'
import {
  acceptRequestDecisionMetadata,
  featureQuestionAnswerMetadata,
  featureQuestionAnswerProblem,
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
import { LAUNCH_FEATURE_PICK_NONE } from './launchFeaturePickConstants'
import {
  ACCEPT_REQUEST_ASK,
  CHAT_REVIEW_ASK,
  CHAT_TO_BASE_ASK,
  CHAT_TO_BASE_TOOL,
  FEATURE_QUESTION_ASK,
  FEATURE_WORK_ASK,
  GIT_CHANGE_ASK,
  GIT_CHANGE_VERB,
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
        targetChatId: 'k1',
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
    expect(view.body).toMatchObject({
      kind: 'message',
      target: 'k9',
      targetChatId: 'k9',
      awaitReply: false,
    })
  })

  it('reads sendChatMessage when the grant names it with an MCP prefix', () => {
    const view = toolAskCardView({
      label: 'sendChatMessage',
      toolName: 'mcp__thefactory__sendChatMessage',
      args: { chatId: 'k1', message: 'hi', awaitReply: true },
      detail: {
        tool: 'sendChatMessage',
        args: {},
        detail: { targetLabel: 'Release planning', targetProjectId: 'p2' },
      },
    })
    expect(view.body).toMatchObject({
      kind: 'message',
      target: 'Release planning',
      awaitReply: true,
    })
  })

  it('marks a sendChatMessage ask incomplete when the message or target is missing', () => {
    const view = toolAskCardView({
      label: 'sendChatMessage',
      toolName: 'sendChatMessage',
      args: { note: 'nothing useful' },
    })
    expect(view.body).toMatchObject({ kind: 'message', incomplete: true })
    expect((view.body as { raw?: string }).raw).toContain('nothing useful')
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

  it.each([
    ['done', 'The agent wants to mark a feature done', 'Mark done'],
    ['deferred', 'The agent wants to defer a feature', 'Defer'],
  ])('asks the person to set a feature %s, with the agent’s reason', (status, ask, verb) => {
    const view = toolAskCardView({
      label: 'setFeatureStatus',
      toolName: 'setFeatureStatus',
      args: { storyId: 's18', featureId: 'f1', status, reason: 'Approved in this chat.' },
    })
    expect(view).toMatchObject({
      tone: 'ask',
      ask,
      verb,
      why: 'Approved in this chat.',
      body: { kind: 'references', text: '#s18.f1' },
    })
  })

  it('asks the person to lift a blocker, naming it and what it blocks', () => {
    const view = toolAskCardView({
      label: 'removeBlocker',
      toolName: 'removeBlocker',
      args: { storyId: 's21', featureId: 'f2', blocker: 's18', reason: 'Not needed first.' },
    })
    expect(view).toMatchObject({
      tone: 'ask',
      ask: 'The agent wants to lift a blocker',
      headline: 'Stop waiting on a blocker',
      verb: 'Remove blocker',
      why: 'Not needed first.',
      body: { kind: 'references', text: '#s21.f2 no longer waits on #s18' },
    })
    expect(view.headline).not.toContain('#')
    expect(
      toolAskCardView({
        label: 'removeBlocker',
        toolName: 'removeBlocker',
        args: { storyId: 's21', blocker: 's18' },
      }),
    ).toMatchObject({ body: { kind: 'references', text: '#s21 no longer waits on #s18' } })
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

  it('reads a conflict resolution as finishing a merge', () => {
    expect(gitChangeAskView(card({ operation: 'resolve-conflicts' }), {})).toMatchObject({
      icon: 'merge',
      tone: 'ask',
      ask: GIT_CHANGE_ASK['resolve-conflicts'],
      verb: GIT_CHANGE_VERB['resolve-conflicts'],
      body: { kind: 'git' },
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

  it('says first what the run waits on, and that it then starts by itself', () => {
    const view = featureWorkAskView({
      storyTitle: 'Rules guide',
      joinsOpenRun: false,
      waitingOn: ['story-18', 'story-19'],
    })
    expect(view.consequence).toBe(
      `${FEATURE_WORK_ASK.waitsOn(['story-18', 'story-19'])} ${FEATURE_WORK_ASK.consequence}`,
    )
    expect(FEATURE_WORK_ASK.waitsOn(['story-18'])).toBe(
      'It waits on #story-18 first, and starts by itself once that is done.',
    )
    expect(featureWorkAskView({ joinsOpenRun: false, waitingOn: [] }).consequence).toBe(
      FEATURE_WORK_ASK.consequence,
    )
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

  it('tags a process run as working in its own copy, and work in the chat as neither', () => {
    const process = featureWorkAskView({ joinsOpenRun: false, mode: 'process' })
    expect(process.tag).toBe(FEATURE_WORK_ASK.tag)
    expect(process.consequence).toBe(FEATURE_WORK_ASK.consequence)

    const chat = featureWorkAskView({
      storyTitle: 'Stash safety',
      joinsOpenRun: false,
      mode: 'chat',
    })
    expect(chat.tag).toBeUndefined()
    expect(chat.consequence).toBe(FEATURE_WORK_ASK.chatConsequence)
    expect(chat.consequence).not.toMatch(/copy/)
    expect(chat.headline).toBe('Start work on Stash safety')
  })

  it('promises no wait in the chat — waiting on other work is a process run’s', () => {
    expect(
      featureWorkAskView({ joinsOpenRun: false, mode: 'chat', waitingOn: ['story-18'] })
        .consequence,
    ).toBe(FEATURE_WORK_ASK.chatConsequence)
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

  it('asks for a feature to be picked before anything else', () => {
    expect(
      featureWorkLaunchCheck({ ...ready, nonePicked: true, refusal: 'Cannot start "F0".' }),
    ).toEqual({ ready: false, problem: LAUNCH_FEATURE_PICK_NONE })
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

describe('toolAskCardView — design asks', () => {
  it('shows a proposal as each image it files, with its new screens’ reasons', () => {
    const view = toolAskCardView(
      sandbox('proposeDesign', {
        projectId: 'p2',
        appId: 'a1',
        title: 'Faction cards',
        entries: [
          {
            screenId: 's1',
            stateId: 'st1',
            variant: 'Desktop',
            path: '.factory/attachments/c/12-board.png',
          },
          {
            screenName: 'Faction picker',
            stateName: 'Open',
            url: 'https://figma.com/x',
            links: [],
          },
          'junk',
        ],
        newScreenReasons: {
          'Faction picker': { closest: ['Faction list', 3], why: 'A dialog, not the list.' },
        },
      }),
    )
    expect(view).toMatchObject({
      icon: 'file',
      tone: 'ask',
      ask: 'The agent wants to propose a design',
      tag: 'Design',
      headline: 'Propose “Faction cards”',
      verb: 'Propose',
      consequence: expect.stringMatching(/nothing current changes until you accept it/),
      body: {
        kind: 'design',
        projectId: 'p2',
        entries: [
          { screenId: 's1', stateId: 'st1', variant: 'Desktop', file: '12-board.png' },
          { screenName: 'Faction picker', stateName: 'Open', file: 'x' },
          {},
        ],
        newScreens: [
          { name: 'Faction picker', closest: ['Faction list'], why: 'A dialog, not the list.' },
        ],
      },
    })
  })

  it('counts the images when the proposal has no title, and reads a bare reason list as none', () => {
    const view = toolAskCardView(
      sandbox('proposeDesign', { entries: [{}, {}], newScreenReasons: 'nope' }),
    )
    expect(view.headline).toBe('Propose “2 images”')
    expect(view.body).toEqual({ kind: 'design', entries: [{}, {}], newScreens: [] })
  })

  it('shows an HTML draft by its file or title, where its cases go, and why a new screen', () => {
    expect(
      toolAskCardView(
        sandbox('proposeDesignDraft', { path: 'drafts/00-directions.html', screenId: 's1' }),
      ),
    ).toMatchObject({
      ask: 'The agent wants to propose an HTML draft',
      headline: 'Propose the draft 00-directions.html',
      body: {
        kind: 'design',
        entries: [{ screenId: 's1', file: '00-directions.html' }],
        newScreens: [],
      },
    })
    expect(
      toolAskCardView(
        sandbox('proposeDesignDraft', {
          path: 'd.html',
          title: 'Directions',
          screenName: 'Board',
          closest: ['Play board'],
          why: 'Setup only',
        }),
      ),
    ).toMatchObject({
      headline: 'Propose “Directions”',
      body: { newScreens: [{ name: 'Board', closest: ['Play board'], why: 'Setup only' }] },
    })
  })

  it('shows a playground save by the state it makes and where, and why a new screen', () => {
    expect(
      toolAskCardView(
        sandbox('saveDesignPlaygroundState', {
          appId: 'a',
          address: 'scene=run-header&level=top',
          screenName: 'Run header',
          screenKind: 'component',
          stateName: 'Top-level run',
        }),
      ),
    ).toMatchObject({
      ask: 'The agent wants to save a playground scene as a state',
      headline: 'Save “Top-level run” from the Playground',
      consequence:
        'Captured light and dark, desktop and phone, it arrives in the Design view’s Proposals; nothing current changes until you accept it.',
      verb: 'Save',
      body: {
        kind: 'design',
        entries: [{ screenName: 'Run header', stateName: 'Top-level run' }],
        newScreens: [],
      },
    })
    expect(
      toolAskCardView(
        sandbox('saveDesignPlaygroundState', {
          address: 'scene=x',
          screenName: 'Header panel',
          stateId: 'st1',
          closest: ['Run header'],
          why: 'The panel, not the header.',
        }),
      ),
    ).toMatchObject({
      headline: 'Save a state from the Playground',
      body: {
        entries: [{ screenName: 'Header panel', stateId: 'st1' }],
        newScreens: [
          { name: 'Header panel', closest: ['Run header'], why: 'The panel, not the header.' },
        ],
      },
    })
  })

  it('shows a new screen with the screens it resembles and why it is not one of them', () => {
    expect(
      toolAskCardView(
        sandbox('addDesignScreen', {
          name: 'Matchup viewer',
          closest: ['Matchup results viewer'],
          why: 'Live, not results.',
        }),
      ),
    ).toMatchObject({
      ask: 'The agent wants to add a screen',
      headline: 'Add the screen “Matchup viewer”',
      verb: 'Add screen',
      body: {
        kind: 'design',
        entries: [],
        newScreens: [
          {
            name: 'Matchup viewer',
            closest: ['Matchup results viewer'],
            why: 'Live, not results.',
          },
        ],
      },
    })
    expect(toolAskCardView(sandbox('addDesignScreen', { name: 'Settings' })).body).toEqual({
      kind: 'design',
      entries: [],
      newScreens: [],
    })
  })
})

describe('toolAskCardView — closing the chat’s changes as already on their base', () => {
  const card = (standing: string, extra: Record<string, unknown> = {}) => ({
    standing,
    headline: `Close agent/abc — ${standing}`,
    runId: 'r1',
    branch: 'agent/abc',
    baseRef: 'main',
    fileCount: 3,
    files: ['a.ts', 'b.ts'],
    ...extra,
  })
  const ask = (detail: unknown, args: Record<string, unknown> = {}) =>
    toolAskCardView({
      label: CHAT_TO_BASE_TOOL,
      toolName: CHAT_TO_BASE_TOOL,
      args: { ...args, reason: 'merged by hand' },
      detail: { tool: CHAT_TO_BASE_TOOL, args, detail },
    })

  it('shows changes the base holds by the host’s card: the branch, its files, and that the base holds them', () => {
    expect(ask(card('held'))).toEqual({
      tone: 'ask',
      why: 'merged by hand',
      icon: 'git',
      ask: CHAT_TO_BASE_ASK.ask,
      tag: CHAT_TO_BASE_ASK.tag,
      headline: 'Close agent/abc — held',
      consequence: CHAT_TO_BASE_ASK.consequence,
      verb: CHAT_TO_BASE_ASK.verb,
      body: {
        kind: 'review',
        branch: 'agent/abc',
        fileCount: 3,
        files: ['a.ts', 'b.ts'],
        note: 'main already holds them.',
      },
    })
  })

  it('says a later commit replaced them', () => {
    expect(ask(card('superseded', { supersededBy: 'c'.repeat(40) })).body).toMatchObject({
      note: 'A later commit on main replaced every file they changed.',
    })
  })

  it('shows closing them on the person’s word as a danger card naming the files the base lacks', () => {
    expect(ask(card('force', { lacking: ['a.ts', 'b.ts'] }), { force: true })).toMatchObject({
      tone: 'danger',
      body: { note: 'main lacks a.ts, b.ts. Approving closes them anyway.' },
    })
  })

  it('says the base lacks some of them when the host named none', () => {
    expect(ask(card('force'), { force: true }).body).toMatchObject({
      note: 'main lacks some of them. Approving closes them anyway.',
    })
  })

  it('reads a card without its standing as one closed on the person’s word when they asked for it', () => {
    const view = ask({ branch: 'agent/abc', files: ['a.ts'] }, { force: true })
    expect(view).toMatchObject({
      tone: 'danger',
      headline: CHAT_TO_BASE_ASK.fallbackHeadline,
      body: { kind: 'review', branch: 'agent/abc', fileCount: 1, files: ['a.ts'] },
    })
    expect(view.body).not.toHaveProperty('note')
  })
})

describe('toolAskCardView — a decision on the chat’s open changes', () => {
  const card = (decision: string, extra: Record<string, unknown> = {}) => ({
    decision,
    headline: `Headline for ${decision}`,
    runId: 'r1',
    branch: 'agent/abc',
    target: 'main',
    fileCount: 8,
    files: ['a.ts', 'b.ts'],
    ...extra,
  })
  const ask = (decision: string, detail: unknown = card(decision)) =>
    toolAskCardView({
      label: 'decideChatOpenChanges',
      toolName: 'decideChatOpenChanges',
      args: { decision, reason: 'tests pass' },
      detail: { tool: 'decideChatOpenChanges', args: { decision }, detail },
    })

  it('shows a merge by the host’s card: the branch, where it goes, how many files', () => {
    expect(ask('merge')).toEqual({
      tone: 'ask',
      why: 'tests pass',
      icon: 'merge',
      ask: CHAT_REVIEW_ASK.ask.merge,
      tag: CHAT_REVIEW_ASK.tag,
      headline: 'Headline for merge',
      consequence: 'They go into main in your checkout.',
      verb: 'Merge',
      body: {
        kind: 'review',
        branch: 'agent/abc',
        target: 'main',
        fileCount: 8,
        files: ['a.ts', 'b.ts'],
      },
    })
  })

  it('shows a pull request as pushing the branch', () => {
    expect(ask('pull-request')).toMatchObject({
      icon: 'push',
      verb: 'Open pull request',
      consequence: 'agent/abc is pushed and its pull request opens.',
    })
  })

  it('shows approving and asking for changes as keeping the branch', () => {
    expect(ask('leave-branch')).toMatchObject({
      icon: 'git',
      verb: 'Approve',
      consequence: 'Approved — agent/abc stays unmerged.',
    })
    expect(ask('request-changes')).toMatchObject({
      icon: 'git',
      verb: 'Ask for changes',
      consequence: 'The branch stays for the next turn.',
    })
  })

  it('shows a rejection as a danger card that cannot be undone', () => {
    expect(ask('reject')).toMatchObject({
      tone: 'danger',
      icon: 'delete',
      tag: TOOL_ASK_COPY.cannotUndo,
      verb: 'Discard',
      consequence: 'The changes and agent/abc go for good.',
    })
  })

  it('counts the listed files when the host gave no count, and says a merge goes into the checked-out branch when it named none', () => {
    const view = ask('merge', card('merge', { fileCount: undefined, target: undefined }))
    expect(view.body).toEqual({
      kind: 'review',
      branch: 'agent/abc',
      fileCount: 2,
      files: ['a.ts', 'b.ts'],
    })
    expect(view.consequence).toBe('They go into the checked-out branch in your checkout.')
  })

  it('reads a card the host could not give as a plain ask, never the agent’s words', () => {
    const view = ask('merge', null)
    expect(view).toMatchObject({
      headline: CHAT_REVIEW_ASK.fallbackHeadline,
      verb: 'Merge',
      body: { kind: 'review', branch: '', fileCount: 0, files: [] },
    })
    expect(view.consequence).toBeUndefined()
  })

  it('falls back to the generic words for a decision it has none for', () => {
    expect(ask('squash')).toMatchObject({
      ask: TOOL_ASK_COPY.genericAsk,
      verb: TOOL_ASK_COPY.genericVerb,
    })
  })
})

describe('CHAT_REVIEW_ASK.files', () => {
  it('counts one file and many', () => {
    expect(CHAT_REVIEW_ASK.files(1)).toBe('1 file')
    expect(CHAT_REVIEW_ASK.files(3)).toBe('3 files')
  })
})

describe('toolAskCardView — an answer to a feature’s question', () => {
  const card = {
    headline: 'Answer a question on “Normalize inputs”',
    projectId: 'p1',
    storyId: 's1',
    storyTitle: 'Agent messaging',
    featureId: 'f1',
    featureTitle: 'Normalize inputs',
    questionId: 'q1',
    question: 'Build against the sibling?',
    askedAt: '2026-10-14T21:48:44Z',
    answer: 'Yes, build against it.',
  }
  const ask = (detail: unknown, args: Record<string, unknown> = { answer: 'From the args' }) =>
    toolAskCardView({
      label: 'submitFeatureQuestionAnswer',
      toolName: 'submitFeatureQuestionAnswer',
      args,
      detail: { tool: 'submitFeatureQuestionAnswer', args, detail },
    })

  it('shows the question by the host’s card, with the answer the agent proposes', () => {
    expect(ask(card)).toEqual({
      tone: 'ask',
      icon: 'message',
      ask: FEATURE_QUESTION_ASK.ask,
      tag: FEATURE_QUESTION_ASK.tag,
      headline: 'Answer a question on “Normalize inputs”',
      consequence: FEATURE_QUESTION_ASK.consequence,
      verb: FEATURE_QUESTION_ASK.verb,
      body: {
        kind: 'question',
        storyTitle: 'Agent messaging',
        featureTitle: 'Normalize inputs',
        question: 'Build against the sibling?',
        answer: 'Yes, build against it.',
      },
    })
  })

  it('reads a card the host could not give as a plain ask, keeping the agent’s answer to change', () => {
    expect(ask(null)).toMatchObject({
      headline: FEATURE_QUESTION_ASK.fallbackHeadline,
      body: { kind: 'question', featureTitle: '', question: '', answer: 'From the args' },
    })
    expect(ask(null, {}).body).toEqual({
      kind: 'question',
      featureTitle: '',
      question: '',
      answer: '',
    })
  })
})

describe('featureQuestionAnswerMetadata', () => {
  const body = {
    kind: 'question' as const,
    featureTitle: 'Normalize inputs',
    question: 'Build against the sibling?',
    answer: 'Yes',
  }

  it('sends nothing when the person kept the agent’s answer', () => {
    expect(featureQuestionAnswerMetadata(body, ' Yes ')).toBeUndefined()
  })

  it('sends the person’s own words when they changed it', () => {
    expect(featureQuestionAnswerMetadata(body, ' No — use the API. ')).toEqual({
      args: { answer: 'No — use the API.' },
    })
  })
})

describe('featureQuestionAnswerProblem', () => {
  it('holds the card while the answer is empty', () => {
    expect(featureQuestionAnswerProblem('  ')).toBe(FEATURE_QUESTION_ASK.empty)
    expect(featureQuestionAnswerProblem('Yes')).toBeUndefined()
  })
})

describe('toolAskCardView — accepting a feature request', () => {
  const accept = (args: Record<string, unknown>) =>
    toolAskCardView(sandbox('acceptProjectFeatureRequest', args))

  it('names the request and the way the agent proposed to start its work', () => {
    expect(accept({ id: 'fr1', mode: 'chat', reason: 'It is small.' })).toEqual({
      icon: 'run',
      tone: 'ask',
      ask: ACCEPT_REQUEST_ASK.ask,
      tag: ACCEPT_REQUEST_ASK.tag,
      headline: ACCEPT_REQUEST_ASK.headline,
      why: 'It is small.',
      consequence: ACCEPT_REQUEST_ASK.consequence,
      verb: ACCEPT_REQUEST_ASK.verb,
      body: { kind: 'accept-request', requestId: 'fr1', mode: 'chat' },
    })
  })

  it('leaves the way to the person when the agent named none, or one that is not a way', () => {
    expect(accept({ id: 'fr1' }).body).toEqual({ kind: 'accept-request', requestId: 'fr1' })
    expect(accept({ id: 'fr1', mode: 'inline' }).body).toEqual({
      kind: 'accept-request',
      requestId: 'fr1',
    })
    expect(accept({}).body).toEqual({ kind: 'accept-request', requestId: '' })
  })
})

describe('acceptRequestDecisionMetadata', () => {
  it('starts the work the way the person picked on the card', () => {
    expect(acceptRequestDecisionMetadata('chat')).toEqual({ args: { mode: 'chat' } })
    expect(acceptRequestDecisionMetadata('process')).toEqual({ args: { mode: 'process' } })
  })
})
