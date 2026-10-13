import type { ComponentType } from 'react'
import type { ReferenceDescription } from 'thefactory-tools/types'
import {
  IconAttach,
  IconBoard,
  IconBranch,
  IconChat,
  IconDocument,
  IconFiles,
  IconFolder,
  IconList,
  IconMonitor,
  IconPalette,
  IconWorkflow,
} from '../../icons'

type Glyph = ComponentType<{ className?: string }>

const GLYPHS: Record<ReferenceDescription['kind'], Glyph> = {
  story: IconBoard,
  feature: IconList,
  note: IconDocument,
  groupNote: IconDocument,
  attachment: IconAttach,
  file: IconFiles,
  project: IconFolder,
  chat: IconChat,
  app: IconMonitor,
  design: IconPalette,
  run: IconBranch,
  process: IconWorkflow,
}

/** The glyph a reference shows: by its kind, a folder for a path ending in a slash. */
export function referenceGlyph(description: Pick<ReferenceDescription, 'kind' | 'label'>): Glyph {
  if (description.kind === 'file' && description.label.endsWith('/')) return IconFolder
  return GLYPHS[description.kind]
}
