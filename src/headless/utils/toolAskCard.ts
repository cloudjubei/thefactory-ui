// Pure readers behind the one card every waiting tool shares: what it wants,
// the thing itself, the agent's reason and the verb on its button — read from
// the ask the host raised, never from the agent's own description of it.

import type { WorkLaunchMode } from 'thefactory-tools/types'
import { grantDetailView } from './approvalGrant'
import type { AlwaysAllowScope, GrantCovers, PendingToolGrantDecision } from './chatTypes'
import type { GitChangeCardView } from './gitChangeApprovalTypes'
import type { GitSetupPlan } from './gitSetupApprovalTypes'
import { PROCESS_GROUP_LAUNCH_BLURB } from './processGroupLaunchConstants'
import type { StartGroupWorkGrantSummary } from './processGroupLaunchTypes'
import type { RunProposalView } from './runProposalViewTypes'
import {
  ACCEPT_REQUEST_ASK,
  ACCEPT_REQUEST_TOOL,
  CHAT_REVIEW_ASK,
  CHAT_TO_BASE_ASK,
  CHAT_TO_BASE_TOOL,
  CHAT_REVIEW_TOOL,
  DESIGN_ASK,
  FEATURE_QUESTION_ASK,
  FEATURE_QUESTION_TOOL,
  FEATURE_WORK_ASK,
  STORY_DECISION_ASK,
  GIT_CHANGE_ASK,
  GIT_CHANGE_ASK_FALLBACK,
  GIT_CHANGE_VERB,
  GIT_SETUP_ASK,
  GROUP_WORK_ASK,
  RUN_PROPOSAL_ASK,
  TOOL_ASK_COPY,
  TOOL_ASK_SCOPE,
  TOOL_ASK_SCOPE_DONE,
  TOOL_ASK_SITE_HINT,
} from './toolAskCardConstants'
import type {
  DesignAskEntry,
  ToolAskBody,
  ToolAskCardView,
  ToolAskDecidedLine,
  ToolAskLaunchCheck,
  ToolAskScopeOption,
} from './toolAskCardTypes'

type GrantLike = { label: string; toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

const DELETE_TOOL = /^(delete|remove|drop|discard)[A-Z]/

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function designEntry(raw: Record<string, unknown>): DesignAskEntry {
  const pick = (key: keyof DesignAskEntry) => {
    const v = text(raw[key])
    return v ? { [key]: v } : {}
  }
  const file = text(raw.path) ?? text(raw.url)
  return {
    ...pick('screenId'),
    ...pick('screenName'),
    ...pick('stateId'),
    ...pick('stateName'),
    ...pick('variant'),
    ...(file ? { file: file.split('/').pop() ?? file } : {}),
  }
}

function newScreenReasons(raw: unknown): Array<{ name: string; closest: string[]; why: string }> {
  return Object.entries(record(raw)).map(([name, r]) => {
    const reason = record(r)
    const closest = Array.isArray(reason.closest)
      ? reason.closest.filter((c): c is string => typeof c === 'string')
      : []
    return { name, closest, why: text(reason.why) ?? '' }
  })
}

/** A design ask's card: what is proposed or added, in the agent's names until the design names them. Pure. */
function designAskView(
  tool: 'proposeDesign' | 'proposeDesignDraft' | 'addDesignScreen' | 'saveDesignPlaygroundState',
  args: Record<string, unknown>,
): Omit<ToolAskCardView, 'tone'> {
  const projectId = text(args.projectId)
  const project = projectId ? { projectId } : {}
  if (tool === 'saveDesignPlaygroundState') {
    const name = text(args.screenName)
    const why = text(args.why)
    return {
      icon: 'file',
      ask: DESIGN_ASK.playground,
      tag: DESIGN_ASK.tag,
      headline: DESIGN_ASK.playgroundHeadline(text(args.stateName)),
      consequence: DESIGN_ASK.playgroundConsequence,
      verb: DESIGN_ASK.playgroundVerb,
      body: {
        kind: 'design',
        ...project,
        entries: [designEntry(args)],
        newScreens:
          name && why
            ? [
                {
                  name,
                  closest: Array.isArray(args.closest)
                    ? args.closest.filter((c): c is string => typeof c === 'string')
                    : [],
                  why,
                },
              ]
            : [],
      },
    }
  }
  if (tool === 'addDesignScreen') {
    const name = text(args.name) ?? ''
    const closest = Array.isArray(args.closest)
      ? args.closest.filter((c): c is string => typeof c === 'string')
      : []
    const why = text(args.why)
    return {
      icon: 'file',
      ask: DESIGN_ASK.screen,
      tag: DESIGN_ASK.tag,
      headline: DESIGN_ASK.screenHeadline(name),
      consequence: DESIGN_ASK.screenConsequence,
      verb: DESIGN_ASK.screenVerb,
      body: {
        kind: 'design',
        ...project,
        entries: [],
        newScreens: closest.length || why ? [{ name, closest, why: why ?? '' }] : [],
      },
    }
  }
  if (tool === 'proposeDesignDraft') {
    const file = (text(args.path) ?? '').split('/').pop() ?? ''
    const target = designEntry(args)
    const why = text(args.why)
    const name = text(args.screenName)
    return {
      icon: 'file',
      ask: DESIGN_ASK.draft,
      tag: DESIGN_ASK.tag,
      headline: text(args.title)
        ? DESIGN_ASK.headline(text(args.title)!)
        : DESIGN_ASK.draftHeadline(file),
      consequence: DESIGN_ASK.consequence,
      verb: DESIGN_ASK.proposeVerb,
      body: {
        kind: 'design',
        ...project,
        entries: [{ ...target, file }],
        newScreens:
          name && why
            ? [
                {
                  name,
                  closest: Array.isArray(args.closest)
                    ? args.closest.filter((c): c is string => typeof c === 'string')
                    : [],
                  why,
                },
              ]
            : [],
      },
    }
  }
  const entries = Array.isArray(args.entries) ? args.entries.map((e) => designEntry(record(e))) : []
  return {
    icon: 'file',
    ask: DESIGN_ASK.propose,
    tag: DESIGN_ASK.tag,
    headline: DESIGN_ASK.headline(text(args.title) ?? plural(entries.length, 'image')),
    consequence: DESIGN_ASK.consequence,
    verb: DESIGN_ASK.proposeVerb,
    body: {
      kind: 'design',
      ...project,
      entries,
      newScreens: newScreenReasons(args.newScreenReasons),
    },
  }
}

/**
 * A decision on a chat's open changes, from the card the host read before
 * asking: the branch, where it goes, how many files — never the agent's own
 * description of it. Pure.
 */
function chatReviewAskView(
  detail: unknown,
  args: Record<string, unknown>,
): Omit<ToolAskCardView, 'tone'> & {
  tone: ToolAskCardView['tone']
} {
  const card = record(detail)
  const decision = text(card.decision) ?? text(args.decision) ?? ''
  const branch = text(card.branch) ?? ''
  const target = text(card.target)
  const files = Array.isArray(card.files)
    ? card.files.filter((f): f is string => typeof f === 'string')
    : []
  const fileCount = typeof card.fileCount === 'number' ? card.fileCount : files.length
  const consequence = CHAT_REVIEW_ASK.consequence[decision]
  return {
    icon:
      decision === 'merge'
        ? 'merge'
        : decision === 'pull-request'
          ? 'push'
          : decision === 'reject'
            ? 'delete'
            : 'git',
    tone: decision === 'reject' ? 'danger' : 'ask',
    ask: CHAT_REVIEW_ASK.ask[decision] ?? TOOL_ASK_COPY.genericAsk,
    tag: decision === 'reject' ? TOOL_ASK_COPY.cannotUndo : CHAT_REVIEW_ASK.tag,
    headline: text(card.headline) ?? CHAT_REVIEW_ASK.fallbackHeadline,
    ...(consequence && branch
      ? { consequence: consequence(decision === 'merge' ? target : branch) }
      : {}),
    verb: CHAT_REVIEW_ASK.verb[decision] ?? TOOL_ASK_COPY.genericVerb,
    body: { kind: 'review', branch, ...(target ? { target } : {}), fileCount, files },
  }
}

/**
 * Closing the chat's open changes as already on their base, from the card the
 * host read before asking: the branch, its files, and why it may close — the
 * base holds them, a later commit replaced them, or the person's word with the
 * files the base lacks (a danger card). Pure.
 */
function chatToBaseAskView(
  detail: unknown,
  args: Record<string, unknown>,
): Omit<ToolAskCardView, 'tone'> & { tone: ToolAskCardView['tone'] } {
  const card = record(detail)
  const standing = text(card.standing)
  const base = text(card.baseRef)
  const files = Array.isArray(card.files)
    ? card.files.filter((f): f is string => typeof f === 'string')
    : []
  const lacking = Array.isArray(card.lacking)
    ? card.lacking.filter((f): f is string => typeof f === 'string')
    : []
  const forced =
    standing === 'force' || (standing === undefined && String(args.force).toLowerCase() === 'true')
  const note = !base
    ? undefined
    : standing === 'held'
      ? CHAT_TO_BASE_ASK.held(base)
      : standing === 'superseded'
        ? CHAT_TO_BASE_ASK.superseded(base)
        : standing === 'force'
          ? CHAT_TO_BASE_ASK.force(base, lacking.length > 0 ? lacking.join(', ') : undefined)
          : undefined
  return {
    icon: 'git',
    tone: forced ? 'danger' : 'ask',
    ask: CHAT_TO_BASE_ASK.ask,
    tag: CHAT_TO_BASE_ASK.tag,
    headline: text(card.headline) ?? CHAT_TO_BASE_ASK.fallbackHeadline,
    consequence: CHAT_TO_BASE_ASK.consequence,
    verb: CHAT_TO_BASE_ASK.verb,
    body: {
      kind: 'review',
      branch: text(card.branch) ?? '',
      fileCount: typeof card.fileCount === 'number' ? card.fileCount : files.length,
      files,
      ...(note ? { note } : {}),
    },
  }
}

/**
 * An answer to a feature's question, from the card the host read before
 * asking: the question as the run asked it, where, and the agent's answer for
 * the person to change. Pure.
 */
function featureQuestionAskView(
  detail: unknown,
  args: Record<string, unknown>,
): Omit<ToolAskCardView, 'tone'> {
  const card = record(detail)
  const storyTitle = text(card.storyTitle)
  return {
    icon: 'message',
    ask: FEATURE_QUESTION_ASK.ask,
    tag: FEATURE_QUESTION_ASK.tag,
    headline: text(card.headline) ?? FEATURE_QUESTION_ASK.fallbackHeadline,
    consequence: FEATURE_QUESTION_ASK.consequence,
    verb: FEATURE_QUESTION_ASK.verb,
    body: {
      kind: 'question',
      ...(storyTitle ? { storyTitle } : {}),
      featureTitle: text(card.featureTitle) ?? '',
      question: text(card.question) ?? '',
      answer:
        typeof card.answer === 'string'
          ? card.answer
          : typeof args.answer === 'string'
            ? args.answer
            : '',
    },
  }
}

/** The decision's metadata for accepting a feature request: the way its work starts, as the person picked it. Pure. */
export function acceptRequestDecisionMetadata(mode: WorkLaunchMode): {
  args: { mode: WorkLaunchMode }
} {
  return { args: { mode } }
}

/** The decision's metadata for an answer: the person's own words, only when they changed the agent's. Pure. */
export function featureQuestionAnswerMetadata(
  body: Extract<ToolAskBody, { kind: 'question' }>,
  value: string,
): { args: { answer: string } } | undefined {
  const answer = value.trim()
  return answer === body.answer.trim() ? undefined : { args: { answer } }
}

/** Why an answer cannot be sent as it stands, or `undefined`. Pure. */
export function featureQuestionAnswerProblem(value: string): string | undefined {
  return value.trim().length === 0 ? FEATURE_QUESTION_ASK.empty : undefined
}

/**
 * The card for a waiting tool: which one it is, named by the grant or by its
 * payload; its arguments, the grant's or the payload's; the host's sentence
 * from the payload. A tool it has no words for reads as a generic approval. Pure.
 */
export function toolAskCardView(grant: GrantLike): ToolAskCardView {
  const payload = record(grant.detail)
  const tool = grant.toolName ?? text(payload.tool) ?? grant.label
  const args = grant.args !== undefined ? record(grant.args) : record(payload.args)
  const { headline: sentence, detail } = grantDetailView(grant.detail)
  const why = text(args.reason)
  const base = { tone: 'ask' as const, ...(why ? { why } : {}) }

  if (
    tool === 'proposeDesign' ||
    tool === 'proposeDesignDraft' ||
    tool === 'addDesignScreen' ||
    tool === 'saveDesignPlaygroundState'
  ) {
    return { ...base, ...designAskView(tool, args) }
  }
  if (tool === CHAT_REVIEW_TOOL) {
    return { ...base, ...chatReviewAskView(payload.detail, args) }
  }
  if (tool === CHAT_TO_BASE_TOOL) {
    return { ...base, ...chatToBaseAskView(payload.detail, args) }
  }
  if (tool === FEATURE_QUESTION_TOOL) {
    return { ...base, ...featureQuestionAskView(payload.detail, args) }
  }
  if (tool === ACCEPT_REQUEST_TOOL) {
    const mode = args.mode === 'process' || args.mode === 'chat' ? args.mode : undefined
    return {
      ...base,
      icon: 'run',
      ask: ACCEPT_REQUEST_ASK.ask,
      tag: ACCEPT_REQUEST_ASK.tag,
      headline: ACCEPT_REQUEST_ASK.headline,
      consequence: ACCEPT_REQUEST_ASK.consequence,
      verb: ACCEPT_REQUEST_ASK.verb,
      body: { kind: 'accept-request', requestId: text(args.id) ?? '', ...(mode ? { mode } : {}) },
    }
  }
  if (tool === 'requestInstallPackage') {
    const ecosystem = text(args.ecosystem) ?? ''
    const name = text(args.name) ?? ''
    const version = text(args.version)
    return {
      ...base,
      icon: 'package',
      ask: 'The agent wants to install a package',
      tag: 'Sandbox',
      headline: `Install ${name}${version ? ` ${version}` : ''} from ${ecosystem}`,
      consequence: 'Its package registry opens to the agent’s sandbox, for this package only.',
      verb: 'Install',
      body: { kind: 'package', ecosystem, name, ...(version ? { version } : {}) },
    }
  }
  if (tool === 'requestNetworkUnlock') {
    const host = text(args.host) ?? ''
    return {
      ...base,
      icon: 'network',
      ask: 'The agent wants to reach a host',
      tag: 'Sandbox',
      headline: `Open ${host} to the sandbox`,
      consequence: 'It stays open for as long as this sandbox runs.',
      verb: 'Allow',
      body: { kind: 'network', host },
    }
  }
  if (tool === 'requestExternalFetch') {
    const url = text(args.url) ?? ''
    return {
      ...base,
      icon: 'fetch',
      ask: 'The agent wants to read a page',
      tag: 'Sandbox',
      headline: `Fetch ${url}`,
      consequence: 'The host sends one request to this exact address, with no cookies or sign-in.',
      verb: 'Fetch',
      body: { kind: 'fetch', url },
    }
  }
  if (tool === 'sendChatMessage') {
    const target = record(payload.detail)
    const label = text(target.targetLabel) ?? text(args.chatId) ?? 'another chat'
    const targetProjectId = text(target.targetProjectId)
    return {
      ...base,
      icon: 'message',
      ask: 'The agent wants to message another chat',
      tag: 'Chats',
      headline: `Message ${label}`,
      verb: 'Send',
      body: {
        kind: 'message',
        target: label,
        ...(targetProjectId ? { targetProjectId } : {}),
        message: typeof args.message === 'string' ? args.message : '',
        awaitReply: args.awaitReply === true,
      },
    }
  }
  if (tool === 'writeProjectFile') {
    const path = text(args.path) ?? ''
    const content = typeof args.content === 'string' ? args.content : ''
    const projectId = text(args.projectId)
    return {
      ...base,
      icon: 'file',
      ask: 'The agent wants to write a file',
      tag: 'Files',
      headline: `Create ${path}`,
      consequence: 'A new file: it never overwrites one that is there.',
      verb: 'Write it',
      body: {
        kind: 'write',
        ...(projectId ? { projectId } : {}),
        path,
        content,
        lines: content === '' ? 0 : content.split('\n').length,
      },
    }
  }
  if (tool === 'setFeatureStatus' || tool === 'removeBlocker') {
    const storyId = text(args.storyId) ?? ''
    const featureId = text(args.featureId)
    const work = `#${storyId}${featureId ? `.${featureId}` : ''}`
    const copy = STORY_DECISION_ASK
    if (tool === 'removeBlocker') {
      return {
        ...base,
        icon: 'run',
        ask: copy.blocker.ask,
        tag: copy.tag,
        headline: sentence ?? copy.blocker.headline,
        verb: copy.blocker.verb,
        body: { kind: 'references', text: copy.blocker.body(work, text(args.blocker) ?? '') },
      }
    }
    const status = args.status === 'done' ? copy.done : copy.deferred
    return {
      ...base,
      icon: 'run',
      ask: status.ask,
      tag: copy.tag,
      headline: sentence ?? status.headline,
      verb: status.verb,
      body: { kind: 'references', text: work },
    }
  }
  if (tool === 'deleteStory' || tool === 'deleteFeature') {
    const storyId = text(args.storyId) ?? ''
    const featureId = text(args.featureId)
    const what = tool === 'deleteStory' ? 'story' : 'feature'
    return {
      ...base,
      tone: 'danger',
      icon: 'delete',
      ask: `The agent wants to delete a ${what}`,
      tag: TOOL_ASK_COPY.cannotUndo,
      headline: sentence ?? `Delete this ${what}`,
      verb: `Delete ${what}`,
      body: { kind: 'delete-story', storyId, ...(featureId ? { featureId } : {}) },
    }
  }
  if (tool === 'deleteAssistantConversation') {
    const headline = sentence ?? 'Delete an Assistant conversation'
    return {
      ...base,
      tone: 'danger',
      icon: 'delete',
      ask: 'The agent wants to delete an Assistant conversation',
      tag: TOOL_ASK_COPY.cannotUndo,
      headline,
      consequence: 'Its messages and attachments go for good.',
      verb: 'Delete conversation',
      body: { kind: 'delete', what: headline },
    }
  }
  if (DELETE_TOOL.test(tool)) {
    const headline = sentence ?? `Use ${tool}`
    return {
      ...base,
      tone: 'danger',
      icon: 'delete',
      ask: 'The agent wants to delete something',
      tag: TOOL_ASK_COPY.cannotUndo,
      headline,
      verb: 'Delete',
      body: { kind: 'delete', what: headline },
    }
  }
  return {
    ...base,
    icon: 'tool',
    ask: TOOL_ASK_COPY.genericAsk,
    tag: tool,
    headline: sentence ?? `Use ${tool}`,
    verb: TOOL_ASK_COPY.genericVerb,
    body: { kind: 'details', ...(detail !== undefined ? { text: detail } : {}) },
  }
}

/**
 * The card for a change to the person's repository: the host's card read as
 * the shared shape — what it wants by operation, the headline the host wrote,
 * the agent's reason, the real-repository warning as the consequence. Pure.
 */
export function gitChangeAskView(card: GitChangeCardView, args: unknown): ToolAskCardView {
  const why = text(record(args).reason)
  const pushed = card.commits?.gainedTotal ?? 0
  const verb = card.danger
    ? TOOL_ASK_COPY.dangerVerb
    : card.operation === 'push'
      ? `Push ${plural(pushed, 'commit')}`
      : (GIT_CHANGE_VERB[card.operation] ?? TOOL_ASK_COPY.genericVerb)
  const icon = card.danger
    ? 'delete'
    : card.operation === 'merge' ||
        card.operation === 'merge-plan' ||
        card.operation === 'resolve-conflicts'
      ? 'merge'
      : card.operation === 'push' || card.operation === 'pull-request'
        ? 'push'
        : 'git'
  return {
    icon,
    tone: card.danger ? 'danger' : 'ask',
    ask: GIT_CHANGE_ASK[card.operation] ?? GIT_CHANGE_ASK_FALLBACK,
    tag: 'Git',
    headline: card.headline,
    ...(why ? { why } : {}),
    consequence: card.warning,
    verb,
    body: { kind: 'git' },
  }
}

/**
 * The radio a reusable approval offers: just this once, then each place an
 * always-allow may reach, described by what it covers, and trusting the site
 * the ask is about when there is one. None when no always-allow is on offer. Pure.
 */
export function toolAskScopeOptions(
  scopes: readonly AlwaysAllowScope[],
  toolName: string,
  covers: GrantCovers,
  site?: string,
): ToolAskScopeOption[] {
  if (scopes.length === 0) return []
  const subject = (where: string) =>
    covers === 'tool' ? `Every later ${toolName} call ${where}` : `This exact call, ${where}`
  return [
    { decision: 'once', ...TOOL_ASK_SCOPE.once },
    ...(scopes.includes('chat')
      ? [
          {
            decision: 'always-in-chat' as const,
            label: TOOL_ASK_SCOPE.chat.label,
            hint:
              covers === 'tool'
                ? subject('in this chat')
                : 'This exact call, whenever it repeats in this chat',
          },
        ]
      : []),
    ...(scopes.includes('everywhere')
      ? [
          {
            decision: 'always-everywhere' as const,
            label: TOOL_ASK_SCOPE.everywhere.label,
            hint: subject('in every chat, with any model or sign-in'),
          },
        ]
      : []),
    ...(site
      ? [
          {
            decision: 'trust-site' as const,
            label: TOOL_ASK_SCOPE.site.label,
            hint: TOOL_ASK_SITE_HINT(site),
          },
        ]
      : []),
  ]
}

/** A decided card as its one line: what was allowed and how far, or that it was turned down. Pure. */
export function toolAskDecidedLine(
  view: Pick<ToolAskCardView, 'headline'>,
  decision: PendingToolGrantDecision,
): ToolAskDecidedLine {
  if (decision === 'deny') return { tone: 'declined', text: TOOL_ASK_COPY.declined }
  const reach = decision === 'once' ? undefined : TOOL_ASK_SCOPE_DONE[decision]
  return {
    tone: 'done',
    text: `${TOOL_ASK_COPY.done(view.headline)}${reach ? ` · ${reach}` : ''}`,
  }
}

/**
 * The decided lines still worth showing: those the server has not reported
 * decided yet. Once it has, the ask's own row in the conversation shows the
 * decision where it was asked, so its line would only trail behind newer
 * messages. Pure.
 */
export function toolAskDecidedLinesAwaitingRows<T extends { id: string }>(
  lines: readonly T[],
  decidedAsks: readonly { id: string }[],
): T[] {
  const decided = new Set(decidedAsks.map((a) => a.id))
  return lines.filter((l) => !decided.has(l.id))
}

const reasonOf = (args: unknown): { why?: string } => {
  const why = text(record(args).reason)
  return why ? { why } : {}
}

/**
 * The card for starting a story's work in its own run: the story by title,
 * joining the story's open run where the person chose that, what it waits on
 * first, and what the run leaves alone. Pure.
 */
export function featureWorkAskView(input: {
  storyTitle?: string
  joinsOpenRun: boolean
  args?: unknown
  /** The work elsewhere, not done yet, the run waits on before it starts. */
  waitingOn?: readonly string[]
}): ToolAskCardView {
  const title = input.storyTitle ?? FEATURE_WORK_ASK.untitled
  return {
    icon: 'run',
    tone: 'ask',
    ask: FEATURE_WORK_ASK.ask,
    tag: FEATURE_WORK_ASK.tag,
    headline: input.joinsOpenRun
      ? FEATURE_WORK_ASK.joinHeadline(title)
      : FEATURE_WORK_ASK.headline(title),
    ...reasonOf(input.args),
    consequence:
      input.waitingOn && input.waitingOn.length > 0
        ? `${FEATURE_WORK_ASK.waitsOn(input.waitingOn)} ${FEATURE_WORK_ASK.consequence}`
        : FEATURE_WORK_ASK.consequence,
    verb: input.joinsOpenRun ? FEATURE_WORK_ASK.joinVerb : FEATURE_WORK_ASK.verb,
    body: { kind: 'launch' },
  }
}

/**
 * Whether a story launch can start: never past the server's refusal or a story
 * with nothing left to work, nor before its plan is read or its open work has
 * been given a way forward. Pure.
 */
export function featureWorkLaunchCheck(input: {
  storyId?: string
  proposalLoaded: boolean
  refusal?: string
  openWorkUnchosen: boolean
  storyLoaded: boolean
  featureCount: number
}): ToolAskLaunchCheck {
  if (input.refusal !== undefined) return { ready: false, problem: input.refusal }
  if (input.storyLoaded && input.featureCount === 0) {
    return { ready: false, problem: FEATURE_WORK_ASK.nothingLeft }
  }
  if (input.storyId !== undefined && !input.proposalLoaded) return { ready: false }
  if (input.openWorkUnchosen) return { ready: false, problem: FEATURE_WORK_ASK.chooseOpenWork }
  return { ready: true }
}

/** The card for one run across a group's projects: its title, how many projects, how it merges. Pure. */
export function groupWorkAskView(
  summary: Pick<StartGroupWorkGrantSummary, 'legs' | 'title'>,
  args: unknown,
): ToolAskCardView {
  const count = summary.legs.length
  return {
    icon: 'run',
    tone: 'ask',
    ask: GROUP_WORK_ASK.ask,
    tag: GROUP_WORK_ASK.projects(count),
    headline: summary.title ?? GROUP_WORK_ASK.headline(count),
    ...reasonOf(args),
    consequence: PROCESS_GROUP_LAUNCH_BLURB,
    verb: GROUP_WORK_ASK.verb,
    body: { kind: 'launch' },
  }
}

/**
 * The card for a run chat's proposal: its kind in the host's sentence, its
 * subject, what approving does, and its own verb. One that cannot be undone
 * is a danger card. Pure.
 */
export function runProposalAskView(view: RunProposalView, args: unknown): ToolAskCardView {
  return {
    icon: view.danger ? 'delete' : 'run',
    tone: view.danger ? 'danger' : 'ask',
    ask: RUN_PROPOSAL_ASK.ask(view.kindLabel),
    tag: view.danger
      ? TOOL_ASK_COPY.cannotUndo
      : view.kind.startsWith('group-')
        ? RUN_PROPOSAL_ASK.group
        : RUN_PROPOSAL_ASK.run,
    headline: view.title || view.kindLabel,
    ...reasonOf(args),
    consequence: view.effect,
    verb: view.approveLabel,
    body: { kind: 'proposal' },
  }
}

/**
 * The card for putting a project on GitHub: a new repository by its plan, or a
 * push to the one the project already has. Pure.
 */
export function gitSetupAskView(plan: GitSetupPlan, args: unknown): ToolAskCardView {
  return {
    icon: 'push',
    tone: 'ask',
    ask: plan.createsRepo ? GIT_SETUP_ASK.createAsk : GIT_SETUP_ASK.pushAsk,
    tag: GIT_SETUP_ASK.tag,
    headline: plan.headline,
    ...reasonOf(args),
    verb: plan.createsRepo ? GIT_SETUP_ASK.createVerb : GIT_SETUP_ASK.pushVerb,
    body: { kind: 'git' },
  }
}
