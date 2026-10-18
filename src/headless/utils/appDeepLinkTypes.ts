/** What `nav.current` answers: the App tab's deep-link, when it has one, and the absolute Overseer URL of the app's route. */
export interface NavCurrentReply {
  view?: string
  params?: Record<string, string>
  appUrl: string
}
