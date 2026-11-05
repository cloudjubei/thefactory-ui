import { VIDEO_SOURCE_MARGIN_MS } from '../utils/videoPlaybackConstants'
import type { ChatVideoSource, VideoSource } from '../utils/videoPlaybackTypes'
import type { ChatVideoMediaUrls } from './videoApi'

const SERVER_RELATIVE = /^\//

/**
 * A chat video's signed URLs, kept for as long as they last. A card asks when it is shown, so
 * the URL is in hand by the time a tap has to start the sound, and again only once it is spent.
 */
export class ChatVideoMediaLease implements ChatVideoSource {
  private readonly read: (still: string | undefined) => Promise<ChatVideoMediaUrls>
  private readonly apiBaseUrl: string | null
  private urls: ChatVideoMediaUrls | null = null
  private poster: string | undefined

  constructor(
    read: (still: string | undefined) => Promise<ChatVideoMediaUrls>,
    apiBaseUrl: string | null,
  ) {
    this.read = read
    this.apiBaseUrl = apiBaseUrl
  }

  /** The poster's URL, or `null` when there is none to show yet. */
  async stillUrl(poster: string | undefined): Promise<string | null> {
    this.poster = poster
    const urls = await this.asked()
    return urls?.stillUrl ? this.onServer(urls.stillUrl) : null
  }

  async video(): Promise<VideoSource | null> {
    const urls = this.isFresh() ? this.urls : await this.asked()
    return urls ? { url: this.onServer(urls.url), expiresAt: urls.expiresAt } : null
  }

  private isFresh(): boolean {
    if (!this.urls) return false
    return Date.parse(this.urls.expiresAt) - Date.now() > VIDEO_SOURCE_MARGIN_MS
  }

  private async asked(): Promise<ChatVideoMediaUrls | null> {
    this.urls = await this.read(this.poster).catch(() => null)
    return this.urls
  }

  private onServer(url: string): string {
    if (!SERVER_RELATIVE.test(url)) return url
    return `${(this.apiBaseUrl ?? '').replace(/\/+$/, '')}${url}`
  }
}
