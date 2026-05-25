import type { TextStyle, ViewStyle } from 'react-native'
import { nativeRadii, nativeSpace, type NativeSemanticTheme } from '../../../tokens/native'

// Shared visual chrome for the chip family (BranchChip, ProjectChip, StatusChip,
// CostChip, TokensChip, TurnChip). Mirrors the web's `chip-pill chip-pill--sm
// chip-pill--neutral` CSS recipe with RN-friendly style objects.
//
// Theme-dependent surfaces / borders / text colours are produced by these
// factories so the consumer (a React component) can route them through
// `useNativeTheme` and re-render on theme change.

export function chipPillStyle(theme: NativeSemanticTheme): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nativeSpace[3],
    paddingHorizontal: nativeSpace[5],
    paddingVertical: nativeSpace[2],
    borderRadius: nativeRadii.round,
    backgroundColor: theme.surface.muted,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  }
}

export function chipPillTextStyle(theme: NativeSemanticTheme): TextStyle {
  return {
    fontSize: 11,
    fontWeight: '500',
    color: theme.text.secondary,
  }
}
