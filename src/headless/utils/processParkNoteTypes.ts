import type { ProofKind } from 'thefactory-tools/types'

/** One proof a request for changes can require of its fix, as the composer offers it. */
export interface RequestProofChoice {
  kind: ProofKind
  label: string
}

/** The words a park's note composer says, which depend on where the requested changes go. */
export interface ParkNoteCopy {
  /** What the field asks for — its placeholder and accessible label. */
  prompt: string
  /** The button that sends the choice with the note. */
  submitLabel: string
}
