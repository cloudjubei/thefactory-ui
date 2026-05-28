import DependencyBullet from './DependencyBullet'
import StoryAndFeatureCalloutBase from './StoryAndFeatureCalloutBase'

export type StoryAndFeatureCalloutProps = {
  storyId?: string
  featureId?: string
}

/**
 * Story (+ optional feature) dependency callout — the connected variant
 * that renders the routed `DependencyBullet` for each dep. Layout comes
 * from `StoryAndFeatureCalloutBase`; resolution + navigation from
 * `DependencyBullet`.
 */
export default function StoryAndFeatureCallout({
  storyId,
  featureId,
}: StoryAndFeatureCalloutProps) {
  return (
    <StoryAndFeatureCalloutBase
      storyId={storyId}
      featureId={featureId}
      renderBullet={(dep) => (
        <DependencyBullet dependency={dep} interactive notFoundDependencyDisplay="*DELETED*" />
      )}
    />
  )
}
