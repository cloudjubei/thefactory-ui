import { type ReactNode } from 'react'

export type StoryAndFeatureCalloutBaseProps = {
  storyId?: string
  featureId?: string
  /** Renderer for a single dependency bullet — host wires this against
   * its DependencyBullet/Chip. Receives the raw dependency string
   * (`storyUuid` or `storyUuid.featureUuid`). */
  renderBullet: (dep: string) => ReactNode
}

/**
 * Renders a story (+ optional feature) dependency as a pair of bullets.
 * Bullet rendering is delegated via `renderBullet` so the layout works
 * against any dependency-bullet variant; returns `null` when neither id is
 * provided so consumers can use it unconditionally.
 */
export default function StoryAndFeatureCalloutBase({
  storyId,
  featureId,
  renderBullet,
}: StoryAndFeatureCalloutBaseProps) {
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
