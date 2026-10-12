import { useCallback, useMemo, useState } from 'react'
import type {
  ProcessGroupLegLandingCheck,
  ProcessGroupLegLandingClaim,
} from 'thefactory-tools/types'
import { processGroupLandingCheckView } from '../utils/processGroupView'
import type { ProcessGroupLandingCheckView } from '../utils/processGroupViewTypes'

export type UseProcessGroupLegLanding = {
  /** The commit the person names — empty leaves it to the server to find. */
  commit: string
  setCommit: (commit: string) => void
  note: string
  setNote: (note: string) => void
  /** The last check, as a person reads it — gone once the commit is changed. */
  checkView: ProcessGroupLandingCheckView | undefined
  checking: boolean
  marking: boolean
  runCheck: () => Promise<void>
  /** The last check proved it landed — marking records exactly the commit it found. */
  canMark: boolean
  /** Record it; resolves `true` once the server took it. */
  mark: () => Promise<boolean>
}

/**
 * Marking one leg's work as landed on its base branch outside its run: check
 * first — the server finds the commit when none is named — and record only
 * the commit that check proved.
 */
export function useProcessGroupLegLanding(
  legId: string,
  checkLanding: (
    legId: string,
    claim: ProcessGroupLegLandingClaim,
  ) => Promise<ProcessGroupLegLandingCheck | undefined>,
  markLanded: (legId: string, claim: ProcessGroupLegLandingClaim) => Promise<boolean>,
): UseProcessGroupLegLanding {
  const [commit, setCommitText] = useState('')
  const [note, setNote] = useState('')
  const [check, setCheck] = useState<ProcessGroupLegLandingCheck | undefined>(undefined)
  const [checking, setChecking] = useState(false)
  const [marking, setMarking] = useState(false)

  const setCommit = useCallback((next: string) => {
    setCommitText(next)
    setCheck(undefined)
  }, [])

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      const named = commit.trim()
      setCheck(await checkLanding(legId, named ? { commit: named } : {}))
    } finally {
      setChecking(false)
    }
  }, [checkLanding, legId, commit])

  const landedCommit = check?.landing?.commit
  const mark = useCallback(async () => {
    if (!landedCommit) return false
    setMarking(true)
    try {
      const said = note.trim()
      return await markLanded(legId, { commit: landedCommit, ...(said ? { note: said } : {}) })
    } finally {
      setMarking(false)
    }
  }, [markLanded, legId, landedCommit, note])

  const checkView = useMemo(
    () => (check ? processGroupLandingCheckView(check) : undefined),
    [check],
  )

  return {
    commit,
    setCommit,
    note,
    setNote,
    checkView,
    checking,
    marking,
    runCheck,
    canMark: !!landedCommit && !marking,
    mark,
  }
}
