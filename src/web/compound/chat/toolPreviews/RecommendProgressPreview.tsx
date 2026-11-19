import { useRecommendProgress } from '../../../../headless/hooks/useRecommendProgress'
import { catalogItemName } from '../../../../headless/hooks/recommendProgress'

export default function RecommendProgressPreview(props: {
  activityId: string
  projectId?: string
  recordType?: string
}) {
  const { state, status, error } = useRecommendProgress(props)
  return (
    <section className="text-xs space-y-2" aria-label="Recommendation progress" aria-live="polite">
      <div className="font-medium">{status}</div>
      <p className="text-[var(--text-secondary)]">Partial catalog results — not final rankings.</p>
      {error ? <p role="status">{error}</p> : null}
      {Object.entries(state.steps).map(([key, { progress, items }]) => (
        <div key={key} className="space-y-2">
          <div>
            {key}: {progress.suppliersDone}/{progress.suppliersTotal} researched ·{' '}
            {progress.itemsSoFar} items found
          </div>
          {Object.entries(progress.supplierStates).map(([category, value]) => (
            <div key={category}>
              {category}: {value}
            </div>
          ))}
          {progress.categoryResult ? (
            <div>
              {progress.categoryResult.categoryPath.join(' / ')}:{' '}
              {progress.categoryResult.status === 'deadline'
                ? 'Deadline reached — partial results'
                : progress.categoryResult.status}
            </div>
          ) : null}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.key}>
                <div className="font-medium">{catalogItemName(item)}</div>
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
