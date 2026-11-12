import type { PendingToolGrant, PendingToolGrantDecision } from './chatTypes'
import { START_PROCESS_RUN_TOOL_NAME } from './pendingToolGrantsConstants'
import { PROCESS_LAUNCH_COPY } from './processLaunchFormConstants'
import type {
  ProcessRunGrantSummary,
  ProcessRunLaunchGrantInput,
  ProcessRunStartBody,
} from './processRunLaunchGrantTypes'
import { runProposalArgs } from './runProposalView'
import type { ToolAskCardView } from './toolAskCardTypes'

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined

/** Whether a grant is the request to start a process from its form. Pure. */
export function isStartProcessRunGrant(grant: Pick<PendingToolGrant, 'toolName'>): boolean {
  return grant.toolName === START_PROCESS_RUN_TOOL_NAME
}

/** What a `startProcessRun` ask names, read defensively from the agent's arguments. Pure. */
export function startProcessRunGrantSummary(
  grant: Pick<PendingToolGrant, 'args' | 'detail'>,
): ProcessRunGrantSummary {
  const args = runProposalArgs(grant)
  const { inputValues, runner, turnLimit } = args
  const values =
    typeof inputValues === 'object' && inputValues !== null && !Array.isArray(inputValues)
      ? (inputValues as Record<string, unknown>)
      : {}
  const named = (key: string) => {
    const value = text(args[key])
    return value ? { [key]: value } : {}
  }
  return {
    ...named('processId'),
    inputValues: values,
    ...named('title'),
    ...named('note'),
    ...named('baseBranch'),
    ...(runner === 'cli' || runner === 'api' ? { runner } : {}),
    ...named('cliTool'),
    ...named('cliModel'),
    ...named('cliCredentialId'),
    ...(turnLimit !== undefined ? { turnLimit } : {}),
  }
}

/**
 * The launch card's ask for a process started from a page: the same card an
 * agent's `startProcessRun` raises, so every launch reads and decides the same.
 * Its Approve launches with the card's picks, its Deny closes it. Pure.
 */
export function processRunLaunchGrant(input: ProcessRunLaunchGrantInput): PendingToolGrant {
  const args = { ...(input.agent ?? {}), processId: input.processId }
  return {
    id: `launch:process:${input.processId}`,
    chatRunner: input.chatRunner,
    label: START_PROCESS_RUN_TOOL_NAME,
    toolName: START_PROCESS_RUN_TOOL_NAME,
    args,
    detail: { tool: START_PROCESS_RUN_TOOL_NAME, args },
    processFixed: true,
    decide: async (decision: PendingToolGrantDecision, metadata?: Record<string, unknown>) => {
      if (decision === 'deny') {
        input.onCancel()
        return
      }
      await input.onLaunch({ ...(input.agent ?? {}), ...metadata })
    },
  }
}

const START_BODY_KEYS: readonly string[] = [
  'inputValues',
  'title',
  'note',
  'baseBranch',
  'runner',
  'cliTool',
  'cliModel',
  'cliCredentialId',
  'llmConfigId',
  'effort',
  'turnLimit',
  'spendCapUsd',
  'stepSpendCapUsd',
  'wallClockMs',
  'maxIterations',
  'questionCap',
  'checkTimeoutMs',
  'fakeDataInProduct',
]

/** What `POST /process-runs` takes of a card's decision: nothing it would refuse. Pure. */
export function processRunStartBody(
  projectId: string,
  processId: string,
  metadata: Readonly<Record<string, unknown>>,
): ProcessRunStartBody {
  const picked = START_BODY_KEYS.flatMap((key) =>
    metadata[key] !== undefined ? [[key, metadata[key]] as const] : [],
  )
  return { projectId, processId, ...Object.fromEntries(picked) }
}

/** The card a process launch shows: what it starts, and its verb. Pure. */
export function processRunAskView(name: string | undefined): ToolAskCardView {
  return {
    icon: 'run',
    tone: 'ask',
    ask: PROCESS_LAUNCH_COPY.ask,
    headline: name ?? PROCESS_LAUNCH_COPY.ask,
    verb: PROCESS_LAUNCH_COPY.verb,
    body: { kind: 'launch' },
  }
}
