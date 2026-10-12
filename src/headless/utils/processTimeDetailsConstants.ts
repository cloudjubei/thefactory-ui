import type { ProcessTimePart } from './processTimeDetailsTypes'

/** What each part of a time breakdown is called. */
export const PROCESS_TIME_PART_LABELS: Record<ProcessTimePart, string> = {
  thinking: 'Agent thinking',
  tools: 'Tools & commands',
  system: 'Setup, checks & commits',
  other: 'Other',
  running: 'Still running',
}

/** What each part of a time breakdown holds. */
export const PROCESS_TIME_PART_HINTS: Record<ProcessTimePart, string> = {
  thinking: 'The model reading, reasoning and writing',
  tools: 'Shell commands, builds, device actions, file and MCP tools',
  system: 'Starting the agent, preparing and committing its work, and checks',
  other: 'Time no record could place',
  running: 'Split once the step ends',
}

/** How many of the slowest tools a time's details list. */
export const PROCESS_TIME_TOOLS_SHOWN = 3

/** The line that says time waiting on a person was left out of the total. */
export const PROCESS_TIME_WAITING_LABEL = 'Waiting on a person — not counted'
