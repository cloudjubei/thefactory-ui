/** The words every waiting tool's card shares. */
/** How a design ask reads: proposing images or an HTML draft, or adding a screen. */
export const DESIGN_ASK = {
  propose: 'The agent wants to propose a design',
  draft: 'The agent wants to propose an HTML draft',
  screen: 'The agent wants to add a screen',
  tag: 'Design',
  consequence:
    'It arrives in the Design view’s Proposals; nothing current changes until you accept it.',
  screenConsequence: 'An empty screen; its states arrive with proposals.',
  proposeVerb: 'Propose',
  screenVerb: 'Add screen',
  headline: (title: string) => `Propose “${title}”`,
  draftHeadline: (file: string) => `Propose the draft ${file}`,
  screenHeadline: (name: string) => `Add the screen “${name}”`,
  playground: 'The agent wants to save a playground scene as a state',
  playgroundHeadline: (state: string | undefined) =>
    state ? `Save “${state}” from the Playground` : 'Save a state from the Playground',
  playgroundConsequence:
    'Captured light and dark, desktop and phone, it arrives in the Design view’s Proposals; nothing current changes until you accept it.',
  playgroundVerb: 'Save',
} as const

export const TOOL_ASK_COPY = {
  why: 'Why:',
  notNow: 'Not now',
  later: 'Decide later',
  cannotUndo: 'Cannot be undone',
  genericAsk: 'The agent wants to use a tool',
  genericVerb: 'Approve',
  dangerVerb: 'Approve — cannot be undone',
  declined: 'Not now — the agent was told and carries on without it',
  done: (headline: string) => `Approved — ${headline}`,
  howLong: 'How long',
  waitForReply: 'Wait for their reply before carrying on',
  to: 'To',
  newFile: 'New file',
  lines: (n: number) => `+${n}`,
  more: (n: number) => `and ${n} more ${n === 1 ? 'line' : 'lines'}`,
  storyGoes: 'Deleting removes the story and its features. Chats and runs stay, without it.',
  featureGoes: 'Deleting removes the feature. Its chats and runs stay, without it.',
  into: 'into',
} as const

/** The radio a reusable approval offers, by how far it reaches. */
export const TOOL_ASK_SCOPE = {
  once: { label: 'Just this once', hint: 'Asks again next time' },
  chat: { label: 'Always in this chat' },
  everywhere: { label: 'Always, everywhere' },
  site: { label: 'Trust this site' },
} as const

/** What trusting a site covers, under its option. */
export const TOOL_ASK_SITE_HINT = (site: string): string =>
  `${site} and every site under it — no agent asks about it again, in any run or chat`

/** How far an always-allow reached, as its decided line says it. */
export const TOOL_ASK_SCOPE_DONE = {
  'always-in-chat': 'always in this chat',
  'always-everywhere': 'always, everywhere',
  'trust-site': 'site trusted',
} as const

/** The most lines a new file's preview shows before folding the rest. */
export const TOOL_ASK_PREVIEW_LINES = 12

/** What each git operation's card says the agent wants. */
export const GIT_CHANGE_ASK: Record<string, string> = {
  commit: 'The agent wants to commit files',
  'create-branch': 'The agent wants to create a branch',
  'move-branch': 'The agent wants to move a branch',
  'switch-branch': 'The agent wants to switch branches',
  'delete-branch': 'The agent wants to delete a branch',
  merge: 'The agent wants to merge a branch',
  'abort-merge': 'The agent wants to abort a merge',
  push: 'The agent wants to push a branch',
  pull: 'The agent wants to pull a branch',
  fetch: 'The agent wants to fetch a remote',
  stage: 'The agent wants to stage changes',
  unstage: 'The agent wants to unstage changes',
  discard: 'The agent wants to throw changes away',
  reset: 'The agent wants to throw changes away',
  stash: 'The agent wants to stash changes',
  'apply-stash': 'The agent wants to apply a stash',
  'drop-stash': 'The agent wants to delete a stash',
  'apply-patch': 'The agent wants to apply a patch',
  'merge-plan': 'The agent wants to merge branches',
  'recover-text': 'The agent wants to recover a file as text',
  'pull-request': 'The agent wants to open a pull request',
}

/** The fallback for a git operation with no words of its own. */
export const GIT_CHANGE_ASK_FALLBACK = 'The agent wants to change the repository'

/** The approve button's verb, by git operation, where a plain "Approve" says too little. */
export const GIT_CHANGE_VERB: Record<string, string> = {
  commit: 'Commit',
  'create-branch': 'Create branch',
  'switch-branch': 'Switch',
  merge: 'Merge',
  pull: 'Pull',
  fetch: 'Fetch',
  stage: 'Stage',
  unstage: 'Unstage',
  stash: 'Stash',
  'apply-stash': 'Apply stash',
  'apply-patch': 'Apply patch',
  'merge-plan': 'Merge',
  'recover-text': 'Recover',
  'pull-request': 'Open the pull request',
}

/** The words a story launch's card says. */
export const FEATURE_WORK_ASK = {
  ask: 'The agent wants to start work on a story',
  tag: 'Isolated copy',
  untitled: 'this story',
  headline: (title: string) => `Start work on ${title}`,
  joinHeadline: (title: string) => `Add ${title} to its open run`,
  consequence:
    'The run works in its own copy of the repository and merges nothing — your branch is not touched, and nothing goes in without your sign-off.',
  verb: 'Start work',
  joinVerb: 'Add to that run',
  nothingLeft: 'Every feature on this story is done or deferred — there is nothing to start.',
  chooseOpenWork: 'Choose what happens to the open work first.',
} as const

/** The words a launch across a group's projects says. */
export const GROUP_WORK_ASK = {
  ask: 'The agent wants to start work across projects',
  projects: (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`,
  headline: (n: number) => `Start work across ${n} ${n === 1 ? 'project' : 'projects'}`,
  verb: 'Start work',
} as const

/** The words a run chat's proposal says. */
export const RUN_PROPOSAL_ASK = {
  ask: (kindLabel: string) => `The agent proposes: ${kindLabel}`,
  run: 'Run',
  group: 'Group run',
} as const

/** The words putting a project on GitHub says. */
export const GIT_SETUP_ASK = {
  createAsk: 'The agent wants to put a project on GitHub',
  pushAsk: 'The agent wants to push a project to its repository',
  tag: 'Git',
  createVerb: 'Create repository',
  pushVerb: 'Push',
} as const

/** The tool that decides a chat's open changes, as the review panel does. */
export const CHAT_REVIEW_TOOL = 'decideChatOpenChanges'

/** Copy for a decision on a chat's open changes, by decision. */
export const CHAT_REVIEW_ASK = {
  tag: 'Sign-off',
  fallbackHeadline: 'Decide this chat’s changes',
  ask: {
    merge: 'The agent wants to merge this chat’s changes',
    'pull-request': 'The agent wants to open a pull request',
    'leave-branch': 'The agent wants to approve this chat’s changes',
    'request-changes': 'The agent wants to ask for changes',
    reject: 'The agent wants to discard this chat’s changes',
  } as Partial<Record<string, string>>,
  verb: {
    merge: 'Merge',
    'pull-request': 'Open pull request',
    'leave-branch': 'Approve',
    'request-changes': 'Ask for changes',
    reject: 'Discard',
  } as Partial<Record<string, string>>,
  consequence: {
    merge: (target?: string) =>
      `They go into ${target ?? 'the checked-out branch'} in your checkout.`,
    'pull-request': (branch: string) => `${branch} is pushed and its pull request opens.`,
    'leave-branch': (branch: string) => `Approved — ${branch} stays unmerged.`,
    'request-changes': () => 'The branch stays for the next turn.',
    reject: (branch: string) => `The changes and ${branch} go for good.`,
  } as Partial<Record<string, (branchOrTarget?: string) => string>>,
  files: (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`,
  moreFiles: (n: number) => `and ${n} more`,
  into: 'into',
}

/** The tool that answers a question a run raised on a feature. */
export const FEATURE_QUESTION_TOOL = 'submitFeatureQuestionAnswer'

/** Copy for an answer to a feature's question. */
export const FEATURE_QUESTION_ASK = {
  ask: 'The agent wants to answer a question',
  tag: 'Story',
  fallbackHeadline: 'Answer a question',
  consequence: 'It is saved as your answer, and the work waiting on it carries on.',
  verb: 'Send answer',
  answer: 'Your answer',
  on: (featureTitle: string) => `On ${featureTitle}`,
  empty: 'Write an answer first.',
} as const
