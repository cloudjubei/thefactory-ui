import type { CommitReceiptFile } from '../../../headless'

/**
 * What a commit holds, opened in place under its line: each file with its
 * status as one letter, then the commit's message.
 */
export function CommitChangeDetails({
  files,
  message,
}: {
  files: readonly CommitReceiptFile[]
  message: string | undefined
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-(--border-subtle) px-3 py-2 text-[12.5px]">
      {files.map((file) => (
        <span key={file.path} className="break-all font-mono text-[12px] text-(--text-primary)">
          <b className="inline-block w-4 font-semibold">{file.letter}</b>
          {file.path}
        </span>
      ))}
      {message ? (
        <span className="whitespace-pre-wrap text-(--text-secondary)">{message}</span>
      ) : null}
    </div>
  )
}
