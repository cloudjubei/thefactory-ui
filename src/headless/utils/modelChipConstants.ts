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
