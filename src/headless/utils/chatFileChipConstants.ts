import type { ChatFileChipLook, ChatFileKind } from './chatFileChipTypes'

export const CHAT_FILE_CHIP_LOOK: ChatFileChipLook = 'tile'

export const CHAT_FILE_CHIP_LOOKS: readonly { id: ChatFileChipLook; label: string }[] = [
  { id: 'pill', label: 'A · Pill' },
  { id: 'labelled', label: 'B · Pill with type' },
  { id: 'tile', label: 'C · Tile' },
]

export const CHAT_FILE_UNKNOWN_KIND: ChatFileKind = { short: 'File', long: 'File' }

export const CHAT_FILE_KINDS: Readonly<Record<string, ChatFileKind>> = {
  pdf: { short: 'PDF', long: 'PDF document' },
  csv: { short: 'CSV', long: 'Spreadsheet' },
  tsv: { short: 'TSV', long: 'Spreadsheet' },
  xls: { short: 'Excel', long: 'Spreadsheet' },
  xlsx: { short: 'Excel', long: 'Spreadsheet' },
  md: { short: 'Markdown', long: 'Markdown' },
  markdown: { short: 'Markdown', long: 'Markdown' },
  txt: { short: 'Text', long: 'Text' },
  json: { short: 'JSON', long: 'JSON' },
  doc: { short: 'Word', long: 'Document' },
  docx: { short: 'Word', long: 'Document' },
  zip: { short: 'ZIP', long: 'Archive' },
  webm: { short: 'Video', long: 'Video' },
  mp4: { short: 'Video', long: 'Video' },
  mov: { short: 'Video', long: 'Video' },
}
