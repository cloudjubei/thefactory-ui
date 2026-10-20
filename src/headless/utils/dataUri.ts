import type { ParsedDataUri } from './dataUriTypes'

/**
 * Take a `data:` URI apart so a client can write its bytes to a file: a base64 body is handed
 * back as base64, a percent-encoded one decoded to text. `null` for anything that is not a
 * well-formed `data:` URI.
 */
export function parseDataUri(uri: string): ParsedDataUri | null {
  if (!uri.startsWith('data:')) return null
  const comma = uri.indexOf(',')
  if (comma < 0) return null
  const params = uri.slice('data:'.length, comma).split(';')
  const body = uri.slice(comma + 1)
  const mediaType = (params[0] || 'text/plain').toLowerCase()
  if (params.slice(1).includes('base64')) return { mediaType, encoding: 'base64', data: body }
  try {
    return { mediaType, encoding: 'utf8', data: decodeURIComponent(body) }
  } catch {
    return null
  }
}
