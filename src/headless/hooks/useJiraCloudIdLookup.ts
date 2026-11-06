import { useEffect, useRef, useState } from 'react'

import { findJiraCloudId } from '../api/jiraCloudIdApi'
import type { JiraCloudIdFinder, JiraCloudIdStatus } from '../utils/providerConnectionFormTypes'

/** Long enough that a site being typed is not asked after at every letter. */
const SETTLE_MS = 400

/**
 * Find a site's cloud id for a form while `site` names one to ask: the id goes
 * to `onFound`, and a form asking no more leaves `found` standing for its hint.
 */
export function useJiraCloudIdLookup(
  site: string | undefined,
  onFound: (cloudId: string) => void,
  find: JiraCloudIdFinder = findJiraCloudId,
): JiraCloudIdStatus {
  const [status, setStatus] = useState<JiraCloudIdStatus>('idle')
  const found = useRef(onFound)
  found.current = onFound

  useEffect(() => {
    if (!site) return
    let current = true
    setStatus('finding')
    const timer = setTimeout(() => {
      find(site).then(
        (cloudId) => {
          if (!current) return
          setStatus('found')
          found.current(cloudId)
        },
        () => {
          if (current) setStatus('failed')
        },
      )
    }, SETTLE_MS)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [site, find])

  return status
}
