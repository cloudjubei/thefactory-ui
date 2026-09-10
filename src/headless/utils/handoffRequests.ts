import { CHECK_METHOD_ABSENT_NOUNS, CHECK_METHOD_CAPTURE_VERBS } from './checkMethodConstants'
import type { CheckMethodRow } from './checkMethodTypes'

export type HandoffPurpose = 'fix' | 'setup' | 'capture'

/** One fact line in the confirm — what it is about, and the answer. */
export type HandoffFact = { label: string; value: string }

/** Everything a hand-off needs: the button, the confirm, and the message it sends. */
export type HandoffRequest = {
  purpose: HandoffPurpose
  buttonLabel: string
  title: string
  facts: HandoffFact[]
  /** The one sentence that must be read before confirming. */
  caveat: string
  /** What goes into the chat when confirmed — the agent's actual instruction. */
  message: string
}

const OUTPUT_EXCERPT_CHARS = 800

function excerpt(output: string | undefined): string {
  const trimmed = output?.trim() ?? ''
  if (trimmed.length === 0) return ''
  const cut =
    trimmed.length > OUTPUT_EXCERPT_CHARS ? `${trimmed.slice(0, OUTPUT_EXCERPT_CHARS)}…` : trimmed
  return `\n\nOutput:\n${cut}`
}

/**
 * The hand-off for one method, in one of its three purposes.
 *
 * One source for the button, the confirm and the chat message, so what the
 * button promises is what the confirm states is what the agent is told. The
 * message names the branch and asks for the result to be FILED as evidence on
 * this run — a fix nobody can see afterwards is not a fix the reviewer can
 * sign off on.
 */
export function handoffRequest(
  row: Pick<CheckMethodRow, 'id' | 'label' | 'noun' | 'setupVerb' | 'detail' | 'output'>,
  purpose: HandoffPurpose,
  context: { branch: string | undefined },
): HandoffRequest {
  const branch = context.branch ?? 'the review branch'
  const onBranch = context.branch ? `the review branch ${context.branch}` : 'the review branch'

  if (purpose === 'fix') {
    return {
      purpose,
      buttonLabel: 'Ask the agent to fix this',
      title: `Ask the agent to fix ${row.noun}?`,
      facts: [
        { label: 'Works on', value: branch },
        { label: 'Touches', value: `only what it needs to make ${row.noun} pass` },
        { label: "Won't", value: 'merge anything, or touch your working tree' },
        { label: 'Costs', value: 'one agent run' },
      ],
      caveat:
        'Removing or skipping a check does not count as fixing it. New commits also invalidate the checks you have just read — they are re-run before it comes back to you.',
      message:
        `On ${onBranch}, ${row.noun} failed: ${row.detail}. ` +
        `Fix the cause — do not remove or skip the check — then run it again on that branch and file the result as evidence on this run.` +
        excerpt(row.output),
    }
  }

  if (purpose === 'setup') {
    return {
      purpose,
      buttonLabel: `Ask the agent to ${row.setupVerb}`,
      title: `Ask the agent to ${row.setupVerb}?`,
      facts: [
        { label: 'Works on', value: branch },
        { label: 'Adds', value: 'configuration, and code where it needs it' },
        { label: 'From now on', value: 'every future run gets this check too' },
        { label: 'Costs', value: 'one agent run' },
      ],
      caveat:
        'You review the setup here like any other change. New commits invalidate the checks you have just read — they are re-run before it comes back to you.',
      message:
        `This project has no ${CHECK_METHOD_ABSENT_NOUNS[row.id]}. Please ${row.setupVerb} so it can run from now on, ` +
        `run it once on ${onBranch}, and file the result as evidence on this run.`,
    }
  }

  // Capture asks for the CAPTURE verb, never the setup verb: this branch's own
  // confirm promises it changes no code, so "set up an emulator" contradicted it.
  const captureVerb = CHECK_METHOD_CAPTURE_VERBS[row.id]
  return {
    purpose,
    buttonLabel: `Ask the agent to ${captureVerb}`,
    title: `Ask the agent to ${captureVerb}?`,
    facts: [
      { label: 'Produces', value: `${row.noun}, filed as evidence on this run` },
      { label: 'Needs', value: 'the app running — which is why this is agent work, not a command' },
      { label: "Won't", value: 'change any code' },
      { label: 'Costs', value: 'one agent run' },
    ],
    caveat: 'No commits, so everything you have already read stays valid.',
    message: `Please ${captureVerb} for ${onBranch} and file it as evidence on this run.`,
  }
}
