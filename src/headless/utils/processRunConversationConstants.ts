/** The words of a run's conversation on its page. */
export const RUN_CONVERSATION_COPY = {
  working: 'Working',
  asks: (count: number) =>
    count === 1 ? 'Waiting for your answer' : `Waiting for ${count} answers`,
  idle: 'Conversation',
  open: 'Open conversation',
  answer: 'Answer',
  label: (title: string, line: string) => `${title} · ${line}`,
} as const
