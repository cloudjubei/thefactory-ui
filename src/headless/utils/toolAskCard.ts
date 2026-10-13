// Pure readers behind the one card every waiting tool shares: what it wants,
// the thing itself, the agent's reason and the verb on its button — read from
// the ask the host raised, never from the agent's own description of it.

import { grantDetailView } from './approvalGrant'
import type { AlwaysAllowScope, GrantCovers, PendingToolGrantDecision } from './chatTypes'
import type { GitChangeCardView } from './gitChangeApprovalTypes'
import type { GitSetupPlan } from './gitSetupApprovalTypes'
import { PROCESS_GROUP_LAUNCH_BLURB } from './processGroupLaunchConstants'
import type { StartGroupWorkGrantSummary } from './processGroupLaunchTypes'
import type { RunProposalView } from './runProposalViewTypes'
import {
  FEATURE_WORK_ASK,
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
    : card.operation === 'merge' || card.operation === 'merge-plan'
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
 * joining the story's open run where the person chose that, and what the run
 * leaves alone. Pure.
 */
export function featureWorkAskView(input: {
  storyTitle?: string
  joinsOpenRun: boolean
  args?: unknown
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
    consequence: FEATURE_WORK_ASK.consequence,
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
