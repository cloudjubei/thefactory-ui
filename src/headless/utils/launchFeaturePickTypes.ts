/** A story feature a launch can work: what the launch card picks from. */
export type LaunchFeaturePickCandidate = { id: string; title: string }

/** One feature on the launch card's pick: whether the launch works it. */
export type LaunchFeaturePickRow = { featureId: string; title: string; picked: boolean }

/** What the launch decision carries about the features picked. */
export type LaunchFeaturePickMetadata = { featureIds: string[] }
