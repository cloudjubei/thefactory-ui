/** How far one of the backend's startup passes got. */
export interface BackendStartupPass {
  /** The pass has settled for every project. */
  done: boolean
  projectsDone: number
  projectsTotal: number
}

/** The knowledge maps' startup pass. */
export interface BackendKnowledgeMapsStartup extends BackendStartupPass {
  /** The project whose map is being built now, with the pipeline's progress once it has reported one. */
  current?: { projectId: string; percent?: number }
  /** Projects whose map build failed; the pass still counts as done once it settles. */
  failed: string[]
}

/** How far a starting backend got. `knowledgeMaps` is absent when the backend builds no maps at startup. */
export interface BackendStartup {
  searchIndex: BackendStartupPass
  knowledgeMaps?: BackendKnowledgeMapsStartup
}

/** Whether the apps may leave their loading screen yet; `startup` is the backend's progress, when known. */
export interface BackendStartupStatus {
  ready: boolean
  startup: BackendStartup | null
}

/** One progress row of the loading screen. */
export interface BackendStartupLine {
  label: string
  completed: number
  total: number
  /** What the pass is on now, or how it ended. */
  detail?: string
}
