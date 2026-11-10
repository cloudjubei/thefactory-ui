import { Text, View } from 'react-native'

import {
  FAKE_DATA_IN_PRODUCT_COPY,
  FAKE_DATA_IN_PRODUCT_OPTIONS,
  fakeDataInProductLine,
  type FakeDataInProduct,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import SegmentedControl from '../../primitives/SegmentedControl'

export type LaunchFakeDataChoiceProps = {
  value: FakeDataInProduct
  onChange: (value: FakeDataInProduct) => void
  busy?: boolean
}

/** Native peer of the web `LaunchFakeDataChoice`. */
export default function LaunchFakeDataChoice({
  value,
  onChange,
  busy = false,
}: LaunchFakeDataChoiceProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{ gap: 6, opacity: busy ? 0.5 : 1 }}
      pointerEvents={busy ? 'none' : 'auto'}
      testID="launch-fake-data-choice"
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {FAKE_DATA_IN_PRODUCT_COPY.title}
      </Text>
      <SegmentedControl
        size="sm"
        ariaLabel={FAKE_DATA_IN_PRODUCT_COPY.title}
        testID="launch-fake-data"
        value={value}
        onChange={(next) => onChange(next as FakeDataInProduct)}
        options={FAKE_DATA_IN_PRODUCT_OPTIONS.map(({ value: v, label }) => ({ value: v, label }))}
      />
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
        {fakeDataInProductLine(value)}
      </Text>
    </View>
  )
}
