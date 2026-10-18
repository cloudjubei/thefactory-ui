import type { Feature } from 'thefactory-tools/types'

import { featureKindChipLabel } from '../../../headless/utils/featureKind'
import ToneBadge from '../chips/ToneBadge'

export interface FeatureKindChipProps {
  feature: Pick<Feature, 'kind'>
}

/** Native peer of web's `FeatureKindChip`: "Design" on a design feature, nothing on code. */
export default function FeatureKindChip({ feature }: FeatureKindChipProps) {
  const label = featureKindChipLabel(feature)
  return label ? <ToneBadge tone="queued" label={label} /> : null
}
