// Re-export of the headless-lifted mention parser so existing
// `'thefactory-ui/web'` consumers (and the relative `./mention` import inside
// `FileMentionsTextarea.tsx`) keep working. Pure utility — lives in
// `headless/utils/mention.ts`.
export {
  applyMention,
  parseMention,
  rankMentionMatches,
  type MentionParse,
} from '../../../headless/utils/mention'
