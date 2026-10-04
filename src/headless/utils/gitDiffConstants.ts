/**
 * What a diff view shows for a file whose diff the host left out because of its
 * size (`patchSuppressed: 'size'`, thefactory-tools `GIT_DIFF_MAX_FILE_PATCH_BYTES`)
 * — SourceTree's own wording. The file still lists with its line counts.
 */
export const GIT_DIFF_SUPPRESSED_MESSAGE = 'Diff was suppressed because of file size.'
