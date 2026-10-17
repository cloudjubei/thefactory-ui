import { describe, expect, it } from 'vitest'
import { CODE_BLOCK_PALETTES, CODE_BLOCK_SURFACES } from './codeBlockConstants'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('code block palettes', () => {
  it('reads every token at AA contrast on its own surface', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [token, colour] of Object.entries(CODE_BLOCK_PALETTES[theme])) {
        expect({
          theme,
          token,
          ratio: contrast(colour, CODE_BLOCK_SURFACES[theme]) >= 4.5,
        }).toEqual({
          theme,
          token,
          ratio: true,
        })
      }
    }
  })

  it('names the same tokens in both palettes', () => {
    expect(Object.keys(CODE_BLOCK_PALETTES.light).sort()).toEqual(
      Object.keys(CODE_BLOCK_PALETTES.dark).sort(),
    )
  })
})
