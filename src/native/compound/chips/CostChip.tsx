import { Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import { nativeLightTheme, nativePalette, nativeSpace } from '../../../tokens/native'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface CostChipProps {
  provider: string
  model: string
  price?: {
    inputPerMTokensUSD: number
    outputPerMTokensUSD: number
  }
  costUSD?: number
}

function formatUSD(n?: number): string {
  if (n == null) return '—'
  return `$${n.toFixed(4)}`
}

export default function CostChip({ provider, model, price, costUSD }: CostChipProps) {
  const tooltipBody = (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: nativeLightTheme.text.primary }}>
        {(provider || 'Unknown') + ' · ' + (model || 'Unknown')}
      </Text>
      {price ? (
        <View style={{ marginTop: nativeSpace[2], gap: 2 }}>
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>
            Input: ${price.inputPerMTokensUSD} per 1M tokens
          </Text>
          <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>
            Output: ${price.outputPerMTokensUSD} per 1M tokens
          </Text>
        </View>
      ) : (
        <Text
          style={{
            marginTop: nativeSpace[2],
            fontSize: 12,
            color: nativeLightTheme.text.muted,
          }}
        >
          Pricing unavailable
        </Text>
      )}
    </View>
  )

  return (
    <Tooltip content={tooltipBody}>
      <View style={chipPillStyle}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: nativePalette.green[500],
          }}
        />
        <Text style={chipPillTextStyle}>{formatUSD(costUSD)}</Text>
      </View>
    </Tooltip>
  )
}
