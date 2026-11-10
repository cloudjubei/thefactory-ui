import { Text, View } from 'react-native'

import {
  FAKE_DATA_IN_PRODUCT_COPY,
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  fakeDataInProductLine,
  readProcessFakeDataInProduct,
  withProcessFakeDataInProduct,
  type FakeDataInProduct,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import SegmentedControl from '../../primitives/SegmentedControl'

export type ProjectFakeDataInProductFieldProps = {
  /** The project's metadata. */
  metadata: Record<string, unknown>
  /** The metadata with the choice as edited. */
  onChange: (metadata: Record<string, unknown>) => void
  busy?: boolean
}

/** Native peer of the web `ProjectFakeDataInProductField`. */
export default function ProjectFakeDataInProductField({
  metadata,
  onChange,
  busy = false,
}: ProjectFakeDataInProductFieldProps) {
  const { theme } = useNativeTheme()
  const value = readProcessFakeDataInProduct(metadata.processFakeDataInProduct)
  return (
    <View
      style={{ gap: nativeSpace[2], opacity: busy ? 0.5 : 1 }}
      pointerEvents={busy ? 'none' : 'auto'}
    >
      <View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {FAKE_DATA_IN_PRODUCT_COPY.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {FAKE_DATA_IN_PRODUCT_COPY.projectHint}
        </Text>
      </View>
      <SegmentedControl
        size="sm"
        ariaLabel={FAKE_DATA_IN_PRODUCT_COPY.title}
        testID="project-fake-data"
        value={value}
        onChange={(next) =>
          onChange(withProcessFakeDataInProduct(metadata, next as FakeDataInProduct))
        }
        options={FAKE_DATA_IN_PRODUCT_OPTIONS.map(({ value: v, label }) => ({ value: v, label }))}
      />
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {fakeDataInProductLine(value)}
      </Text>
    </View>
  )
}
