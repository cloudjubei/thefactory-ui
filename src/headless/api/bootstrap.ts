/**
 * Configures the generated hey-api client and installs the request/response
 * interceptors. Safe to call multiple times under React StrictMode double-
 * mounts: any prior interceptors are ejected before new ones are installed.
 *
 * Authorization is owned end-to-end by the request interceptor: the bearer
 * header is set on every outgoing request, and any axios `auth` field is
 * stripped so the xhr adapter never synthesises a Basic header from a
 * function value (which would otherwise produce `Authorization: Basic
 * btoa(':')` and overwrite the bearer we want).
 */
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { client } from './generated/client.gen'
import type { ConfigureBackendClientOptions } from './ApiContext'

let activeRequestInterceptorId: number | null = null
let activeResponseInterceptorId: number | null = null

export function configureBackendClient({
  baseUrl,
  getToken,
  onUnauthorized,
  onAuthorized,
}: ConfigureBackendClientOptions): () => void {
  client.setConfig({
    baseURL: baseUrl.replace(/\/+$/, ''),
  })

  ejectActiveInterceptors()

  activeRequestInterceptorId = client.instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if ('auth' in config) {
        delete (config as { auth?: unknown }).auth
      }
      const token = getToken()
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`)
      }
      return config
    },
  )

  activeResponseInterceptorId = client.instance.interceptors.response.use(
    (response) => {
      onAuthorized()
      return response
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) onUnauthorized()
      return Promise.reject(error)
    },
  )

  return ejectActiveInterceptors
}

function ejectActiveInterceptors(): void {
  if (activeRequestInterceptorId !== null) {
    client.instance.interceptors.request.eject(activeRequestInterceptorId)
    activeRequestInterceptorId = null
  }
  if (activeResponseInterceptorId !== null) {
    client.instance.interceptors.response.eject(activeResponseInterceptorId)
    activeResponseInterceptorId = null
  }
}
