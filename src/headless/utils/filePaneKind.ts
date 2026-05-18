// File-extension → renderer-kind classifier. Pure TS, used by web's
// `FilePane` to pick between markdown / html / image / pdf / text / binary
// viewers, and by `thefactory-overseer-mobile`'s `FilesContext` to decide
// whether a file's text content needs to be fetched at all.

export type FilePaneKind = 'markdown' | 'html' | 'text' | 'image' | 'pdf' | 'binary'

const MARKDOWN_EXTS = new Set(['md', 'mdx', 'markdown'])
const HTML_EXTS = new Set(['html', 'htm'])
const IMAGE_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'tif',
  'tiff',
])
const PDF_EXTS = new Set(['pdf'])
const TEXT_EXTS = new Set([
  'txt',
  'log',
  'csv',
  'tsv',
  'env',
  'gitignore',
  'gitattributes',
  'editorconfig',
  'eslintignore',
  'prettierignore',
  'npmrc',
  'nvmrc',
  'json',
  'json5',
  'jsonl',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'properties',
  'xml',
  'css',
  'scss',
  'sass',
  'less',
  'styl',
  'svg',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'mts',
  'cts',
  'vue',
  'svelte',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'scala',
  'c',
  'cc',
  'cpp',
  'cxx',
  'h',
  'hh',
  'hpp',
  'hxx',
  'm',
  'mm',
  'cs',
  'fs',
  'php',
  'pl',
  'pm',
  'lua',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  'sql',
  'graphql',
  'gql',
  'proto',
  'r',
  'dart',
  'ex',
  'exs',
  'erl',
  'elm',
  'clj',
  'cljs',
  'cljc',
  'lock',
])

export function classifyFileByExtension(path: string | null | undefined): FilePaneKind {
  if (!path) return 'binary'
  const lower = path.toLowerCase()
  const lastDot = lower.lastIndexOf('.')
  const ext = lastDot >= 0 ? lower.slice(lastDot + 1) : ''
  if (MARKDOWN_EXTS.has(ext)) return 'markdown'
  if (HTML_EXTS.has(ext)) return 'html'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (PDF_EXTS.has(ext)) return 'pdf'
  if (TEXT_EXTS.has(ext)) return 'text'
  return 'binary'
}
