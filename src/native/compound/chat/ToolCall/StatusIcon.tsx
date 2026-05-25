import {
  IconCheckmarkCircle,
  IconError,
  IconHourglass,
  IconStopCircle,
  IconXCircle,
} from '../../../icons'
import type { ToolResultTypeLike } from '../../../../headless/utils/chatTypes'
import { nativePalette } from '../../../../tokens/native'

/**
 * Shared status visual + icon for the native `ToolCallCard` and
 * `ToolPreviewSheet`. Mirrors web's `StatusIcon` + `StatusPill` colour /
 * label choices 1:1 so success / errored / aborted / pending read the same
 * across clients.
 */
export type StatusKind = 'success' | 'errored' | 'aborted' | 'not_allowed' | 'pending' | 'confirm'

export type StatusVisual = {
  kind: StatusKind
  iconColor: string
  pillBg: string
  pillText: string
  label: string
}

export function statusVisual(resultType?: ToolResultTypeLike): StatusVisual | null {
  switch (resultType) {
    case 'errored':
      return {
        kind: 'errored',
        iconColor: nativePalette.red[500],
        pillBg: 'rgba(239,68,68,0.20)',
        pillText: nativePalette.red[600],
        label: 'errored',
      }
    case 'aborted':
      return {
        kind: 'aborted',
        iconColor: nativePalette.orange[500],
        pillBg: 'rgba(249,115,22,0.20)',
        pillText: nativePalette.orange[600],
        label: 'aborted',
      }
    case 'not_allowed':
      return {
        kind: 'not_allowed',
        iconColor: nativePalette.gray[500],
        pillBg: 'rgba(115,115,115,0.20)',
        pillText: nativePalette.gray[600],
        label: 'not allowed',
      }
    case 'pending':
    case 'running':
      return {
        kind: 'pending',
        iconColor: nativePalette.blue[500],
        pillBg: 'rgba(59,130,246,0.20)',
        pillText: nativePalette.blue[600],
        label: resultType,
      }
    case 'require_confirmation':
      return {
        kind: 'confirm',
        iconColor: nativePalette.teal[500],
        pillBg: 'rgba(20,184,166,0.20)',
        pillText: nativePalette.teal[600],
        label: 'needs confirmation',
      }
    case 'success':
      return {
        kind: 'success',
        iconColor: nativePalette.green[500],
        pillBg: 'rgba(34,197,94,0.20)',
        pillText: nativePalette.green[600],
        label: 'success',
      }
    default:
      return null
  }
}

export function StatusIcon({
  kind,
  color,
  size = 16,
}: {
  kind: StatusKind
  color: string
  size?: number
}) {
  switch (kind) {
    case 'success':
      return <IconCheckmarkCircle size={size} color={color} />
    case 'errored':
      return <IconError size={size} color={color} />
    case 'aborted':
      return <IconStopCircle size={size} color={color} />
    case 'not_allowed':
      return <IconXCircle size={size} color={color} />
    case 'pending':
    case 'confirm':
      return <IconHourglass size={size} color={color} />
  }
}
