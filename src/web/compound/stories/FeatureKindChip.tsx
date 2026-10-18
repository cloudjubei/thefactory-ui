import type { Feature } from 'thefactory-tools/types'

import { featureKindChipLabel } from '../../../headless/utils/featureKind'
import ToneBadge from '../chips/ToneBadge'

export type FeatureKindChipProps = {
  feature: Pick<Feature, 'kind'>
}

/** "Design" on a design feature wherever it is listed; nothing on a code feature. */
export default function FeatureKindChip({ feature }: FeatureKindChipProps) {
  const label = featureKindChipLabel(feature)
  return label ? <ToneBadge tone="queued">{label}</ToneBadge> : null
}
