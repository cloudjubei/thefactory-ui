import type {
  ProcessIntegrationAccountOption,
  ProcessIntegrationForm,
  ProcessIntegrationIdentityOption,
  ProcessIntegrationOptions,
  ProcessWorkBranch,
} from 'thefactory-tools/types'
import {
  PROCESS_INTEGRATION_PREVIEW_HOSTS,
  PROCESS_INTEGRATION_PREVIEW_MAX_ENTRIES,
  PROCESS_INTEGRATION_PREVIEW_NO_ONE,
  PROCESS_INTEGRATION_PREVIEW_NOWHERE,
} from './processIntegrationFormConstants'
import type {
  ProcessIntegrationPreview,
  ProcessIntegrationPreviewEntry,
} from './processIntegrationFormTypes'

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
      ? `${workBranch.baseRef} has not moved, so the ${count} are added to it as they are — no merge commit, so the message is used only if ${workBranch.baseRef} moves first.`
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
