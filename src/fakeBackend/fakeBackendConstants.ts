/** Loopback only: the fake is never reachable from outside this machine. */
export const FAKE_BACKEND_HOST = '127.0.0.1'

export const FAKE_BACKEND_DEFAULT_PORT_ENV = 'PORT'

export const FAKE_BACKEND_DEFAULT_TOKEN_ENV = 'FAKE_BACKEND_TOKEN'

/** Every token the fake takes starts with this, which is what keeps a real one out of it. */
export const FAKE_BACKEND_TOKEN_PREFIX = 'fake-'

export const FAKE_BACKEND_WS_PATH = '/ws'

/** What the real backend answers as its version, spelt so a screenshot cannot pass for it. */
/** The GUID RFC 6455 fixes for the handshake's `Sec-WebSocket-Accept`. */
export const FAKE_BACKEND_WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

export const FAKE_BACKEND_WS_TEXT_FRAME = 0x81

export const FAKE_BACKEND_WS_CLOSE_OPCODE = 0x08

export const FAKE_BACKEND_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'

export const FAKE_BACKEND_ALLOWED_HEADERS = 'authorization, content-type'

export const FAKE_BACKEND_VERSION = '0.0.0-fake'

export const FAKE_BACKEND_UNKNOWN_ROUTE_CODE = 'FAKE_BACKEND_UNKNOWN_ROUTE'

export const FAKE_BACKEND_NO_RECORD_CODE = 'FAKE_BACKEND_NO_RECORD'

export const FAKE_BACKEND_BAD_BODY_CODE = 'FAKE_BACKEND_BAD_BODY'

export const FAKE_BACKEND_FAILED_CODE = 'FAKE_BACKEND_FAILED'

export const FAKE_BACKEND_UNAUTHORIZED_CODE = 'FAKE_BACKEND_UNAUTHORIZED'
