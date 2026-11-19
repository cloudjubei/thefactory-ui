/** What a message the person sends from the composer becomes. */
export type ComposerMessageRoute<G> =
  | { kind: 'send' }
  | { kind: 'decision-note'; grant: G }
  | { kind: 'run-gate-note'; runId: string }
