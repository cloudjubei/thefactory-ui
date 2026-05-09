import { palette, type Palette } from './colors'
import { lightTheme, darkTheme, type SemanticTheme } from './semantic'
import {
  controls,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  motion,
  radii,
  shadows,
  space,
  zIndex,
} from './metrics'

// A platform-agnostic snapshot of every token the UI may consume.
// Web ingests this via generated CSS variables; a future RN target
// can ingest it via a StyleSheet adapter.
export interface UikitTheme {
  name: 'light' | 'dark'
  palette: Palette
  semantic: SemanticTheme
  metrics: {
    fontFamilies: typeof fontFamilies
    fontSizes: typeof fontSizes
    lineHeights: typeof lineHeights
    fontWeights: typeof fontWeights
    space: typeof space
    radii: typeof radii
    motion: typeof motion
    zIndex: typeof zIndex
    controls: typeof controls
    shadows: ShadowScale
  }
}

export type ShadowScale = Record<0 | 1 | 2 | 3 | 4, string>

export const lightUikitTheme: UikitTheme = {
  name: 'light',
  palette,
  semantic: lightTheme,
  metrics: {
    fontFamilies,
    fontSizes,
    lineHeights,
    fontWeights,
    space,
    radii,
    motion,
    zIndex,
    controls,
    shadows: shadows.light,
  },
}

export const darkUikitTheme: UikitTheme = {
  name: 'dark',
  palette,
  semantic: darkTheme,
  metrics: {
    fontFamilies,
    fontSizes,
    lineHeights,
    fontWeights,
    space,
    radii,
    motion,
    zIndex,
    controls,
    shadows: shadows.dark,
  },
}
