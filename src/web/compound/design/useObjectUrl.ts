import { useEffect, useState } from 'react'

/**
 * A `blob:` URL for a file served over http — what an `<img>` can show where
 * the page's CSP lets images come only from itself, `data:` and `blob:` (the
 * desktop renderer). `undefined` while it loads, or when `src` is.
 */
export function useObjectUrl(src: string | undefined): {
  url: string | undefined
  error: string | undefined
} {
  const [state, setState] = useState<{ src?: string; url?: string; error?: string }>({})
  useEffect(() => {
    if (!src) return
    let alive = true
    let made: string | undefined
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Could not load the file (${r.status}).`)
        return r.blob()
      })
      .then((blob) => {
        made = URL.createObjectURL(blob)
        if (alive) setState({ src, url: made })
        else URL.revokeObjectURL(made)
      })
      .catch((err: unknown) => {
        if (alive) setState({ src, error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [src])
  return state.src === src
    ? { url: state.url, error: state.error }
    : { url: undefined, error: undefined }
}
