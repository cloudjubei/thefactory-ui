import type { ProcessPersonDecisionVia, ProcessResumeChoice } from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'
import { PROCESS_RUN_PERSON_ENDING_VIEW } from './processViewConstants'

/** A decision at a gate, as its record names it. */
export const PROCESS_SIGNOFF_DECISION_VIEW: Record<
  ProcessResumeChoice,
  { label: string; tone: ProcessStatusTone }
> = {
  approve: { label: 'Approved', tone: 'done' },
  ...PROCESS_RUN_PERSON_ENDING_VIEW,
  continue: { label: 'Carried on', tone: 'empty' },
  retry: { label: 'Tried again', tone: 'empty' },
  allow: { label: 'Allowed', tone: 'done' },
  'allow-site': { label: 'Allowed — site trusted', tone: 'done' },
  resolved: { label: 'Resolved', tone: 'done' },
  'more-info': { label: 'Answered', tone: 'empty' },
  'update-base': { label: 'Base updated', tone: 'empty' },
  'resolve-base-conflict': { label: 'Sent to resolve the conflict', tone: 'empty' },
  'change-proof': { label: 'Proof changed', tone: 'empty' },
  'send-to-developer': { label: 'Sent to the developer', tone: 'empty' },
  recheck: { label: 'Checks run again', tone: 'empty' },
}

/** Where a person decided, as a decision's record says it. */
export const PROCESS_SIGNOFF_DECIDED_VIA_TEXT: Record<ProcessPersonDecisionVia, string> = {
  web: 'on web',
  desktop: 'on desktop',
  mobile: 'on mobile',
  chat: 'in the agent’s chat',
  'feature-question': 'on the feature’s question',
  design: 'in the Design view',
}

/** The words of a decided sign-off's record. */
export const PROCESS_SIGNOFF_RECORD_TEXT = {
  heading: 'Your decision',
  attempt: (n: number) => `attempt ${n}`,
  integration: 'Brought in by',
  earlier: 'Earlier decisions',
  review: 'What you decided on',
  discuss: 'Discuss in chat',
  discussDetail:
    'Opens the run’s chat with this decision quoted, to talk it over or ask for more work.',
  draftHeading: 'Sign-off',
  byYou: 'by you',
  byRunChatAgent: 'by the run’s chat agent',
  byChatAgent: 'by a chat agent',
  byManager: 'by the agent manager',
  agentTool: (tool: string) => `${tool}, approved by you`,
} as const
