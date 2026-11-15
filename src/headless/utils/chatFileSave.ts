import { attachmentDisplayName } from 'thefactory-tools/utils'
import type { ChatFileSaveState } from './chatFileSaveTypes'

/** Where a shown file is saved by default: its own name, at the project's root. Pure. */
export function defaultSaveDestination(source: string): string {
  return attachmentDisplayName(source)
}

/** A destination as typed, made project-relative: trimmed, no leading `./` or `/`. Pure. */
export function normalizeSaveDestination(input: string): string {
  return input
    .trim()
    .replace(/\\/g, '/')
    .replace(/^(\.\/|\/)+/, '')
}

/** One shown file of one project. Pure. */
export function chatFileSaveKey(projectId: string, source: string): string {
  return `${projectId}\u0000${source}`
}

/** The file reads as saved: done, or under way and taken as done. Pure. */
export function chatFileSaveShownAsSaved(state: ChatFileSaveState): boolean {
  return state.status === 'saving' || state.status === 'saved'
}

/**
 * A second press asks for what is already under way or done: the same place,
 * not replacing anything. Pure.
 */
export function chatFileSaveIsRepeat(
  state: ChatFileSaveState,
  destination: string,
  overwrite: boolean,
): boolean {
  if (state.status === 'saving') return true
  return state.status === 'saved' && state.destination === destination && !overwrite
}
