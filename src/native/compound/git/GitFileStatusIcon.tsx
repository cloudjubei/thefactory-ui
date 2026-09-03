import { IconFileAdded, IconFileDeleted, IconFileModified, IconWarningTriangle } from '../../icons'
import { nativePalette } from '../../../tokens/native'

export interface GitFileStatusIconProps {
  /** Git status code — `A` / `M` / `D` / `R` / `C` / `T` / `U` / `?` / `!`. */
  status?: string
  isConflicted?: boolean
  size?: number
}

/**
 * Native peer of web's `GitFileStatusIcon`. Uses the same glyph icons —
 * `IconFileAdded` / `IconFileDeleted` / `IconFileModified` (and
 * `IconWarningTriangle` for conflicts) — so the file-row chrome reads
 * identically across clients. The Git pane, write-tool previews, and any
 * future status-bearing surfaces should all dispatch through this so the
 * status vocabulary stays in lock-step with web.
 */
export default function GitFileStatusIcon({
  status,
  isConflicted,
  size = 16,
}: GitFileStatusIconProps) {
  if (isConflicted) return <IconWarningTriangle size={size} color={nativePalette.red[600]} />
  if (status === 'A') return <IconFileAdded size={size} />
  if (status === 'D') return <IconFileDeleted size={size} />
  return <IconFileModified size={size} />
}
