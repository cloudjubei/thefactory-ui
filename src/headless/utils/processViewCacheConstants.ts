/** Process-run lists kept across visits — one per project scope, plus the all-projects one. */
export const PROCESS_RUN_LIST_CACHE_CAPACITY = 32

/** How long a process-run list stays live after the last view showing it closed. */
export const PROCESS_RUN_LIST_LINGER_MS = 60_000

/** Single process runs kept across visits, by run id. */
export const PROCESS_RUN_CACHE_CAPACITY = 60

/** Story sign-offs whose runs are kept across visits. */
export const STORY_SIGNOFF_CACHE_CAPACITY = 8

/** Evidence listings (with their note text) kept across visits. */
export const REVIEW_EVIDENCE_CACHE_CAPACITY = 16

/** Project check scans kept across visits. */
export const PROJECT_CHECKS_CACHE_CAPACITY = 12

/** The key of the list that spans every project. */
export const ALL_PROJECTS_PROCESS_RUN_LIST_KEY = '*'

/** Evidence images (as data URIs) kept across views, newest used first. */
export const EVIDENCE_IMAGE_CACHE_CAPACITY = 64

/** Evidence note texts kept across views. */
export const EVIDENCE_NOTE_CACHE_CAPACITY = 1000

/** How many note texts one request asks for — the server's own limit is higher. */
export const EVIDENCE_TEXTS_PER_REQUEST = 500

/** How long an evidence listing stays live after its last view closes, so a quick return reads nothing. */
export const REVIEW_EVIDENCE_LINGER_MS = 30_000

/** Runs whose integration options are kept across views. */
export const INTEGRATION_OPTIONS_CACHE_CAPACITY = 8
