import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FilePane from './FilePane'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FilePane video', () => {
  it.each(['mp4', 'webm', 'mov'])('loads .%s through the supplied signed URL', async (ext) => {
    const url = 'https://media.example/video?signature=test'
    const getBinaryUrl = vi.fn().mockResolvedValue(url)
    const path = `recordings/demo.${ext}`
    render(<FilePane filePath={path} content={null} getBinaryUrl={getBinaryUrl} />)
    const video = await screen.findByLabelText(`demo.${ext}`)
    expect(getBinaryUrl).toHaveBeenCalledExactlyOnceWith(path)
    expect(video.tagName).toBe('VIDEO')
    expect(video.getAttribute('src')).toBe(url)
    expect(video.hasAttribute('controls')).toBe(true)
    expect(video.hasAttribute('playsinline')).toBe(true)
    expect(video.getAttribute('preload')).toBe('metadata')
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect(screen.queryByText('No inline viewer for this file type.')).toBeNull()
    fireEvent.error(video)
    expect(screen.getByText(/This video could not be played/)).toBeTruthy()
  })

  it('shows URL loading and failure states', async () => {
    let reject!: (reason: Error) => void
    const getBinaryUrl = () =>
      new Promise<string>((_, fail) => {
        reject = fail
      })
    render(<FilePane filePath="demo.mp4" content={null} getBinaryUrl={getBinaryUrl} />)
    expect(screen.getByText('Loading video…')).toBeTruthy()
    await act(async () => reject(new Error('Media access denied')))
    expect(screen.getByText('Media access denied')).toBeTruthy()
  })

  it('ends playback and releases the URL on leaving the file', async () => {
    const revokeBinaryUrl = vi.fn()
    const getBinaryUrl = vi.fn().mockResolvedValue('blob:video')
    const props = { content: null, getBinaryUrl, revokeBinaryUrl }
    const view = render(<FilePane {...props} filePath="demo.mp4" />)
    const video = await screen.findByLabelText('demo.mp4')
    view.rerender(<FilePane {...props} filePath="notes.txt" />)
    expect(video.getAttribute('src')).toBeNull()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled()
    expect(revokeBinaryUrl).toHaveBeenCalledWith('blob:video')
    expect(getBinaryUrl).toHaveBeenCalledTimes(1)
  })

  it('releases a URL which arrives after navigating away', async () => {
    let resolve!: (url: string) => void
    const getBinaryUrl = () =>
      new Promise<string>((done) => {
        resolve = done
      })
    const revokeBinaryUrl = vi.fn()
    const view = render(
      <FilePane
        filePath="demo.mp4"
        content={null}
        getBinaryUrl={getBinaryUrl}
        revokeBinaryUrl={revokeBinaryUrl}
      />,
    )
    view.unmount()
    await act(async () => resolve('blob:late'))
    await waitFor(() => expect(revokeBinaryUrl).toHaveBeenCalledWith('blob:late'))
  })
})
