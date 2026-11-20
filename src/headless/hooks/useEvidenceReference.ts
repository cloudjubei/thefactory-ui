import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

import { useApi } from '../api/ApiContext'
import { errorStatus } from '../api/errorMessage'
import { resolveReviewEvidence, type ResolvedReviewEvidence } from '../api/generated'
import { evidenceIssueDetail, evidenceReferenceView } from '../utils/evidenceReference'
import {
  EVIDENCE_REFERENCE_CAPACITY,
  EVIDENCE_REFERENCE_RENEW_BEFORE_MS,
} from '../utils/evidenceReferenceConstants'
import type {
  EvidenceLink,
  EvidenceReferenceState,
  EvidenceReferenceView,
} from '../utils/evidenceReferenceTypes'
import { EvidenceReferenceStore } from './evidenceReferenceStore'
import { useReviewEvidence } from './useReviewEvidence'

async function resolveEvidence(link: EvidenceLink): Promise<ResolvedReviewEvidence | undefined> {
  try {
    const { data } = await resolveReviewEvidence({
      query: {
        projectId: link.projectId,
        evidenceId: link.evidenceId,
        ...(link.at !== undefined ? { at: link.at } : {}),
      },
      throwOnError: true,
    })
    return data
  } catch (err) {
    if (errorStatus(err) === 404) return undefined
    throw err
  }
}

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, EvidenceReferenceStore>()

function evidenceStoreFor(ws: WsLike): EvidenceReferenceStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new EvidenceReferenceStore(resolveEvidence, {
    capacity: EVIDENCE_REFERENCE_CAPACITY,
    renewBeforeMs: EVIDENCE_REFERENCE_RENEW_BEFORE_MS,
    now: () => Date.now(),
  })
  stores.set(ws, store)
  return store
}

const IDLE: EvidenceReferenceState = { status: 'loading' }
const unlistened = () => () => {}

export type UseEvidenceReference = {
  state: EvidenceReferenceState
  view: EvidenceReferenceView | undefined
}

/**
 * One cited evidence item, read once for every chip and view citing it, as
 * its chip shows it ({@link evidenceReferenceView}). `withIssue` reads what an
 * issue says happened from its run's filings — only where it is shown, such
 * as an open preview.
 */
export function useEvidenceReference(
  link: EvidenceLink | undefined,
  { withIssue = false }: { withIssue?: boolean } = {},
): UseEvidenceReference {
  const { ws, apiBaseUrl } = useApi()
  const store = evidenceStoreFor(ws)
  const projectId = link?.projectId
  const evidenceId = link?.evidenceId
  const at = link?.at
  const stable = useMemo<EvidenceLink | undefined>(
    () =>
      projectId && evidenceId
        ? { kind: 'evidence', projectId, evidenceId, ...(at !== undefined ? { at } : {}) }
        : undefined,
    [projectId, evidenceId, at],
  )
  useEffect(() => {
    if (stable) void store.read(stable)
  }, [store, stable])
  const listen = useCallback(
    (onChange: () => void) => (stable ? store.listen(stable, onChange) : unlistened()),
    [store, stable],
  )
  const read = useCallback(() => (stable ? store.snapshot(stable) : IDLE), [store, stable])
  const state = useSyncExternalStore(listen, read, read)
  const issueRun =
    withIssue && state.status === 'ready' && state.item.severity ? state.item.runId : undefined
  const filings = useReviewEvidence(issueRun ? projectId : undefined, { runId: issueRun })
  const refs = filings.refs
  const issue = useMemo(
    () => (issueRun && evidenceId ? evidenceIssueDetail(refs, evidenceId) : undefined),
    [issueRun, evidenceId, refs],
  )
  const view = useMemo(
    () =>
      stable
        ? evidenceReferenceView({
            link: stable,
            state,
            ...(issue ? { issue } : {}),
            ...(apiBaseUrl ? { apiBaseUrl } : {}),
          })
        : undefined,
    [stable, state, issue, apiBaseUrl],
  )
  return { state, view }
}
