/** What pressing a story's process chip does, by the state it shows. */
export const PROCESS_STATUS_OVERLAY_TITLES = {
  review: 'Ready for sign-off — open the pipeline to review and approve',
  working: 'The process is running — open the pipeline',
  stuck: 'The process is stuck — open the pipeline to unblock it',
  changesRequested: 'You requested changes — open the pipeline to send the work back to be fixed',
} as const
