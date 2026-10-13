import { useCallback, useEffect, useState } from 'react'
import { listActionRules, removeActionRule, trustSite as trustSiteRequest } from '../api/generated'
import type { ActionRuleView } from '../utils/actionRulesTypes'
import { extractErrorMessage } from '../api/errorMessage'
import { TRUST_SITE_FAILED } from '../utils/actionRulesConstants'

export type UseActionRules = {
  rules: ActionRuleView[]
  loading: boolean
  /** Why the last load or removal failed, for the person to see. */
  error: string | undefined
  reload: () => Promise<void>
  /** Remove a rule; from a chat (`chatContextId` given to the hook) only that chat's own may go. */
  remove: (ruleId: string) => Promise<void>
  /** Trust a website everywhere; resolves whether it was trusted (a failure sets `error`). */
  trustSite: (site: string) => Promise<boolean>
}

/**
 * The "always allow" rules — every one, or (with `chatContextId`) only the
 * chat's own, which is all a chat's settings show and all it may remove.
 */
export function useActionRules(chatContextId?: string): UseActionRules {
  const [rules, setRules] = useState<ActionRuleView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listActionRules({
        ...(chatContextId ? { query: { chatContextId } } : {}),
        throwOnError: true,
      })
      setRules(res.data.rules)
      setError(undefined)
    } catch (err) {
      setError(extractErrorMessage(err, 'The rules could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [chatContextId])

  useEffect(() => {
    void reload()
  }, [reload])

  const remove = useCallback(
    async (ruleId: string) => {
      try {
        await removeActionRule({
          path: { ruleId },
          ...(chatContextId ? { query: { fromChatContextId: chatContextId } } : {}),
          throwOnError: true,
        })
        setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
        setError(undefined)
      } catch (err) {
        setError(extractErrorMessage(err, 'The rule could not be removed.'))
        void reload()
      }
    },
    [chatContextId, reload],
  )

  const trustSite = useCallback(async (site: string) => {
    try {
      const res = await trustSiteRequest({ body: { site }, throwOnError: true })
      setRules((prev) => [...prev.filter((rule) => rule.id !== res.data.id), res.data])
      setError(undefined)
      return true
    } catch (err) {
      setError(extractErrorMessage(err, TRUST_SITE_FAILED))
      return false
    }
  }, [])

  return { rules, loading, error, reload, remove, trustSite }
}
