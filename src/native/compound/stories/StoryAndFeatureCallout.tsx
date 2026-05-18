import type { ReactNode } from 'react'
import { View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'

export interface StoryAndFeatureCalloutProps {
  storyId?: string
  featureId?: string
  /** Host-supplied renderer for a dependency bullet — receives the raw token
   * (`storyUuid` or `storyUuid.featureUuid`). */
  renderBullet: (dep: string) => ReactNode
}

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
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: nativeSpace[2],
        minWidth: 60,
        minHeight: 30,
      }}
    >
      {deps.map((d) => (
        <View key={d}>{renderBullet(d)}</View>
      ))}
    </View>
  )
}
