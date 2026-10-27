import { useCallback, useEffect, useRef, useState } from 'react'
import type { DesignPlaygroundTheme } from '../api'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { getDesignPlayground, serveDesignPlayground } from '../api/generated'
import { designPlaygroundFrameUrl, designPlaygroundPollMs } from '../utils/designPlayground'
import type { DesignPlaygroundStatus } from './designStoreTypes'
import { useDesignViewToken } from './useDesignViewToken'

export type UseDesignPlayground = {
  /** `undefined` until read; a read that fails reads as `failed`. */
  status: DesignPlaygroundStatus | undefined
  /** Build and serve it again — after a failure, or to show the checkout as it is now. */
  retry: () => void
  /** The frame's address at `address` in `theme`; `undefined` until the view token is minted. */
  frameUrl: (address?: string, theme?: DesignPlaygroundTheme) => string | undefined
  /** Watch the build closely while `save` runs — a save builds the checkout first. */
  whileSaving: <T>(save: Promise<T>) => Promise<T>
}

function failed(err: unknown): DesignPlaygroundStatus {
  return { status: 'failed', error: err instanceof Error ? err.message : String(err) }
}

/**
 * A project's design playground for the Design view: whether there is one,
 * read without starting it — and, while `open`, served from the checkout as
 * it stands, then asked again: soon while a build runs or a save waits on
 * one, now and then while ready, so a newer build is seen and framed.
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
  const [saves, setSaves] = useState(0)
  const saving = useRef(false)
  const askNow = useRef<(() => void) | undefined>(undefined)

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
    let last: DesignPlaygroundStatus | undefined
    const schedule = () => {
      clearTimeout(timer)
      const ms = last ? designPlaygroundPollMs(last, saving.current) : undefined
      if (ms !== undefined) timer = setTimeout(() => void ask(), ms)
    }
    const take = (data: DesignPlaygroundStatus) => {
      last = data
      setStatus(data)
      schedule()
    }
    const ask = async () => {
      try {
        const { data } = await getDesignPlayground({ path: { projectId }, throwOnError: true })
        if (alive) take(data)
      } catch {
        if (alive) schedule()
      }
    }
    askNow.current = () => {
      if (!last) return
      clearTimeout(timer)
      void ask()
    }
    void (async () => {
      try {
        const { data } = await serveDesignPlayground({ path: { projectId }, throwOnError: true })
        if (alive) take(data)
      } catch (err) {
        if (alive) setStatus(failed(err))
      }
    })()
    return () => {
      alive = false
      clearTimeout(timer)
      askNow.current = undefined
    }
  }, [open, projectId, bearer, attempt])

  useEffect(() => {
    saving.current = saves > 0
    if (saves > 0) askNow.current?.()
  }, [saves])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const whileSaving = useCallback(async <T>(save: Promise<T>): Promise<T> => {
    setSaves((n) => n + 1)
    try {
      return await save
    } finally {
      setSaves((n) => n - 1)
      askNow.current?.()
    }
  }, [])
  const frameUrl = useCallback(
    (address?: string, theme?: DesignPlaygroundTheme) =>
      token && projectId
        ? designPlaygroundFrameUrl(apiBaseUrl ?? '', projectId, token, address, theme)
        : undefined,
    [apiBaseUrl, projectId, token],
  )
  return { status, retry, frameUrl, whileSaving }
}
