import type { CodeBlockTheme } from '../types/settings'

/** A code block's surface, per theme. */
export const CODE_BLOCK_SURFACES: Record<CodeBlockTheme, string> = {
  dark: '#2d2d2d',
  light: '#ffffff',
}

/**
 * A code block's token colours, each readable on its own surface: dark is
 * prism-tomorrow, light a One Light darkened to AA on white. Web's
 * `styles/components/code-block.css` paints Prism's tokens with the light ones.
 */
export const CODE_BLOCK_PALETTES = {
  dark: {
    text: '#cccccc',
    punct: '#cccccc',
    comment: '#999999',
    key: '#f08d49',
    string: '#7ec699',
    number: '#f8c555',
    literal: '#cc99cd',
    keyword: '#cc99cd',
    function: '#f08d49',
    add: '#7ec699',
    del: '#e2777a',
    hunk: '#67cdcc',
  },
  light: {
    text: '#383a42',
    punct: '#383a42',
    comment: '#6a6d75',
    key: '#c8382b',
    string: '#3a7d39',
    number: '#8a5d00',
    literal: '#0a6f9e',
    keyword: '#9b2393',
    function: '#2d5fc4',
    add: '#3a7d39',
    del: '#c8382b',
    hunk: '#0a6f9e',
  },
} as const satisfies Record<CodeBlockTheme, Record<string, string>>
