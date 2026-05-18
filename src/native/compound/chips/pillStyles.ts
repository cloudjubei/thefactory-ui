import type { TextStyle, ViewStyle } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

// Shared visual chrome for the chip family (BranchChip, ProjectChip, StatusChip,
// CostChip, TokensChip, TurnChip). Mirrors the web's `chip-pill chip-pill--sm
// chip-pill--neutral` CSS recipe with RN-friendly style objects.

export const chipPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: nativeSpace[3],
  paddingHorizontal: nativeSpace[5],
  paddingVertical: nativeSpace[2],
  borderRadius: nativeRadii.round,
  backgroundColor: nativeLightTheme.surface.muted,
  borderWidth: 1,
  borderColor: nativeLightTheme.border.subtle,
}

export const chipPillTextStyle: TextStyle = {
  fontSize: 11,
  fontWeight: '500',
  color: nativeLightTheme.text.secondary,
}
