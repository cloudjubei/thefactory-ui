import { type ReactNode } from 'react'

export type StoryAndFeatureCalloutProps = {
  storyId?: string
  featureId?: string
  /** Renderer for a single dependency bullet — host wires this against
   * its DependencyBullet/Chip. Receives the raw dependency string
   * (`storyUuid` or `storyUuid.featureUuid`). */
  renderBullet: (dep: string) => ReactNode
}

/**
 * Small wrapper that lays out a story + optional feature dependency as a
 * pair of bullets. The actual bullet rendering is host-supplied so the
 * callout works against either app's `DependencyBullet`.
 *
 * Returns `null` when neither id is provided so consumers can use it
 * unconditionally.
 */
export default function StoryAndFeatureCallout({
  storyId,
  featureId,
  renderBullet,
}: StoryAndFeatureCalloutProps) {
  const deps: string[] = []
  if (storyId) deps.push(storyId)
  if (storyId && featureId) deps.push(`${storyId}.${featureId}`)
  if (deps.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-1 min-w-[60px] min-h-[30px]">
      {deps.map((d) => (
        <span key={d}>{renderBullet(d)}</span>
      ))}
    </div>
  )
}
