import { View } from 'react-native'

import type { ProcessTimeDetailsView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import BottomSheet from '../../primitives/BottomSheet'
import TimeDetailsBody from './TimeDetailsBody'

export interface TimeDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  view: ProcessTimeDetailsView
  /** What the time is of — "Overall", "Verify · all 3 attempts". */
  title?: string
}

/**
 * Where a time went, in a bottom sheet — what a long-pressed time chip opens on
 * touch, where the web shows the same split in a hover popover.
 */
export default function TimeDetailsSheet({ isOpen, onClose, view, title }: TimeDetailsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title ?? 'Time worked'}>
      <View style={{ paddingHorizontal: nativeSpace[4], paddingBottom: nativeSpace[5] }}>
        <TimeDetailsBody view={view} />
      </View>
    </BottomSheet>
  )
}
