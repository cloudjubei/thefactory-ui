import type {
  ProcessIntegrationAccountOption,
  ProcessIntegrationIdentityOption,
  ProcessIntegrationMode,
  ProcessIntegrationOptions,
  ProcessWorkBranch,
} from 'thefactory-tools/types'
import {
  PROCESS_INTEGRATION_FORM_NO_ACCOUNT,
  PROCESS_INTEGRATION_FORM_NO_IDENTITY,
  PROCESS_INTEGRATION_FORM_NO_MESSAGE,
  PROCESS_INTEGRATION_FORM_NO_TITLE,
  PROCESS_INTEGRATION_PREVIEW_HOSTS,
  PROCESS_INTEGRATION_PREVIEW_MAX_ENTRIES,
  PROCESS_INTEGRATION_PREVIEW_NO_ONE,
  PROCESS_INTEGRATION_PREVIEW_NOWHERE,
} from './processIntegrationFormConstants'
import type {
  ProcessIntegrationForm,
  ProcessIntegrationFormResult,
  ProcessIntegrationPreview,
  ProcessIntegrationPreviewEntry,
} from './processIntegrationFormTypes'

const offeredOrDefault = <T extends { isProjectDefault: boolean }>(
  offered: readonly T[],
  idOf: (o: T) => string,
  wanted: string | undefined,
): string | undefined => {
  const kept = wanted ? offered.find((o) => idOf(o) === wanted) : undefined
  const chosen = kept ?? offered.find((o) => o.isProjectDefault) ?? offered[0]
  return chosen ? idOf(chosen) : undefined
}

/**
 * Where the form for `mode` starts: what the person chose before — the identity
 * and account whatever the way, the words only for the same way — else the
 * project's identity and account and the words the server offers. Pure.
 */
export function processIntegrationFormStart(
  mode: ProcessIntegrationMode,
  options: ProcessIntegrationOptions,
): ProcessIntegrationForm {
  const before = options.decision
  const sameWay = before?.mode === mode
  const identityId = offeredOrDefault(
    options.identities,
    (o) => o.credentialId,
    before?.identity?.credentialId,
  )
  const accountId = offeredOrDefault(options.accounts, (o) => o.credentialId, before?.credentialId)
  const pullRequest = (sameWay && before?.pullRequest) || options.defaults.pullRequest
  return {
    mode,
    ...(identityId ? { identityId } : {}),
    message:
      sameWay && before?.message !== undefined
        ? before.message
        : mode === 'merge'
          ? options.defaults.merge
          : options.defaults.squash,
    ...(accountId ? { accountId } : {}),
    prTitle: pullRequest.title,
    prBody: pullRequest.body,
  }
}

/** The decision a filled-in form sends, or what is missing from it. Pure. */
export function processIntegrationFormDecision(
  form: ProcessIntegrationForm,
  options: ProcessIntegrationOptions,
): ProcessIntegrationFormResult {
  if (form.mode === 'pull-request') {
    const account = options.accounts.find((a) => a.credentialId === form.accountId)
    if (!account) return { problem: PROCESS_INTEGRATION_FORM_NO_ACCOUNT }
    const title = form.prTitle.trim()
    if (!title) return { problem: PROCESS_INTEGRATION_FORM_NO_TITLE }
    return {
      decision: {
        mode: 'pull-request',
        credentialId: account.credentialId,
        pullRequest: { title, body: form.prBody.trimEnd() },
      },
    }
  }
  const identity = options.identities.find((i) => i.credentialId === form.identityId)
  if (!identity) return { problem: PROCESS_INTEGRATION_FORM_NO_IDENTITY }
  const message = form.message.trimEnd()
  if (!message.trim()) return { problem: PROCESS_INTEGRATION_FORM_NO_MESSAGE }
  return {
    decision: {
      mode: form.mode,
      identity: { name: identity.name, email: identity.email, credentialId: identity.credentialId },
      message,
    },
  }
}

function whereItShows(host: string | undefined): string {
  const known = host ? PROCESS_INTEGRATION_PREVIEW_HOSTS.find((h) => h.test.test(host)) : undefined
  return known ? `As it will show on ${known.name}` : PROCESS_INTEGRATION_PREVIEW_NOWHERE
}

function commitEntry(message: string, byline: string): ProcessIntegrationPreviewEntry {
  const [title = '', ...rest] = message.trimEnd().split('\n')
  const body = rest.join('\n').trim()
  return { title, ...(body ? { body } : {}), byline }
}

const commitsLabel = (count: number) => `${count} commit${count === 1 ? '' : 's'}`

/**
 * How the landed work will read where people look at it — on the remote's host
 * when it has a known one: a squash as its one commit, a merge as its merge
 * commit (none when the base has not moved) and the commits it brings, a pull
 * request as its title and description, each with who made it. Pure.
 */
export function processIntegrationFormPreview(
  form: ProcessIntegrationForm,
  options: ProcessIntegrationOptions,
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>,
): ProcessIntegrationPreview {
  const where = whereItShows(options.remoteHost)
  if (form.mode === 'pull-request') {
    const account = options.accounts.find((a) => a.credentialId === form.accountId)
    const body = form.prBody.trimEnd()
    return {
      where,
      entries: [
        {
          title: form.prTitle.trim(),
          ...(body ? { body } : {}),
          byline: `Opened by ${account?.username ?? 'no account'} from ${workBranch.name} into ${workBranch.baseRef}`,
        },
      ],
    }
  }
  const identity = options.identities.find((i) => i.credentialId === form.identityId)
  const byline = identity
    ? `${identity.name} <${identity.email}> committed`
    : PROCESS_INTEGRATION_PREVIEW_NO_ONE
  if (form.mode === 'squash') {
    return {
      where,
      entries: [commitEntry(form.message, byline)],
      note: `One commit on ${workBranch.baseRef}.`,
    }
  }
  const all = [
    ...(options.fastForward ? [] : [commitEntry(form.message, byline)]),
    ...options.commits.map((title) => ({ title, byline })),
  ]
  const entries = all.slice(0, PROCESS_INTEGRATION_PREVIEW_MAX_ENTRIES)
  const more = all.length - entries.length
  const count = commitsLabel(options.commits.length)
  return {
    where,
    entries,
    ...(more > 0 ? { more } : {}),
    note: options.fastForward
      ? `${workBranch.baseRef} has not moved, so the ${count} land on it as they are — no merge commit, so the message is used only if ${workBranch.baseRef} moves first.`
      : `A merge commit joins the ${count} to ${workBranch.baseRef}.`,
  }
}

/** An identity as the form offers it: as the commits will read, then the account. Pure. */
export function processIntegrationIdentityLabel(option: ProcessIntegrationIdentityOption): string {
  return `${option.name} <${option.email}> · ${option.username} on ${option.host}${
    option.isProjectDefault ? ' · project default' : ''
  }`
}

/** An account a pull request can be opened as. Pure. */
export function processIntegrationAccountLabel(option: ProcessIntegrationAccountOption): string {
  return `${option.username} on ${option.host} (${option.label})${
    option.isProjectDefault ? ' · project default' : ''
  }`
}
