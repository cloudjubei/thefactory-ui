import { View } from 'react-native'

import type { CostDetailsView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import BottomSheet from '../../primitives/BottomSheet'
import CostDetailsBody from './CostDetailsBody'

export interface CostDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  view: CostDetailsView
  /** What the cost is of — "Spent so far", "All 3 attempts". */
  title?: string
}

/**
 * A cost's details in a bottom sheet — what a pressed cost chip opens on touch,
 * where the web shows the same details in a popover.
 */
export default function CostDetailsSheet({ isOpen, onClose, view, title }: CostDetailsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title ?? 'Cost'}>
      <View style={{ paddingHorizontal: nativeSpace[4], paddingBottom: nativeSpace[5] }}>
        <CostDetailsBody view={view} />
      </View>
    </BottomSheet>
  )
}
