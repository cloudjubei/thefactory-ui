import type { ToolAskDecidedLine } from './toolAskCardTypes'

/** The label a note's files are named under. */
export const COMPOSER_ANSWER_FILES_LABEL = 'Files:'

export const COMPOSER_ANSWER_TEXT = {
  noteSent: { tone: 'done', text: 'Your message went to the card' } as ToolAskDecidedLine,
} as const
