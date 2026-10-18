/** Who the person is, as `user.current` answers an embedded app. */
export interface AppCurrentUser {
  name: string
  email?: string
  username?: string
}

/** The fields of a stored git credential that say who the person is. */
export interface AppUserCredential {
  name: string
  username: string
  email: string
  tokenSource?: 'pat' | 'oauth'
}
