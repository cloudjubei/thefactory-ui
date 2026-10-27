/** How a model chip names an API provider. */
export const MODEL_CHIP_PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  google: 'Google',
  xai: 'xAI',
  groq: 'Groq',
  together: 'Together',
  azure: 'Azure',
  ollama: 'Ollama',
  local: 'Local',
  custom: 'Custom',
}

export const MODEL_CHIP_PICK_PROVIDER = 'Select'
export const MODEL_CHIP_PICK_MODEL = 'model…'
export const MODEL_CHIP_PICK_TITLE = 'Select model'
export const MODEL_CHIP_UNKNOWN_PROVIDER = '—'
export const MODEL_CHIP_UNKNOWN_TITLE = 'Unknown model'
export const MODEL_CHIP_REAUTH_FALLBACK = 'sign-in expired'

/** What a chip that can be switched off says, and its picker's segment, while it is off. */
export const MODEL_CHIP_OFF = 'Off'

/** The picker's price line for a model whose price is not known. */
export const MODEL_CHIP_PRICE_UNKNOWN = 'Price unknown'
