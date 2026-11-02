import { COMMIT_CHECKS_FIX_ASK } from './commitChecksFixConstants'
import { terminalPlainText } from './terminalOutput'

/** A fence longer than any run of backticks in `text`, so the text cannot close it. */
function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longest + 1))
}

/**
 * The message a chat is started with to fix the commit checks that stopped a
 * commit: what to do, the commit it was for, the staged files, and what the
 * checks printed — colour codes dropped. Pure.
 */
export function commitChecksFixBrief(input: {
  output: string
  stagedFiles: readonly string[]
  message: string
}): string {
  const output = terminalPlainText(input.output).trim()
  const fence = fenceFor(output)
  const message = input.message.trim()
  return [
    ...COMMIT_CHECKS_FIX_ASK,
    ...(message ? [`Commit message: ${message}`] : []),
    ...(input.stagedFiles.length > 0
      ? [`Staged files:\n${input.stagedFiles.map((f) => `- ${f}`).join('\n')}`]
      : []),
    `What the checks printed:\n${fence}\n${output}\n${fence}`,
  ].join('\n\n')
}
