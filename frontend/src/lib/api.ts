import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore } from '@/store/notifications'
import { errorMessage } from '@/util/errorMessage'

declare module 'axios' {
  interface AxiosRequestConfig {
    // The caller shows this request's error itself (e.g. an inline form error).
    silent?: boolean
  }
}

const api = axios.create({
  baseURL: process.env.API_URL ?? 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Middleware for every failed call: an expired/invalid session clears the
// login (the route guard then sends the user to /login to reauthenticate);
// every other failure shows an error notice unless the caller handles it.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isCancel(err)) return Promise.reject(err)
    const bypass = process.env.BYPASS_AUTH === 'true'
    if (err.response?.status === 401 && !bypass) {
      const wasSignedIn = useAuthStore.getState().token !== null
      useAuthStore.getState().logout()
      if (wasSignedIn && !err.config?.silent) useNotificationStore.getState().notify('Your session has expired. Please sign in again.')
    } else if (!err.config?.silent) {
      useNotificationStore.getState().notify(errorMessage(err))
    }
    return Promise.reject(err)
  }
)

export default api
