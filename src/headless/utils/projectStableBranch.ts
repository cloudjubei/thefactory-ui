/** A project's stable branch setting, read and checked for its editor. Pure. */

import { isGitBranchName } from 'thefactory-tools/utils'

import {
  PROJECT_STABLE_BRANCH_HINT,
  PROJECT_STABLE_BRANCH_INVALID,
} from './projectStableBranchConstants'

/** The stable branch a project's metadata sets, trimmed; none when unset or blank. Pure. */
export function projectStableBranchOf(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  const set = metadata?.stableBranch
  const branch = typeof set === 'string' ? set.trim() : ''
  return branch || undefined
}

/** Why a typed stable branch cannot be saved; none for a branch name, or nothing. Pure. */
export function projectStableBranchError(value: string | undefined): string | undefined {
  const branch = value?.trim() ?? ''
  return branch && !isGitBranchName(branch) ? PROJECT_STABLE_BRANCH_INVALID(branch) : undefined
}

/** The editor field for the setting: its value, what it is for, and why it cannot be saved. Pure. */
export function projectStableBranchField(value: string | undefined): {
  value: string
  hint: string
  error?: string
} {
  const error = projectStableBranchError(value)
  return { value: value ?? '', hint: PROJECT_STABLE_BRANCH_HINT, ...(error ? { error } : {}) }
}
