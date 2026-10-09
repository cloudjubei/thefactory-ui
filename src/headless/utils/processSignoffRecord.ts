import type { ProcessLedgerEntry, ProcessRun, ProcessStepState } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'

import { processIntegrationChoices } from './processIntegration'
import { REQUEST_PROOF_CHOICES } from './processParkNoteConstants'
import {
  PROCESS_SIGNOFF_DECIDED_VIA_TEXT,
  PROCESS_SIGNOFF_DECISION_VIEW,
  PROCESS_SIGNOFF_RECORD_TEXT,
} from './processSignoffRecordConstants'
import type {
  ProcessSignoffDecisionView,
  ProcessSignoffRecordView,
} from './processSignoffRecordTypes'

/**
 * What the person decided at a story's sign-off, from the gate's own attempts:
 * the latest decision — its choice, when, who decided it and where, their note,
 * how approved work came in and the proof a request for changes required — then
 * the earlier ones, newest first. `undefined` while no attempt was decided.
 */
export function processSignoffRecord(
  run: Pick<ProcessRun, 'id' | 'projectId' | 'workBranch'>,
  state: Pick<ProcessStepState, 'entries'>,
): ProcessSignoffRecordView | undefined {
  const decisions: ProcessSignoffDecisionView[] = []
  state.entries.forEach((entry, index) => {
    const override = entry.override
    if (!override) return
    const integration =
      override.integration && run.workBranch && !run.workBranch.shadow
        ? processIntegrationChoices(run.workBranch).find((c) => c.mode === override.integration)
            ?.label
        : undefined
    const decidedBy = decidedByText(run, override)
    const requestedProof = (override.requestedProof ?? []).map(
      (kind) => REQUEST_PROOF_CHOICES.find((c) => c.kind === kind)?.label ?? kind,
    )
    decisions.push({
      entryId: entry.id,
      attempt: index + 1,
      choice: override.choice,
      ...PROCESS_SIGNOFF_DECISION_VIEW[override.choice],
      at: override.at,
      ...(decidedBy ? { decidedBy } : {}),
      ...(override.note?.trim() ? { note: override.note.trim() } : {}),
      ...(integration ? { integration } : {}),
      ...(requestedProof.length > 0 ? { requestedProof } : {}),
    })
  })
  const latest = decisions.pop()
  return latest ? { latest, earlier: decisions.reverse() } : undefined
}

/** Who took a decision and where, in words; none when the decision does not say. */
function decidedByText(
  run: Pick<ProcessRun, 'id' | 'projectId'>,
  override: NonNullable<ProcessLedgerEntry['override']>,
): string | undefined {
  if (override.decidedBy === 'person') {
    const via =
      override.decidedVia && override.decidedVia !== 'tool' ? override.decidedVia : undefined
    return via
      ? `${PROCESS_SIGNOFF_RECORD_TEXT.byYou} · ${PROCESS_SIGNOFF_DECIDED_VIA_TEXT[via]}`
      : PROCESS_SIGNOFF_RECORD_TEXT.byYou
  }
  if (override.decidedBy !== 'agent') return undefined
  const runChat = override.chatContextId === getChatContextKey(processRunChatContext(run))
  const who = runChat
    ? PROCESS_SIGNOFF_RECORD_TEXT.byRunChatAgent
    : PROCESS_SIGNOFF_RECORD_TEXT.byChatAgent
  return override.toolName
    ? `${who} · ${PROCESS_SIGNOFF_RECORD_TEXT.agentTool(override.toolName)}`
    : who
}

/** A decision quoted for the run's chat, so the person can carry the conversation on from it. */
export function processSignoffDiscussDraft(decision: ProcessSignoffDecisionView): string {
  const heading = `> **${PROCESS_SIGNOFF_RECORD_TEXT.draftHeading} — ${decision.label}, ${PROCESS_SIGNOFF_RECORD_TEXT.attempt(decision.attempt)}**${decision.integration ? ` · ${decision.integration}` : ''}`
  const note = decision.note
    ? `\n${decision.note
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}`
    : ''
  return `${heading}${note}\n\n`
}
