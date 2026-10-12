import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import type {
  AlwaysAllowScope,
  ChatMessageLike,
  GrantCovers,
  PendingToolGrant,
} from '../utils/chatTypes'
import { claimedAskIds, inlineApprovalDecisions, inlineApprovalVia } from '../utils/inlineApprovals'

/** The per-row props a tool row needs to be decided in place. */
export type InlineApprovalRowProps = {
  toolSelectable?: boolean
  toolSelected?: boolean
  onToggleToolSelect?: () => void
  /** Where "Always allow" is on offer for this row, the default first. */
  toolAlwaysAllowScopes?: readonly AlwaysAllowScope[]
  /** What an always-allow of this row covers. */
  toolGrantCovers?: GrantCovers
  /** Marked "Always allow" in this place: Resume grants it there. */
  toolAlwaysAllowScope?: AlwaysAllowScope
  /** Mark the row "Always allow" in `scope`, or (`undefined`) unmark it. */
  onAlwaysAllowTool?: (scope: AlwaysAllowScope | undefined) => void
}

/**
 * A turn reporting the asks its rows show — and whether those rows have loaded
 * (`settled`), until when the panel holds the turn's asks back.
 */
export type ClaimAsks = (runId: string, askIds: string[], settled?: boolean) => void

export type UseInlineApprovals = {
  /** The asks this turn's rows show, in row order. */
  askIds: string[]
  selectedCount: number
  allSelected: boolean
  toggleAll: (checked: boolean) => void
  /** Approve the toggled asks, decline the rest. */
  resume: () => Promise<void>
  resuming: boolean
  /** Props for one message's row; nothing for a row not tied to an ask. */
  rowProps: (message: ChatMessageLike) => InlineApprovalRowProps
}

/**
 * Deciding a turn's tool asks on their own rows — an API turn's stored rows and
 * a CLI turn's transcript rows alike: a toggle per row, "Always allow" where
 * the ask permits a standing grant (marks the row; Resume grants it
 * permanently), and one Resume that approves the toggled asks and declines the
 * rest.
 *
 * Reports the asks it shows through `onClaimAsks` (and `[]` when it unmounts)
 * so the approval panel leaves them out — and, while its rows are not loaded
 * (`settled` false), that the turn is on its way, so the panel waits for them.
 * Reported before paint, so no ask flashes up on the panel first. The host
 * carries the decisions back to the agent together once the turn's last ask is
 * decided.
 */
export function useInlineApprovals(
  runId: string,
  messages: readonly ChatMessageLike[],
  cliAsks: readonly PendingToolGrant[] | undefined,
  onClaimAsks: ClaimAsks | undefined,
  settled = true,
): UseInlineApprovals {
  const askIds = useMemo(() => claimedAskIds(messages), [messages])
  const askKey = askIds.join('|')
  useLayoutEffect(() => {
    onClaimAsks?.(runId, askIds, settled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, askKey, settled])
  useLayoutEffect(() => () => onClaimAsks?.(runId, [], true), [runId, onClaimAsks])

  const grants = useMemo(() => new Map((cliAsks ?? []).map((g) => [g.id, g])), [cliAsks])
  const [selected, setSelected] = useState<string[]>([])
  const [always, setAlways] = useState<Record<string, AlwaysAllowScope>>({})
  const [resuming, setResuming] = useState(false)

  const selectedCount = askIds.filter((id) => selected.includes(id)).length
  const allSelected = askIds.length > 0 && selectedCount === askIds.length
  const toggleAll = useCallback(
    (checked: boolean) => setSelected(checked ? [...askIds] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [askKey],
  )
  const resume = useCallback(async () => {
    setResuming(true)
    try {
      const via = inlineApprovalVia(askIds)
      for (const { id, decision } of inlineApprovalDecisions(askIds, selected, always)) {
        // A decision refused because the ask changed under the user (expired,
        // decided elsewhere) re-reads the grant feed itself; the rest go on.
        await grants
          .get(id)
          ?.decide(decision, undefined, via)
          .catch(() => {})
      }
    } finally {
      setResuming(false)
      setSelected([])
      setAlways({})
    }
  }, [askIds, selected, always, grants])

  const rowProps = useCallback(
    (message: ChatMessageLike): InlineApprovalRowProps => {
      const id = message.role === 'tool' ? message.toolCall?.approvalId : undefined
      if (id === undefined) return {}
      const grant = grants.get(id)
      return {
        toolSelectable: true,
        toolSelected: selected.includes(id),
        onToggleToolSelect: () =>
          setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
        ...(grant?.alwaysAllowScopes && grant.alwaysAllowScopes.length > 0
          ? {
              toolAlwaysAllowScopes: grant.alwaysAllowScopes,
              ...(grant.grantCovers ? { toolGrantCovers: grant.grantCovers } : {}),
              ...(always[id] ? { toolAlwaysAllowScope: always[id] } : {}),
              onAlwaysAllowTool: (scope: AlwaysAllowScope | undefined) => {
                setAlways((prev) => {
                  const { [id]: _dropped, ...rest } = prev
                  return scope ? { ...rest, [id]: scope } : rest
                })
                if (scope) setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]))
              },
            }
          : {}),
      }
    },
    [grants, selected, always],
  )

  return { askIds, selectedCount, allSelected, toggleAll, resume, resuming, rowProps }
}

/**
 * Which asks the chat's CLI turns show on their rows, collected from each turn's
 * `onClaimAsks` report — what the approval panel leaves out. A turn reporting
 * `[]` (or unmounting) gives its asks back to the panel.
 */
export function useClaimedAsks(): {
  claimedAskIds: ReadonlySet<string>
  /** The turns on screen whose rows have not loaded yet. */
  unsettledRunIds: ReadonlySet<string>
  onClaimAsks: ClaimAsks
} {
  const [claimedByRun, setClaimedByRun] = useState<
    Record<string, { askIds: string[]; settled: boolean }>
  >({})
  const onClaimAsks = useCallback<ClaimAsks>((runId, askIds, settled = true) => {
    setClaimedByRun((prev) => {
      const had = prev[runId]
      const same =
        (had?.settled ?? true) === settled &&
        (had?.askIds ?? []).length === askIds.length &&
        (had?.askIds ?? []).every((id, i) => id === askIds[i])
      if (same) return prev
      const next = { ...prev }
      if (askIds.length === 0 && settled) delete next[runId]
      else next[runId] = { askIds, settled }
      return next
    })
  }, [])
  const claimedAskIds = useMemo(
    () => new Set(Object.values(claimedByRun).flatMap((c) => c.askIds)),
    [claimedByRun],
  )
  const unsettledRunIds = useMemo(
    () =>
      new Set(
        Object.entries(claimedByRun)
          .filter(([, c]) => !c.settled)
          .map(([runId]) => runId),
      ),
    [claimedByRun],
  )
  return { claimedAskIds, unsettledRunIds, onClaimAsks }
}
