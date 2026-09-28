import { useEffect, useMemo, useState } from 'react'

import {
  currentUsageRows,
  ledgerUsageRows,
  sourceUsageRows,
  unavailableLedgerRows,
  usagePriceKeys,
} from '../utils/usageBreakdown'
import type {
  UsageBreakdown,
  UsageModalCostAggregate,
  UsageModalMessage,
  UsageModalModelPrice,
} from '../utils/usageBreakdownTypes'

export type UseUsageBreakdownInput = {
  isOpen: boolean
  messages: readonly UsageModalMessage[]
  /** The durable ledger's scope; without one the modal shows the messages on screen only. */
  chatKey?: string
  getPrice: (provider: string, model: string) => Promise<UsageModalModelPrice | undefined>
  getCost?: (chatKey: string) => Promise<UsageModalCostAggregate | undefined>
}

/**
 * Everything the usage modal shows, loaded and worded — shared by the web and
 * native modals so a ledger read, a price estimate or a column cannot exist on
 * one client and not the other.
 */
export function useUsageBreakdown({
  isOpen,
  messages,
  chatKey,
  getPrice,
  getCost,
}: UseUsageBreakdownInput): UsageBreakdown {
  const [durable, setDurable] = useState<UsageModalCostAggregate | undefined>(undefined)
  const [prices, setPrices] = useState<Record<string, UsageModalModelPrice | undefined>>({})

  useEffect(() => {
    let cancelled = false
    if (!isOpen) return
    if (!chatKey || !getCost) {
      setDurable(undefined)
      return
    }
    getCost(chatKey)
      .then((agg) => {
        if (!cancelled) setDurable(agg)
      })
      .catch(() => {
        if (!cancelled) setDurable(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [chatKey, isOpen, getCost])

  useEffect(() => {
    let cancelled = false
    if (!isOpen) return
    const keys = usagePriceKeys(messages)
    void Promise.all(
      keys.map(async ({ key, provider, model }) => {
        try {
          return [key, await getPrice(provider, model)] as const
        } catch {
          return [key, undefined] as const
        }
      }),
    ).then((pairs) => {
      if (!cancelled) setPrices(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, messages, getPrice])

  return useMemo(() => {
    const current = currentUsageRows(messages, prices)
    return {
      ...(chatKey ? { ledger: durable ? ledgerUsageRows(durable) : unavailableLedgerRows() } : {}),
      ...(durable ? { sources: sourceUsageRows(durable) } : {}),
      ...(current.length > 0 ? { current } : {}),
    }
  }, [chatKey, durable, messages, prices])
}
