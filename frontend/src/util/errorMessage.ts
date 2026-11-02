import { isAxiosError } from 'axios'

// The server says "workspace"; people see "Space".
function spaceWording(text: string): string {
  return text.replace(/\bworkspace\b/g, 'Space')
}

// Human-readable text for a failed API call (or any thrown value).
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Unable to reach the server. Check your connection and try again.'
    const reason = error.response.data?.errors?.join(', ') || error.response.data?.error
    return typeof reason === 'string' && reason ? spaceWording(reason) : error.message
  }
  return 'Unable to save. Please try again.'
}
