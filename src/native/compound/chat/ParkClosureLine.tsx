import { Text, View } from 'react-native'

import { useProcessParkStanding } from '../../../headless/hooks/useProcessParkStanding'
import type { ParkClosure } from '../../../headless/utils/processParkStandingTypes'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck, IconChevronRight } from '../../icons'

/** Native peer of web's `ParkClosureLine`. */
export default function ParkClosureLine({
  closure,
  banner = false,
}: {
  closure: ParkClosure
  banner?: boolean
}) {
  const { status } = useNativeTheme()
  const tone = closure.tone === 'handled' ? status.done : status.empty
  const Icon = closure.tone === 'handled' ? IconCheck : IconChevronRight
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: banner ? 8 : 6,
        backgroundColor: tone.softBg,
        ...(banner
          ? { paddingHorizontal: 14, paddingVertical: 8 }
          : {
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: tone.softBorder,
              borderRadius: nativeRadii[2],
              paddingHorizontal: 8,
              paddingVertical: 4,
            }),
      }}
    >
      <Icon size={banner ? 15 : 13} color={tone.softFg} />
      <Text
        style={{
          flexShrink: 1,
          fontSize: banner ? 12.5 : 12,
          fontWeight: banner ? '600' : '500',
          color: tone.softFg,
        }}
      >
        {closure.line}
      </Text>
    </View>
  )
}

/** Native peer of web's `RunParkClosure`. */
export function RunParkClosure({ runId, parkedAt }: { runId: string; parkedAt: number }) {
  const standing = useProcessParkStanding(runId, parkedAt)
  return standing.state === 'closed' ? <ParkClosureLine closure={standing.closure} /> : null
}
