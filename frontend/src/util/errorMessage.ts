import { isAxiosError } from 'axios'

// Human-readable text for a failed API call (or any thrown value).
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Unable to reach the server. Check your connection and try again.'
    return error.response.data?.errors?.join(', ') || error.response.data?.error || error.message
  }
  return 'Unable to save. Please try again.'
}
