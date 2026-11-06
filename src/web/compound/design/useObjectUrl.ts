import { useEffect, useState } from 'react'
import { designFileRequest, useAuthToken } from '../../../headless'

/**
 * A `blob:` URL for a file served over http, for a page whose CSP keeps `<img>`
 * to itself, `data:` and `blob:`. Asked for with the bearer where there is one:
 * see {@link designFileRequest}. `undefined` while it loads, or when `src` is.
 */
export function useObjectUrl(src: string | undefined): {
  url: string | undefined
  error: string | undefined
} {
  const bearer = useAuthToken()
  const request = src ? designFileRequest(src, bearer) : undefined
  const address = request?.url
  const authorization = request?.headers.Authorization
  const [state, setState] = useState<{ address?: string; url?: string; error?: string }>({})
  useEffect(() => {
    if (!address) return
    const stopped = new AbortController()
    let made: string | undefined
    fetch(address, {
      ...(authorization ? { headers: { Authorization: authorization } } : {}),
      signal: stopped.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Could not load the file (${r.status}).`)
        return r.blob()
      })
      .then((blob) => {
        if (stopped.signal.aborted) return
        made = URL.createObjectURL(blob)
        setState({ address, url: made })
      })
      .catch((err: unknown) => {
        if (stopped.signal.aborted) return
        setState({ address, error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      stopped.abort()
      if (made) URL.revokeObjectURL(made)
    }
  }, [address, authorization])
  return state.address === address
    ? { url: state.url, error: state.error }
    : { url: undefined, error: undefined }
}
