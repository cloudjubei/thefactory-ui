/** What a person adds as drafts: files from this machine, project files by path, or a link. */
export type DesignDraftSource =
  | { type: 'files'; files: File[] }
  | { type: 'paths'; paths: string[] }
  | { type: 'link'; url: string; name?: string }

/** A draft on its way in, or one that was refused. */
export type DesignUploadRow = {
  key: string
  name: string
  screenId: string
  status: 'uploading' | 'failed'
  error?: string
}
