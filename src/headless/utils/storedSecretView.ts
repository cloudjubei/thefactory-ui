import { cleanCliToolName } from './cliRunner'
import { SHOW_STORED_SECRET_TOOL_NAME, STORED_SECRET_LABELS } from './storedSecretViewConstants'
import type { StoredSecretKind, StoredSecretView } from './storedSecretViewTypes'

/** Whether a row is an agent showing the person a stored secret, on any transport. Pure. */
export function isShowStoredSecretTool(name: string | undefined): boolean {
  return name !== undefined && cleanCliToolName(name) === SHOW_STORED_SECRET_TOOL_NAME
}

function isKind(kind: unknown): kind is StoredSecretKind {
  return typeof kind === 'string' && kind in STORED_SECRET_LABELS
}

function parsedRecord(text: string): Record<string, unknown> | undefined {
  try {
    return resultRecord(JSON.parse(text))
  } catch {
    return undefined
  }
}

/** The host's result: as sent, or as a CLI row's text — whose first line it is when a note follows. */
function resultRecord(result: unknown): Record<string, unknown> | undefined {
  if (typeof result === 'string') {
    return parsedRecord(result) ?? parsedRecord(result.split('\n', 1)[0] ?? '')
  }
  return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined
}

/**
 * The secret a `showStoredSecret` row lets the person reveal, once the host
 * showed it — from the host's result, which names it and never holds its
 * value. Nothing before the call ran or when the host refused it. Pure.
 */
export function storedSecretView(input: {
  args: unknown
  result?: unknown
  resultType?: string
}): StoredSecretView | undefined {
  if (input.resultType !== 'success') return undefined
  const shown = resultRecord(input.result)
  if (shown?.shownToUser !== true || !isKind(shown.kind) || typeof shown.id !== 'string') {
    return undefined
  }
  const purpose = (input.args as { purpose?: unknown } | undefined)?.purpose
  return {
    kind: shown.kind,
    id: shown.id,
    name: typeof shown.name === 'string' ? shown.name : shown.id,
    label: STORED_SECRET_LABELS[shown.kind],
    ...(typeof purpose === 'string' && purpose.trim() ? { purpose: purpose.trim() } : {}),
  }
}
