import type { ProofKind } from 'thefactory-tools/types'

/** One proof a request for changes can require of its fix, as the composer offers it. */
export interface RequestProofChoice {
  kind: ProofKind
  label: string
  /** Why the run cannot produce it here — it cannot be switched on. */
  unavailable?: string
}

/** The words a park's note composer says, which depend on where the requested changes go. */
export interface ParkNoteCopy {
  /** What the field asks for — its placeholder and accessible label. */
  prompt: string
  /** The button that sends the choice with the note. */
  submitLabel: string
}

/**
 * Where an answer's files come from: an upload from this device, kept with the
 * run's chat attachments, or a pick from the run's project files. Each resolves
 * the project path the answer hands over.
 */
export interface AnswerFilesSource {
  upload: (name: string, contentBase64: string) => Promise<string>
  /** The project's files to pick from — absent where there is no project, as in a group's chat. */
  loadProjectFiles?: () => Promise<string[]>
}
