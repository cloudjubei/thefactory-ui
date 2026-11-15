/** A titled list of points a proof showed, or could not show. */
export type ProofPointList = {
  title: string
  items: string[]
}

/**
 * What a proving step showed and what it could not, as its stop and its row
 * draw it: the shown points count on their own; the rest is not proven.
 */
export type PartialProofView = {
  shown: ProofPointList
  notShown: ProofPointList & {
    /** That nothing in this list is proven. */
    caveat: string
  }
}
