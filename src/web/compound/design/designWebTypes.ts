/** What a person proposes: files from this machine, project files by path, or a link. */
export type DesignDraftSource =
  | { type: 'files'; files: File[] }
  | { type: 'paths'; paths: string[] }
  | { type: 'link'; url: string; name?: string }
