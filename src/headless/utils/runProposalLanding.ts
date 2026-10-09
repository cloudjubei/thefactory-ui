import { PROCESS_INTEGRATION_MODES } from 'thefactory-tools/constants'
import { processIntegrationFormDecision, processIntegrationFormStart } from 'thefactory-tools/utils'
import type {
  ProcessIntegrationForm,
  ProcessIntegrationMode,
  ProcessIntegrationOptions,
} from 'thefactory-tools/types'
import { PROCESS_INTEGRATION_CHECK_MERGE } from './processIntegrationFormConstants'
import {
  RUN_PROPOSAL_LANDING_MODE_LABELS,
  RUN_PROPOSAL_LANDING_SHADOW,
} from './runProposalViewConstants'
import type { RunProposalLanding } from './runProposalViewTypes'

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (r: Record<string, unknown>, key: string): string | undefined =>
  typeof r[key] === 'string' ? (r[key] as string) : undefined

const isMode = (v: unknown): v is ProcessIntegrationMode =>
  typeof v === 'string' && PROCESS_INTEGRATION_MODES.includes(v as ProcessIntegrationMode)

/** How the host said the work lands on a card, read loosely; `undefined` when it stated none. Pure. */
export function runProposalLanding(detail: unknown): RunProposalLanding | undefined {
  const d = record(detail)
  if (!isMode(d.mode)) return undefined
  const identity = record(d.commitAs)
  const commitAs = text(identity, 'credentialId')
  const name = text(identity, 'name')
  const email = text(identity, 'email')
  const pullRequest = record(d.pullRequest)
  const prTitle = text(pullRequest, 'title')
  const pullRequestAccount = text(d, 'pullRequestAccount')
  const message = text(d, 'message')
  const options = d.options ? (d.options as ProcessIntegrationOptions) : undefined
  return {
    mode: d.mode,
    modes: Array.isArray(d.modes) ? d.modes.filter(isMode) : [d.mode],
    workBranch: text(d, 'workBranch') ?? '',
    baseRef: text(d, 'baseRef') ?? '',
    shadow: d.shadow === true,
    ...(commitAs ? { commitAs } : {}),
    ...(name && email ? { commitAsLabel: `${name} <${email}>` } : {}),
    ...(message !== undefined ? { message } : {}),
    ...(typeof d.buildFirst === 'boolean' ? { buildFirst: d.buildFirst } : {}),
    ...(pullRequestAccount ? { pullRequestAccount } : {}),
    ...(prTitle !== undefined
      ? { pullRequest: { title: prTitle, body: text(pullRequest, 'body') ?? '' } }
      : {}),
    ...(options ? { options } : {}),
  }
}

/**
 * The form a landing's card starts at: exactly what the card states, the rest
 * where the sign-off's form starts. `undefined` when there is nothing to
 * choose — a project with no git of its own, or no options to choose from. Pure.
 */
export function runProposalLandingForm(
  landing: RunProposalLanding,
): ProcessIntegrationForm | undefined {
  if (landing.shadow || !landing.options) return undefined
  const start = processIntegrationFormStart(landing.mode, landing.options)
  return {
    ...start,
    ...(landing.commitAs ? { identityId: landing.commitAs } : {}),
    ...(landing.message !== undefined ? { message: landing.message } : {}),
    ...(landing.buildFirst !== undefined ? { checkMerge: landing.buildFirst } : {}),
    ...(landing.pullRequestAccount ? { accountId: landing.pullRequestAccount } : {}),
    ...(landing.pullRequest
      ? { prTitle: landing.pullRequest.title, prBody: landing.pullRequest.body }
      : {}),
  }
}

/** The form switched to another way: that way's own words, keeping who it is made and opened as. Pure. */
export function runProposalLandingWithMode(
  form: ProcessIntegrationForm,
  mode: ProcessIntegrationMode,
  options: ProcessIntegrationOptions,
): ProcessIntegrationForm {
  const start = processIntegrationFormStart(mode, options)
  return {
    ...start,
    ...(form.identityId ? { identityId: form.identityId } : {}),
    ...(form.accountId ? { accountId: form.accountId } : {}),
  }
}

/** A form's landing as the tool's arguments say it, for its own way. */
function landingArgs(form: ProcessIntegrationForm): Record<string, unknown> {
  return form.mode === 'pull-request'
    ? {
        mode: form.mode,
        ...(form.accountId ? { pullRequestAccount: form.accountId } : {}),
        pullRequestTitle: form.prTitle,
        pullRequestBody: form.prBody,
      }
    : {
        mode: form.mode,
        ...(form.identityId ? { commitAs: form.identityId } : {}),
        message: form.message,
        buildFirst: form.checkMerge,
      }
}

/**
 * What approving carries when the person changed how the work lands on the
 * card: the whole landing as they set it, so it lands exactly as the card
 * showed — or `undefined` when they changed nothing. Pure.
 */
export function runProposalLandingEdits(
  landing: RunProposalLanding,
  form: ProcessIntegrationForm,
): { args: Record<string, unknown> } | undefined {
  const asked = runProposalLandingForm(landing)
  if (!asked) return undefined
  const before = JSON.stringify(landingArgs(asked))
  const now = landingArgs(form)
  return JSON.stringify(now) === before ? undefined : { args: now }
}

/** What stops the landing being sent, as the sign-off's form would say it, or `undefined`. Pure. */
export function runProposalLandingProblem(
  form: ProcessIntegrationForm,
  options: ProcessIntegrationOptions,
): string | undefined {
  const result = processIntegrationFormDecision(form, options)
  return 'problem' in result ? result.problem : undefined
}

/** How the work lands, in one line: the way, where, and as whom. Pure. */
export function runProposalLandingLine(
  landing: RunProposalLanding,
  form: ProcessIntegrationForm | undefined,
): string {
  if (landing.shadow) return RUN_PROPOSAL_LANDING_SHADOW
  const mode = form?.mode ?? landing.mode
  const way = `${RUN_PROPOSAL_LANDING_MODE_LABELS[mode]} into ${landing.baseRef}`
  const options = landing.options
  if (mode === 'pull-request') {
    const accountId = form?.accountId ?? landing.pullRequestAccount
    const account =
      options?.accounts.find((a) => a.credentialId === accountId)?.username ?? accountId ?? ''
    const title = form?.prTitle ?? landing.pullRequest?.title ?? ''
    return `${way}, opened as ${account} — “${title.trim()}”`
  }
  const identity = options?.identities.find(
    (i) => i.credentialId === (form?.identityId ?? landing.commitAs),
  )
  const who = identity ? `${identity.name} <${identity.email}>` : landing.commitAsLabel
  const checked =
    (form?.checkMerge ?? landing.buildFirst) ? PROCESS_INTEGRATION_CHECK_MERGE.line : ''
  return `${who ? `${way}, as ${who}` : way}${checked}`
}
