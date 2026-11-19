import { Text, View } from 'react-native'
import { useRecommendProgress } from '../../../../headless/hooks/useRecommendProgress'
import { catalogItemName } from '../../../../headless/hooks/recommendProgress'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export default function RecommendProgressPreview(props: {
  activityId: string
  projectId?: string
  recordType?: string
}) {
  const { state, status, error } = useRecommendProgress(props)
  const { theme } = useNativeTheme()
  const text = { color: theme.text.primary, fontSize: 12 }
  return (
    <View
      accessibilityLabel="Recommendation progress"
      accessibilityLiveRegion="polite"
      style={{ gap: 8 }}
    >
      <Text style={text}>{status}</Text>
      <Text style={text}>Partial catalog results — not final rankings.</Text>
      {error ? <Text style={text}>{error}</Text> : null}
      {Object.entries(state.steps).map(([key, { progress, items }]) => (
        <View key={key} style={{ gap: 8 }}>
          <Text style={text}>
            {key}: {progress.suppliersDone}/{progress.suppliersTotal} researched ·{' '}
            {progress.itemsSoFar} items found
          </Text>
          {Object.entries(progress.supplierStates).map(([category, value]) => (
            <Text key={category} style={text}>
              {category}: {value}
            </Text>
          ))}
          {progress.categoryResult ? (
            <Text style={text}>
              {progress.categoryResult.categoryPath.join(' / ')}:{' '}
              {progress.categoryResult.status === 'deadline'
                ? 'Deadline reached — partial results'
                : progress.categoryResult.status}
            </Text>
          ) : null}
          {items.map((item) => (
            <View key={item.key}>
              <Text style={text}>{catalogItemName(item)}</Text>
              <Text style={text}>{item.summary}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
