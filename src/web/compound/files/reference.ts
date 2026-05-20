// Re-export of the headless-lifted reference parser. See `./mention.ts`
// for the rationale — the impl lives in `headless/utils/reference.ts`.
export {
  applyReference,
  parseReference,
  type ReferenceParse,
  type ReferenceSuggestion,
} from '../../../headless/utils/reference'
