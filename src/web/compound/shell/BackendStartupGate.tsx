import type { ReactNode } from 'react'
import { describeBackendStartup, useApi, useAuth } from '../../../headless'
import { TestsProgressBar } from '../tests/TestsProgressBar'
import LoadingScreen from './LoadingScreen'

/**
 * Holds everything below it behind "Loading…" until the backend is ready (it refuses every call
 * while its initial search-index pass runs, and builds its knowledge maps alongside), showing each
 * pass's progress. Mount it above the data providers so none of them fetches early. Signed-out
 * screens pass straight through.
 */
export default function BackendStartupGate({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const { backendReady, backendStartup } = useApi()
  if (!token || backendReady) return <>{children}</>
  return (
    <LoadingScreen label="Loading…">
      {backendStartup &&
        describeBackendStartup(backendStartup).map((line) => (
          <TestsProgressBar
            key={line.label}
            label={line.label}
            completed={line.completed}
            total={line.total}
            currentFile={line.detail}
          />
        ))}
    </LoadingScreen>
  )
}
