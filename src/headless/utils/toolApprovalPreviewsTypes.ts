/** A call waiting on an approval whose preview has not been asked for yet. */
export type ToolApprovalPreviewRequest = {
  toolCallId: string
  toolName: string
  args: unknown
}

/** A preview that could not be made, shown in place of the proposed result. */
export type ToolApprovalPreviewFailure = {
  status: 'error'
  error: string
}
