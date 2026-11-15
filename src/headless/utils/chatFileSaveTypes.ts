/** `POST /projects/:projectId/chat-files/save`: copy a file shown in a chat into the project. */
export type ChatFileSaveRequest = {
  /** The shown file, project-relative. */
  source: string
  /** Where it goes, project-relative. */
  destination: string
  /** Replace a file already there. */
  overwrite?: boolean
}

export type ChatFileSaveOutcome =
  | { ok: true; path: string }
  | {
      ok: false
      error: string
      /** The destination is taken: saving again with `overwrite` replaces it. */
      exists: boolean
    }

export type ChatFileSaveCall = (
  projectId: string,
  request: ChatFileSaveRequest,
) => Promise<ChatFileSaveOutcome>

/** Where a chat's shown files are saved to: its project, bound by the chat body. */
export type ChatFileSaving = {
  projectId: string
  /** A fixed answer in place of the backend's, for a showcase scene. */
  save?: ChatFileSaveCall
}

/**
 * How saving one shown file stands. `saving` reads as saved on screen at once;
 * a failure takes it back and says why.
 */
export type ChatFileSaveState =
  | { status: 'idle' }
  | { status: 'saving'; destination: string }
  | { status: 'saved'; destination: string }
  | { status: 'failed'; destination: string; error: string; exists: boolean }
