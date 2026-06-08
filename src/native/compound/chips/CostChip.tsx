import { Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import { nativePalette, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface CostChipProps {
  provider: string
  model: string
  price?: {
    inputPerMTokensUSD: number
    outputPerMTokensUSD: number
  }
  costUSD?: number
  /** Executor that produced this cost — renders a small API/CLI pill when set. */
  source?: 'api' | 'cli'
}

function formatUSD(n?: number): string {
  if (n == null) return '—'
  return `$${n.toFixed(4)}`
}

export default function CostChip({ provider, model, price, costUSD, source }: CostChipProps) {
  const { theme } = useNativeTheme()
  const tooltipBody = (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
        {(provider || 'Unknown') + ' · ' + (model || 'Unknown')}
      </Text>
      {price ? (
        <View style={{ marginTop: nativeSpace[2], gap: 2 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Input: ${price.inputPerMTokensUSD} per 1M tokens
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Output: ${price.outputPerMTokensUSD} per 1M tokens
          </Text>
        </View>
      ) : (
        <Text
          style={{
            marginTop: nativeSpace[2],
            fontSize: 12,
            color: theme.text.muted,
          }}
        >
          Pricing unavailable
        </Text>
      )}
    </View>
  )

  return (
    <Tooltip content={tooltipBody}>
      <View style={chipPillStyle(theme)}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: nativePalette.green[500],
          }}
        />
        <Text style={chipPillTextStyle(theme)}>{formatUSD(costUSD)}</Text>
        {source ? (
          <Text
            style={{
              fontSize: 9,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: source === 'cli' ? nativePalette.purple[500] : theme.text.muted,
            }}
          >
            {source}
          </Text>
        ) : null}
      </View>
    </Tooltip>
  )
}
