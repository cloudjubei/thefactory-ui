import { useCallback, useEffect, useRef, useState } from 'react'
import { clearDbDockerSpace, getDbDockerDisk, resizeDbDockerDisk } from '../api/generated'
import { dockerDiskAfterClear, dockerDiskResizing } from '../utils/dockerDisk'
import { DOCKER_DISK_RESIZE_POLL_MS } from '../utils/dockerDiskConstants'
import type { DockerDisk } from '../utils/dockerDiskTypes'

export interface DockerDiskControls {
  disk: DockerDisk | null
  loading: boolean
  clearing: boolean
  error: string | null
  refresh: () => Promise<void>
  clear: () => Promise<void>
  resize: (sizeGb: number) => Promise<void>
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: string } }; message?: string }
    if (typeof e.response?.data?.error === 'string') return e.response.data.error
    if (typeof e.message === 'string') return e.message
  }
  return String(err)
}

export function useDockerDisk(): DockerDiskControls {
  const [disk, setDisk] = useState<DockerDisk | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const diskRef = useRef<DockerDisk | null>(null)
  const clearingRef = useRef(false)
  const mounted = useRef(true)

  const show = useCallback((next: DockerDisk | null) => {
    diskRef.current = next
    if (mounted.current) setDisk(next)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { data } = await getDbDockerDisk({ throwOnError: true })
      if (clearingRef.current) return
      show(data)
      if (mounted.current) setError(null)
    } catch (err) {
      if (mounted.current && !diskRef.current?.resizing) setError(errorMessage(err))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [show])

  const clear = useCallback(async () => {
    const before = diskRef.current
    if (!before || clearingRef.current) return
    clearingRef.current = true
    setClearing(true)
    setError(null)
    show(dockerDiskAfterClear(before))
    try {
      const { data } = await clearDbDockerSpace({ throwOnError: true })
      if (data.disk) show(data.disk)
    } catch (err) {
      show(before)
      if (mounted.current) setError(errorMessage(err))
    } finally {
      clearingRef.current = false
      if (mounted.current) setClearing(false)
    }
  }, [show])

  const resize = useCallback(
    async (sizeGb: number) => {
      const before = diskRef.current
      if (!before || before.resizing) return
      setError(null)
      show(dockerDiskResizing(before))
      try {
        const { data } = await resizeDbDockerDisk({ body: { sizeGb }, throwOnError: true })
        if (data.disk) show(data.disk)
      } catch (err) {
        show(before)
        if (mounted.current) setError(errorMessage(err))
      }
    },
    [show],
  )

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => {
      mounted.current = false
    }
  }, [refresh])

  const resizing = disk?.resizing === true
  useEffect(() => {
    if (!resizing) return
    const timer = setInterval(() => void refresh(), DOCKER_DISK_RESIZE_POLL_MS)
    return () => clearInterval(timer)
  }, [resizing, refresh])

  return { disk, loading, clearing, error, refresh, clear, resize }
}
