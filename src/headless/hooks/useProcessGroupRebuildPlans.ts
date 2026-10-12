import { useEffect, useState } from 'react'
import type { ProcessGroupRebuildPlan } from 'thefactory-tools/types'

/**
 * The rebuild plans of a group run's legs, read from the server whenever the
 * set of legs changes — by leg id; a leg whose plan could not be read is left
 * out, so its text says it is rebuilt only if needed.
 */
export function useProcessGroupRebuildPlans(
  legIds: readonly string[],
  planRebuild: (legId: string) => Promise<ProcessGroupRebuildPlan | undefined>,
): Record<string, ProcessGroupRebuildPlan> {
  const [plans, setPlans] = useState<Record<string, ProcessGroupRebuildPlan>>({})
  const key = legIds.join('\n')

  useEffect(() => {
    let current = true
    const ids = key ? key.split('\n') : []
    setPlans({})
    void Promise.all(ids.map(async (id) => [id, await planRebuild(id)] as const)).then((read) => {
      if (!current) return
      setPlans(
        Object.fromEntries(
          read.filter((entry): entry is readonly [string, ProcessGroupRebuildPlan] => !!entry[1]),
        ),
      )
    })
    return () => {
      current = false
    }
  }, [key, planRebuild])

  return plans
}
