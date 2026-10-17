import { useCallback, useEffect, useState } from 'react'
import type { DesignPlaygroundTheme } from '../api'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { getDesignPlayground, serveDesignPlayground } from '../api/generated'
import { designPlaygroundFrameUrl } from '../utils/designPlayground'
import { DESIGN_PLAYGROUND_POLL_MS } from '../utils/designViewConstants'
import type { DesignPlaygroundStatus } from './designStoreTypes'
import { useDesignViewToken } from './useDesignViewToken'

export type UseDesignPlayground = {
  /** `undefined` until read; a read that fails reads as `failed`. */
  status: DesignPlaygroundStatus | undefined
  /** Build and serve it again — after a failure, or to show the checkout as it is now. */
  retry: () => void
  /** The frame's address at `address` in `theme`; `undefined` until the view token is minted. */
  frameUrl: (address?: string, theme?: DesignPlaygroundTheme) => string | undefined
}

function failed(err: unknown): DesignPlaygroundStatus {
  return { status: 'failed', error: err instanceof Error ? err.message : String(err) }
}

/**
 * A project's design playground for the Design view: whether there is one,
 * read without starting it — and, while `open`, served from the checkout as
 * it stands, asked again until its build is ready.
 */
export function useDesignPlayground(
  projectId: string | undefined,
  { open }: { open: boolean },
): UseDesignPlayground {
  const { apiBaseUrl } = useApi()
  const { token: bearer } = useAuth()
  const { token } = useDesignViewToken(open ? projectId : undefined)
  const [status, setStatus] = useState<DesignPlaygroundStatus | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setStatus(undefined)
    if (!projectId || !bearer) return
    let alive = true
    getDesignPlayground({ path: { projectId }, throwOnError: true }).then(
      ({ data }) => alive && setStatus((s) => s ?? data),
      (err: unknown) => alive && setStatus((s) => s ?? failed(err)),
    )
    return () => {
      alive = false
    }
  }, [projectId, bearer])

  useEffect(() => {
    if (!open || !projectId || !bearer) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const serve = async () => {
      try {
        const { data } = await serveDesignPlayground({ path: { projectId }, throwOnError: true })
        if (!alive) return
        setStatus(data)
        if (data.status === 'building') timer = setTimeout(serve, DESIGN_PLAYGROUND_POLL_MS)
      } catch (err) {
        if (alive) setStatus(failed(err))
      }
    }
    void serve()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [open, projectId, bearer, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const frameUrl = useCallback(
    (address?: string, theme?: DesignPlaygroundTheme) =>
      token && projectId
        ? designPlaygroundFrameUrl(apiBaseUrl ?? '', projectId, token, address, theme)
        : undefined,
    [apiBaseUrl, projectId, token],
  )
  return { status, retry, frameUrl }
}
