export const NAV_CURRENT_MESSAGE = 'nav.current'

export const NAV_CHANGED_MESSAGE = 'nav.changed'

export const LIVE_DATA_READ_MESSAGE = 'live-data.read'

export const LIVE_DATA_REFRESH_MESSAGE = 'live-data.refresh'

export const LIVE_DATA_SCHEDULE_MESSAGE = 'live-data.schedule'

export const LIVE_DATA_CHANGED_MESSAGE = 'live-data.changed'

export const DATA_CHANGED_MESSAGE = 'data.changed'

export const USER_CURRENT_MESSAGE = 'user.current'

/** `overseer:toolCalls.slips`: the tool calls agents got wrong, newest first. */
export const TOOL_CALL_SLIPS_MESSAGE = 'toolCalls.slips'

/** `overseer:toolCalls.stats`: those calls counted overall and per tool. */
export const TOOL_CALL_SLIP_STATS_MESSAGE = 'toolCalls.stats'

export const TOOL_CALL_SLIP_KINDS = ['invalid-args', 'unknown-tool', 'failed', 'corrected'] as const

export const WORK_START_MESSAGE = 'work.start'

export const FEATURE_REQUEST_MESSAGE = 'feature.request'
