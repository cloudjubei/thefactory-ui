import { processAlreadyLandedText } from 'thefactory-tools/utils'
import {
  runProposalLanding,
  runProposalLandingForm,
  runProposalLandingLine,
} from './runProposalLanding'
import {
  ANSWER_GROUP_RUN_PARK_TOOL_NAME,
  ANSWER_RUN_PARK_TOOL_NAME,
  CLOSE_RUN_FEATURES_TOOL_NAME,
  SETTLE_RUN_ALREADY_LANDED_TOOL_NAME,
  MARK_GROUP_LEG_LANDED_TOOL_NAME,
  REMOVE_PROCESS_GROUP_RUN_TOOL_NAME,
  REMOVE_PROCESS_TOOL_NAME,
  RESUME_ENDED_GROUP_RUN_TOOL_NAME,
  RUN_PROPOSAL_GROUP_DELETE,
  RUN_PROPOSAL_GROUP_LANDED,
  RUN_PROPOSAL_GROUP_PARK,
  RUN_PROPOSAL_GROUP_RESUME,
  RUN_PROPOSAL_GROUP_STOP,
  RUN_PROPOSAL_LANDING_MODE_LABELS,
  RUN_PROPOSAL_REMOVE_PROCESS,
  STOP_PROCESS_GROUP_RUN_TOOL_NAME,
  DECIDE_RUN_GATE_TOOL_NAME,
  REMOVE_PROCESS_RUN_TOOL_NAME,
  PROPOSE_FEATURE_CHANGE_TOOL_NAME,
  PROPOSE_RUN_FEATURE_TOOL_NAME,
  PROPOSE_RUN_START_TOOL_NAME,
  PROPOSE_STEP_RERUN_TOOL_NAME,
  RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME,
  RESOLVE_RUN_INTEGRATION_CONFLICT_TOOL_NAME,
  RETRY_RUN_INTEGRATION_TOOL_NAME,
  RUN_PROPOSAL_CHANGE,
  RUN_PROPOSAL_CHANGE_WORDS,
  RUN_PROPOSAL_DEFER,
  RUN_PROPOSAL_ALREADY_LANDED,
  RUN_PROPOSAL_CLOSURE,
  RUN_PROPOSAL_DELETE,
  RUN_PROPOSAL_TURN_LIMIT,
  SET_RUN_TURN_LIMIT_TOOL_NAME,
  RUN_PROPOSAL_FEATURE,
  RUN_PROPOSAL_GATE,
  RUN_PROPOSAL_LAND,
  RUN_PROPOSAL_LINE_LABELS,
  RUN_PROPOSAL_NEW_STORY,
  RUN_PROPOSAL_PARK,
  RUN_PROPOSAL_RERUN,
  RUN_PROPOSAL_RESOLVE,
  RUN_PROPOSAL_RESOLVE_CONFLICT,
  RUN_PROPOSAL_REVIVE,
  RUN_PROPOSAL_SEND_BACK,
  RUN_PROPOSAL_START,
  RUN_PROPOSAL_STOP,
  RUN_PROPOSAL_SUMMARY_MAX_CHARS,
  RUN_PROPOSAL_TOOL_NAMES,
  RUN_PROPOSAL_WITHDRAW,
  SEND_RUN_BACK_TOOL_NAME,
  REVIVE_PROCESS_RUN_TOOL_NAME,
  STOP_PROCESS_RUN_TOOL_NAME,
  WITHDRAW_RUN_CHANGE_TOOL_NAME,
} from './runProposalViewConstants'
import type {
  RunProposalLanding,
  RunProposalSection,
  RunProposalStartDetail,
  RunProposalView,
} from './runProposalViewTypes'
import { runProposalEdit } from './runProposalEditView'

type GrantLike = { toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (args: Record<string, unknown>, key: string): string | undefined =>
  typeof args[key] === 'string' && (args[key] as string).trim()
    ? (args[key] as string).trim()
    : undefined

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v) : []

/** Whether an approval is for one of a run chat's proposals — named by the grant or its payload. */
export function isRunProposalGrant(grant: GrantLike): boolean {
  const tool = grant.toolName ?? record(grant.detail).tool
  return typeof tool === 'string' && RUN_PROPOSAL_TOOL_NAMES.includes(tool)
}

/** The tool a run-chat approval is for. */
export function runProposalToolName(grant: GrantLike): string {
  const tool = grant.toolName ?? record(grant.detail).tool
  return typeof tool === 'string' ? tool : ''
}

/** The arguments the agent proposed with. */
export function runProposalArgs(grant: GrantLike): Record<string, unknown> {
  return grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
}

/** What the host stated on the ask, beside the agent's arguments. */
export function runProposalHostDetail(grant: GrantLike): Record<string, unknown> {
  return record(record(grant.detail).detail)
}

/** The step a rerun proposal is for, by the name the host stated on the ask. */
export function runProposalStepName(grant: GrantLike): string | undefined {
  return text(runProposalHostDetail(grant), 'stepName')
}

/** `value` on one line, cut to the summary's length. Pure. */
export function runProposalOneLine(value: string): string {
  const line = value.replace(/\s+/g, ' ').trim()
  return line.length > RUN_PROPOSAL_SUMMARY_MAX_CHARS
    ? `${line.slice(0, RUN_PROPOSAL_SUMMARY_MAX_CHARS - 1).trimEnd()}…`
    : line
}

/**
 * The criteria an acceptance text lists: one per line when it is a bulleted or
 * numbered list, else each `1)` / `2.` it numbers inline, else the text whole. Pure.
 */
export function runProposalCriteria(acceptance: string): string[] {
  const lines = acceptance
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const marker = /^(?:[-*•]|\d+[.)])\s+/
  if (lines.length > 1 && lines.every((l) => marker.test(l))) {
    return lines.map((l) => l.replace(marker, ''))
  }
  const inline = acceptance.split(/(?:^|\s)\d+[.)]\s+/).map((p) => p.trim())
  const numbered = inline.slice(1).filter(Boolean)
  return numbered.length > 1 ? numbered : [acceptance.trim()]
}

function wordsSection(key: string, label: string, value: string | undefined) {
  return value ? [{ key, label, summary: runProposalOneLine(value), markdown: value }] : []
}

function acceptanceSection(value: string | undefined): RunProposalSection[] {
  if (!value) return []
  const items = runProposalCriteria(value)
  if (items.length < 2)
    return wordsSection('acceptance', RUN_PROPOSAL_LINE_LABELS.acceptance, value)
  return [
    {
      key: 'acceptance',
      label: RUN_PROPOSAL_LINE_LABELS.acceptance,
      summary: runProposalOneLine(`${items.length} criteria — ${items[0]}`),
      items,
    },
  ]
}

function proofPlanSection(value: unknown): RunProposalSection[] {
  const plan = record(value)
  const kinds = strings(plan.kinds)
  if (kinds.length === 0) return []
  const notes = text(plan, 'notes')
  return [
    {
      key: 'proofPlan',
      label: RUN_PROPOSAL_LINE_LABELS.proofPlan,
      summary: runProposalOneLine(notes ? `${kinds.join(', ')} — ${notes}` : kinds.join(', ')),
      chips: kinds,
      ...(notes ? { markdown: notes } : {}),
    },
  ]
}

function proofSection(value: unknown, preset = false): RunProposalSection[] {
  const kinds = strings(value)
  return kinds.length > 0
    ? [
        {
          key: 'proof',
          label: preset ? RUN_PROPOSAL_LINE_LABELS.proofPreset : RUN_PROPOSAL_LINE_LABELS.proof,
          summary: kinds.join(', '),
          chips: kinds,
        },
      ]
    : []
}

/** What a start's ask stated, read loosely: the changes it runs and the model. Pure. */
export function runProposalStartDetail(detail: Record<string, unknown>): RunProposalStartDetail {
  const changes = (Array.isArray(detail.changes) ? detail.changes : []).flatMap((raw) => {
    const c = record(raw)
    const id = text(c, 'id')
    const title = text(c, 'title')
    if (!id || !title) return []
    const featureId = text(c, 'featureId')
    return [
      {
        id,
        title,
        kind: text(c, 'kind') ?? '',
        summary: text(c, 'summary') ?? '',
        ...(featureId ? { featureId } : {}),
      },
    ]
  })
  const model = text(detail, 'model')
  return { changes, ...(model ? { model } : {}) }
}

const changeWord = (kind: string) =>
  RUN_PROPOSAL_CHANGE_WORDS[kind] ?? RUN_PROPOSAL_CHANGE_WORDS['feature-changed']

function startSections(
  args: Record<string, unknown>,
  detail: RunProposalStartDetail,
): RunProposalSection[] {
  const count = detail.changes.length || strings(args.changeIds).length
  const listed = detail.changes.map((c) => `${changeWord(c.kind)} “${c.title}”`)
  return [
    {
      key: 'changes',
      label: RUN_PROPOSAL_LINE_LABELS.changes,
      summary: runProposalOneLine(
        listed.length > 0
          ? `${count} — ${listed.join(', ')}`
          : `${count} change${count === 1 ? '' : 's'}`,
      ),
      ...(detail.changes.length > 0
        ? {
            items: detail.changes.map(
              (c) => `${changeWord(c.kind)} “${c.title}”${c.summary ? ` — ${c.summary}` : ''}`,
            ),
          }
        : {}),
    },
    ...(detail.model
      ? [{ key: 'model', label: RUN_PROPOSAL_LINE_LABELS.model, summary: detail.model }]
      : []),
  ]
}

/**
 * A run chat's proposal as its approval card shows it: its kind, what it says
 * as sections that each close to one line, and what approving it does in one
 * line. `subjectTitle` names what it is about — the feature a change or an
 * addition is for, the step to run again — when it can be read; `hostDetail`
 * is what the host stated on the ask (the changes a start runs, the change a
 * withdrawal takes off). `undefined` for any other tool.
 */
export function runProposalView(
  toolName: string,
  args: Record<string, unknown>,
  subjectTitle?: string,
  hostDetail: Record<string, unknown> = {},
): RunProposalView | undefined {
  const view = proposalView(toolName, args, subjectTitle, hostDetail)
  const edit = runProposalEdit(hostDetail)
  return view && edit ? { ...view, edit } : view
}

function proposalView(
  toolName: string,
  args: Record<string, unknown>,
  subjectTitle: string | undefined,
  hostDetail: Record<string, unknown>,
): RunProposalView | undefined {
  const needsYouItemId = text(args, 'needsYouItemId') ?? text(args, 'itemId')
  const base = { featureId: undefined, storyId: undefined, needsYouItemId }
  if (toolName === PROPOSE_RUN_FEATURE_TOOL_NAME) {
    const featureId = text(args, 'featureId')
    return {
      ...base,
      featureId,
      kind: 'feature',
      kindLabel: RUN_PROPOSAL_FEATURE.kindLabel,
      tone: 'review',
      title: text(args, 'title') ?? subjectTitle ?? featureId ?? '',
      sections: [
        ...wordsSection(
          'description',
          RUN_PROPOSAL_LINE_LABELS.description,
          text(args, 'description'),
        ),
        ...acceptanceSection(text(args, 'acceptance')),
        ...proofPlanSection(args.proofPlan),
      ],
      effect: RUN_PROPOSAL_FEATURE.effect,
      approveLabel: RUN_PROPOSAL_FEATURE.approveLabel,
    }
  }
  if (toolName === PROPOSE_FEATURE_CHANGE_TOOL_NAME) {
    const featureId = text(args, 'featureId')
    return {
      ...base,
      featureId,
      kind: 'change',
      kindLabel: RUN_PROPOSAL_CHANGE.kindLabel,
      tone: 'working',
      title: subjectTitle ?? featureId ?? '',
      sections: [
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')),
        ...wordsSection(
          'description',
          RUN_PROPOSAL_LINE_LABELS.description,
          text(args, 'description'),
        ),
        ...acceptanceSection(text(args, 'acceptance')),
        ...proofPlanSection(args.proofPlan),
        ...proofSection(args.proofKinds),
      ],
      effect: RUN_PROPOSAL_CHANGE.effect,
      approveLabel: RUN_PROPOSAL_CHANGE.approveLabel,
    }
  }
  if (toolName === PROPOSE_RUN_START_TOOL_NAME) {
    const detail = runProposalStartDetail(hostDetail)
    const count = detail.changes.length || strings(args.changeIds).length
    return {
      ...base,
      kind: 'start',
      kindLabel: RUN_PROPOSAL_START.kindLabel,
      tone: 'review',
      title: `${count} staged change${count === 1 ? '' : 's'}`,
      sections: startSections(args, detail),
      effect: RUN_PROPOSAL_START.effect,
      approveLabel: RUN_PROPOSAL_START.approveLabel,
    }
  }
  if (toolName === WITHDRAW_RUN_CHANGE_TOOL_NAME) {
    const change = record(hostDetail.change)
    const featureId = text(change, 'featureId')
    const summary = text(change, 'summary')
    return {
      ...base,
      featureId,
      kind: 'withdraw',
      kindLabel: RUN_PROPOSAL_WITHDRAW.kindLabel,
      tone: 'working',
      title: text(change, 'title') ?? text(args, 'changeId') ?? '',
      sections: wordsSection('change', RUN_PROPOSAL_LINE_LABELS.change, summary),
      effect: RUN_PROPOSAL_WITHDRAW.effect,
      approveLabel: RUN_PROPOSAL_WITHDRAW.approveLabel,
    }
  }
  if (toolName === PROPOSE_STEP_RERUN_TOOL_NAME) {
    const step = subjectTitle ?? text(args, 'stepId') ?? ''
    return {
      ...base,
      kind: 'rerun',
      kindLabel: RUN_PROPOSAL_RERUN.kindLabel,
      tone: 'working',
      title: step,
      sections: wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')),
      effect: RUN_PROPOSAL_RERUN.effect(step),
      approveLabel: RUN_PROPOSAL_RERUN.approveLabel,
    }
  }
  if (toolName === RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME) {
    const storyId = text(args, 'storyId')
    const copy = storyId
      ? RUN_PROPOSAL_NEW_STORY
      : args.kind === 'deferred'
        ? RUN_PROPOSAL_DEFER
        : RUN_PROPOSAL_RESOLVE
    return {
      ...base,
      storyId,
      kind: 'resolve',
      kindLabel: copy.kindLabel,
      tone: 'done',
      title: text(args, 'decision') ?? '',
      sections: [],
      effect: copy.effect,
      approveLabel: copy.approveLabel,
    }
  }
  if (toolName === ANSWER_RUN_PARK_TOOL_NAME) {
    const choice = text(args, 'choice') ?? ''
    const label = text(hostDetail, 'label')
    const step = subjectTitle ?? text(hostDetail, 'stepName')
    const nested = text(hostDetail, 'nestedRunTitle')
    return {
      ...base,
      kind: 'park',
      kindLabel: label ?? RUN_PROPOSAL_PARK.kindLabel,
      tone: 'working',
      title: step ? `${step}${nested ? ` · ${nested}` : ''}` : choice,
      sections: [
        ...runSection(args, hostDetail),
        ...wordsSection(
          'parkMessage',
          RUN_PROPOSAL_LINE_LABELS.parkMessage,
          text(hostDetail, 'parkMessage'),
        ),
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.answer, text(args, 'note')),
      ],
      effect: text(hostDetail, 'effect') ?? RUN_PROPOSAL_PARK.effect(choice),
      approveLabel: label ?? RUN_PROPOSAL_PARK.approveLabel,
    }
  }
  if (toolName === STOP_PROCESS_RUN_TOOL_NAME) {
    return {
      ...base,
      kind: 'stop',
      kindLabel: RUN_PROPOSAL_STOP.kindLabel,
      tone: 'working',
      title: text(hostDetail, 'runTitle') ?? RUN_PROPOSAL_STOP.untitled,
      sections: runSection(args, hostDetail),
      effect: text(hostDetail, 'effect') ?? RUN_PROPOSAL_STOP.effect,
      approveLabel: RUN_PROPOSAL_STOP.approveLabel,
    }
  }
  return runActionView(toolName, args, hostDetail, base)
}

/** The run a call names by id, as its card says it: by the title the host read, else the id. */
function runSection(
  args: Record<string, unknown>,
  hostDetail: Record<string, unknown>,
): RunProposalSection[] {
  const runId = text(args, 'runId')
  if (!runId) return []
  return [
    {
      key: 'run',
      label: RUN_PROPOSAL_LINE_LABELS.run,
      summary: text(hostDetail, 'runTitle') ?? runId,
    },
  ]
}

function landingSection(landing: RunProposalLanding | undefined): RunProposalSection[] {
  if (!landing) return []
  return [
    {
      key: 'landing',
      label: RUN_PROPOSAL_LINE_LABELS.landing,
      summary: runProposalLandingLine(landing, runProposalLandingForm(landing)),
    },
  ]
}

const GATE_TONES: Readonly<Record<string, RunProposalView['tone']>> = {
  approve: 'done',
  reject: 'stuck',
}

/** The cards of the run's own buttons beyond answering a stop and stopping it. */
function runActionView(
  toolName: string,
  args: Record<string, unknown>,
  hostDetail: Record<string, unknown>,
  base: Pick<RunProposalView, 'featureId' | 'storyId' | 'needsYouItemId'>,
): RunProposalView | undefined {
  const runTitle = text(hostDetail, 'runTitle') ?? text(args, 'runId') ?? ''
  const effect = text(hostDetail, 'effect')
  const run = runSection(args, hostDetail)
  if (toolName === DECIDE_RUN_GATE_TOOL_NAME) {
    const choice = text(args, 'choice') ?? ''
    const gate = text(hostDetail, 'gateName')
    const nested = text(hostDetail, 'nestedRunTitle')
    const landing = runProposalLanding(hostDetail.landing)
    return {
      ...base,
      kind: 'gate',
      kindLabel: text(hostDetail, 'label') ?? RUN_PROPOSAL_GATE.kindLabel,
      tone: GATE_TONES[choice] ?? 'working',
      title: gate ? `${gate}${nested ? ` · ${nested}` : ''}` : choice,
      sections: [
        ...run,
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')),
        ...proofSection(hostDetail.proofKinds ?? args.proofKinds, hostDetail.proofPreset === true),
        ...landingSection(landing),
      ],
      effect: effect ?? RUN_PROPOSAL_GATE.effect(choice),
      approveLabel: RUN_PROPOSAL_GATE.approveLabels[choice] ?? RUN_PROPOSAL_GATE.approveLabel,
      ...(landing ? { landing } : {}),
    }
  }
  if (toolName === RETRY_RUN_INTEGRATION_TOOL_NAME) {
    const landing = runProposalLanding(hostDetail.landing)
    return {
      ...base,
      kind: 'land',
      kindLabel: RUN_PROPOSAL_LAND.kindLabel,
      tone: 'review',
      title: runTitle,
      sections: [
        ...run,
        ...wordsSection(
          'lastError',
          RUN_PROPOSAL_LINE_LABELS.lastError,
          text(hostDetail, 'lastError'),
        ),
        ...landingSection(landing),
      ],
      effect: effect ?? RUN_PROPOSAL_LAND.effect,
      approveLabel: RUN_PROPOSAL_LAND.approveLabel,
      ...(landing ? { landing } : {}),
    }
  }
  if (toolName === RESOLVE_RUN_INTEGRATION_CONFLICT_TOOL_NAME) {
    const paths = strings(hostDetail.paths)
    return {
      ...base,
      kind: 'resolve-conflict',
      kindLabel: RUN_PROPOSAL_RESOLVE_CONFLICT.kindLabel,
      tone: 'working',
      title: runTitle,
      sections: [
        ...run,
        ...(paths.length > 0
          ? [
              {
                key: 'files',
                label: RUN_PROPOSAL_LINE_LABELS.files,
                summary: runProposalOneLine(paths.join(', ')),
                items: paths,
              },
            ]
          : []),
      ],
      effect: effect ?? RUN_PROPOSAL_RESOLVE_CONFLICT.effect,
      approveLabel: RUN_PROPOSAL_RESOLVE_CONFLICT.approveLabel,
    }
  }
  if (toolName === SEND_RUN_BACK_TOOL_NAME) {
    return {
      ...base,
      kind: 'send-back',
      kindLabel: RUN_PROPOSAL_SEND_BACK.kindLabel,
      tone: 'working',
      title: runTitle,
      sections: [
        ...run,
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(hostDetail, 'note')),
      ],
      effect: effect ?? RUN_PROPOSAL_SEND_BACK.effect,
      approveLabel: RUN_PROPOSAL_SEND_BACK.approveLabel,
    }
  }
  if (toolName === REVIVE_PROCESS_RUN_TOOL_NAME) {
    return {
      ...base,
      kind: 'revive',
      kindLabel: RUN_PROPOSAL_REVIVE.kindLabel,
      tone: 'working',
      title: runTitle,
      sections: [
        ...run,
        ...wordsSection('step', RUN_PROPOSAL_LINE_LABELS.step, text(hostDetail, 'stoppedAtStep')),
      ],
      effect: effect ?? RUN_PROPOSAL_REVIVE.effect,
      approveLabel: RUN_PROPOSAL_REVIVE.approveLabel,
    }
  }
  if (toolName === REMOVE_PROCESS_RUN_TOOL_NAME) {
    const branches = hostDetail.deleteBranches === true ? strings(hostDetail.branches) : []
    return {
      ...base,
      kind: 'delete',
      kindLabel: RUN_PROPOSAL_DELETE.kindLabel,
      tone: 'stuck',
      title: runTitle,
      sections: [
        ...run,
        ...(branches.length > 0
          ? [
              {
                key: 'branches',
                label: RUN_PROPOSAL_LINE_LABELS.branches,
                summary: runProposalOneLine(branches.join(', ')),
                items: branches,
              },
            ]
          : []),
      ],
      effect: effect ?? RUN_PROPOSAL_DELETE.effect,
      approveLabel: RUN_PROPOSAL_DELETE.approveLabel,
      danger: true,
    }
  }
  if (toolName === SET_RUN_TURN_LIMIT_TOOL_NAME) {
    return {
      ...base,
      kind: 'turn-limit',
      kindLabel: RUN_PROPOSAL_TURN_LIMIT.kindLabel,
      tone: 'working',
      title: runTitle,
      sections: run,
      effect: effect ?? RUN_PROPOSAL_TURN_LIMIT.effect,
      approveLabel: RUN_PROPOSAL_TURN_LIMIT.approveLabel,
    }
  }
  if (toolName === SETTLE_RUN_ALREADY_LANDED_TOOL_NAME) {
    const landedBy = record(hostDetail.landedBy)
    const commit = text(landedBy, 'commit')
    const subject = text(landedBy, 'subject')
    const baseRef = text(hostDetail, 'baseRef') ?? ''
    const becomesDone = (Array.isArray(hostDetail.features) ? hostDetail.features : [])
      .map(record)
      .filter((f) => text(f, 'after') === 'done' && text(f, 'status') !== 'done')
      .map((f) => text(f, 'title') ?? text(f, 'id') ?? '')
    return {
      ...base,
      kind: 'already-landed',
      kindLabel: RUN_PROPOSAL_ALREADY_LANDED.kindLabel,
      tone: 'done',
      title: runTitle,
      sections: [
        ...run,
        ...(commit
          ? [
              {
                key: 'landedBy',
                label: RUN_PROPOSAL_LINE_LABELS.landedBy,
                summary: processAlreadyLandedText(baseRef, {
                  commit,
                  ...(subject ? { subject } : {}),
                }),
              },
            ]
          : []),
        ...itemsSection('done', RUN_PROPOSAL_LINE_LABELS.marksDone, becomesDone),
      ],
      effect: effect ?? RUN_PROPOSAL_ALREADY_LANDED.effect,
      approveLabel: RUN_PROPOSAL_ALREADY_LANDED.approveLabel,
    }
  }
  if (toolName === CLOSE_RUN_FEATURES_TOOL_NAME) {
    return {
      ...base,
      kind: 'close-features',
      kindLabel: RUN_PROPOSAL_CLOSURE.kindLabel,
      tone: 'working',
      title: runTitle,
      sections: run,
      effect: effect ?? RUN_PROPOSAL_CLOSURE.effect,
      approveLabel: RUN_PROPOSAL_CLOSURE.approveLabel,
    }
  }
  return groupAndDefinitionView(toolName, args, hostDetail, base)
}

function itemsSection(key: string, label: string, items: string[]): RunProposalSection[] {
  return items.length > 0
    ? [{ key, label, summary: runProposalOneLine(items.join(', ')), items }]
    : []
}

/** The cards of a group run's buttons and of deleting a process definition. */
function groupAndDefinitionView(
  toolName: string,
  args: Record<string, unknown>,
  hostDetail: Record<string, unknown>,
  base: Pick<RunProposalView, 'featureId' | 'storyId' | 'needsYouItemId'>,
): RunProposalView | undefined {
  const groupTitle = text(hostDetail, 'groupRunTitle') ?? text(args, 'groupRunId') ?? ''
  const effect = text(hostDetail, 'effect')
  if (toolName === ANSWER_GROUP_RUN_PARK_TOOL_NAME) {
    const choice = text(args, 'choice') ?? ''
    const label = text(hostDetail, 'label')
    const leg = record(hostDetail.leg)
    const legLine = text(leg, 'projectId')
    const mode = text(hostDetail, 'mode') ?? text(args, 'mode')
    return {
      ...base,
      kind: 'group-park',
      kindLabel: label ?? RUN_PROPOSAL_GROUP_PARK.kindLabel,
      tone: 'working',
      title: groupTitle,
      sections: [
        ...wordsSection(
          'parkMessage',
          RUN_PROPOSAL_LINE_LABELS.parkMessage,
          text(hostDetail, 'parkMessage'),
        ),
        ...(legLine
          ? [
              {
                key: 'leg',
                label: RUN_PROPOSAL_LINE_LABELS.leg,
                summary: `${legLine}${text(leg, 'title') ? ` · ${text(leg, 'title')}` : ''}`,
              },
            ]
          : []),
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')),
        ...(mode
          ? [
              {
                key: 'mode',
                label: RUN_PROPOSAL_LINE_LABELS.mode,
                summary: RUN_PROPOSAL_LANDING_MODE_LABELS[mode] ?? mode,
              },
            ]
          : []),
      ],
      effect: effect ?? RUN_PROPOSAL_GROUP_PARK.effect(choice),
      approveLabel: label ?? RUN_PROPOSAL_GROUP_PARK.approveLabel,
    }
  }
  if (toolName === STOP_PROCESS_GROUP_RUN_TOOL_NAME) {
    return {
      ...base,
      kind: 'group-stop',
      kindLabel: RUN_PROPOSAL_GROUP_STOP.kindLabel,
      tone: 'working',
      title: groupTitle,
      sections: [],
      effect: effect ?? RUN_PROPOSAL_GROUP_STOP.effect,
      approveLabel: RUN_PROPOSAL_GROUP_STOP.approveLabel,
    }
  }
  if (toolName === REMOVE_PROCESS_GROUP_RUN_TOOL_NAME) {
    const branches = hostDetail.deleteBranches === true ? strings(hostDetail.branches) : []
    return {
      ...base,
      kind: 'group-delete',
      kindLabel: RUN_PROPOSAL_GROUP_DELETE.kindLabel,
      tone: 'stuck',
      title: groupTitle,
      sections: itemsSection('branches', RUN_PROPOSAL_LINE_LABELS.branches, branches),
      effect: effect ?? RUN_PROPOSAL_GROUP_DELETE.effect,
      approveLabel: RUN_PROPOSAL_GROUP_DELETE.approveLabel,
      danger: true,
    }
  }
  if (toolName === MARK_GROUP_LEG_LANDED_TOOL_NAME) {
    const leg = record(hostDetail.leg)
    const legName = text(leg, 'projectId') ?? text(args, 'legId') ?? ''
    const commit = text(hostDetail, 'commit') ?? text(args, 'commit')
    const subject = text(hostDetail, 'subject')
    return {
      ...base,
      kind: 'group-landed',
      kindLabel: RUN_PROPOSAL_GROUP_LANDED.kindLabel,
      tone: 'working',
      title: groupTitle,
      sections: [
        ...(legName
          ? [
              {
                key: 'leg',
                label: RUN_PROPOSAL_LINE_LABELS.leg,
                summary: `${legName}${text(leg, 'title') ? ` · ${text(leg, 'title')}` : ''}`,
              },
            ]
          : []),
        ...(commit
          ? [
              {
                key: 'commit',
                label: RUN_PROPOSAL_LINE_LABELS.commit,
                summary: runProposalOneLine(
                  `${commit.slice(0, 7)}${subject ? ` — ${subject}` : ''}`,
                ),
              },
            ]
          : []),
        ...wordsSection('foundBy', RUN_PROPOSAL_LINE_LABELS.foundBy, text(hostDetail, 'foundBy')),
        ...wordsSection('note', RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')),
      ],
      effect: effect ?? RUN_PROPOSAL_GROUP_LANDED.effect(legName),
      approveLabel: RUN_PROPOSAL_GROUP_LANDED.approveLabel,
    }
  }
  if (toolName === RESUME_ENDED_GROUP_RUN_TOOL_NAME) {
    const starts = (Array.isArray(hostDetail.legs) ? hostDetail.legs : []).flatMap((l) => {
      const name = text(record(l), 'projectId')
      return name ? [name] : []
    })
    return {
      ...base,
      kind: 'group-resume',
      kindLabel: RUN_PROPOSAL_GROUP_RESUME.kindLabel,
      tone: 'working',
      title: groupTitle,
      sections: [
        ...itemsSection('starts', RUN_PROPOSAL_LINE_LABELS.starts, starts),
        ...itemsSection('rebuilt', RUN_PROPOSAL_LINE_LABELS.rebuilt, strings(hostDetail.rebuilt)),
        ...wordsSection('model', RUN_PROPOSAL_LINE_LABELS.model, text(hostDetail, 'agent')),
      ],
      effect: effect ?? RUN_PROPOSAL_GROUP_RESUME.effect,
      approveLabel: RUN_PROPOSAL_GROUP_RESUME.approveLabel,
    }
  }
  if (toolName === REMOVE_PROCESS_TOOL_NAME) {
    return {
      ...base,
      kind: 'remove-process',
      kindLabel: RUN_PROPOSAL_REMOVE_PROCESS.kindLabel,
      tone: 'stuck',
      title: text(hostDetail, 'name') ?? text(args, 'processId') ?? '',
      sections: [],
      effect: effect ?? RUN_PROPOSAL_REMOVE_PROCESS.effect,
      approveLabel: RUN_PROPOSAL_REMOVE_PROCESS.approveLabel,
      danger: true,
    }
  }
  return undefined
}
