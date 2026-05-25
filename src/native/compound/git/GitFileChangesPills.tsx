import { Text, View } from 'react-native'
import { countPatchAddDel } from 'thefactory-tools/utils'

import { nativeFontFamilies, nativePalette } from '../../../tokens/native'

export type GitFileChangesPillsProps = {
  /** Unified-diff patch text. Parsed for `+`/`-` lines when explicit
   *  `additions` / `deletions` aren't supplied. */
  patch?: string
  /** Pre-computed additions — preferred for aggregate (multi-file) totals
   *  where there's no single patch to parse. */
  additions?: number
  /** Pre-computed deletions. */
  deletions?: number
}

/**
 * Native peer of web's `GitFileChangesPills` — a `+N` / `-N` pair derived
 * from either a unified-diff patch or explicit add/del counts. Same green /
 * red palette + pill chrome as web (Tailwind `green-500` / `red-500`).
 */
export function GitFileChangesPills({ patch, additions, deletions }: GitFileChangesPillsProps) {
  let add: number
  let del: number
  if (typeof additions === 'number' || typeof deletions === 'number') {
    add = additions ?? 0
    del = deletions ?? 0
  } else if (patch) {
    const counts = countPatchAddDel(patch)
    add = counts.add
    del = counts.del
  } else {
    return null
  }
  if (add === 0 && del === 0) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {add > 0 ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 999,
            backgroundColor: 'rgba(34,197,94,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(34,197,94,0.20)',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontFamily: nativeFontFamilies.mono,
              color: nativePalette.green[700],
            }}
          >
            +{add}
          </Text>
        </View>
      ) : null}
      {del > 0 ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 999,
            backgroundColor: 'rgba(239,68,68,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.20)',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontFamily: nativeFontFamilies.mono,
              color: nativePalette.red[700],
            }}
          >
            -{del}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default GitFileChangesPills
