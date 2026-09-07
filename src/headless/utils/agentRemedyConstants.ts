// UI-side mirror of the SDK `CLI_AGENT_REMEDY_KIND`. Kept here (not imported from
// the SDK) so the headless layer stays free of the SDK's Node-only barrel.

/** Broker action kind for a remedy a remediable tool raised. */
export const REMEDY_ACTION_KIND = 'remedy'

/** Shown when a remedy payload carries no readable summary. */
export const REMEDY_FALLBACK_SUMMARY = 'A tool is blocked and needs help to continue.'
