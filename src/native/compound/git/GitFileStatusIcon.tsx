import { Text, View } from 'react-native'

export interface GitFileStatusIconProps {
  /** Git status code — `A` / `M` / `D` / `R` / `C` / `T` / `U` / `?` / `!`. */
  status?: string
  isConflicted?: boolean
}

const STYLE: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#dcfce7', fg: '#15803d' },
  M: { bg: '#fef3c7', fg: '#b45309' },
  D: { bg: '#fee2e2', fg: '#b91c1c' },
  R: { bg: '#dbeafe', fg: '#1d4ed8' },
  C: { bg: '#dbeafe', fg: '#1d4ed8' },
  T: { bg: '#fef3c7', fg: '#b45309' },
  U: { bg: '#fee2e2', fg: '#b91c1c' },
  '?': { bg: '#f3f4f6', fg: '#6b7280' },
  '!': { bg: '#f3f4f6', fg: '#6b7280' },
  X: { bg: '#f3f4f6', fg: '#6b7280' },
}

/**
 * Native peer of web's `GitFileStatusIcon` — a compact colour-coded letter
 * badge for one file's git status (web uses glyph icons; a letter badge
 * reads more clearly at touch sizes and matches the Git status pane).
 */
export default function GitFileStatusIcon({ status, isConflicted }: GitFileStatusIconProps) {
  const code = isConflicted ? 'U' : (status ?? 'X')
  const style = STYLE[code] ?? STYLE.X
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: style.bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: style.fg }}>{code}</Text>
    </View>
  )
}
