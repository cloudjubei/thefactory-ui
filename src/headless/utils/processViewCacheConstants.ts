/** Process-run lists kept across visits — one per project scope, plus the all-projects one. */
export const PROCESS_RUN_LIST_CACHE_CAPACITY = 12

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

/** How many evidence notes are fetched at once after a listing arrives. */
export const EVIDENCE_NOTE_FETCH_CONCURRENCY = 8
