import type { ChatContextFillLevel } from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** The colour a context fill is drawn in, by how full it reads. */
export function useContextFillColors(): Record<ChatContextFillLevel, string> {
  const { theme, status } = useNativeTheme()
  return {
    roomy: theme.accent.primary,
    filling: status.working.bg,
    'nearly-full': status.stuck.bg,
  }
}
