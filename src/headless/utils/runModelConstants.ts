/** Claude model families, as a model id names them and a person reads them. */
export const CLAUDE_MODEL_FAMILIES: Record<string, string> = {
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
  fable: 'Fable',
}

/** `claude-opus-5-5`, `claude-sonnet-4-6-20260101`: family, then version. */
export const CLAUDE_FAMILY_FIRST_ID = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/

/** `claude-3-5-sonnet-20241022`: version, then family. */
export const CLAUDE_VERSION_FIRST_ID = /^claude-(\d+)(?:-(\d{1,2}))?-([a-z]+)(?:-\d{8})?$/

/** A `[1m]`-style context window suffix on a model id. */
export const MODEL_CONTEXT_SUFFIX = /\[(\d+)([km])\]$/i
