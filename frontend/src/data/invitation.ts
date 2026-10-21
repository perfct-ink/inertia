// The link an inviter shares. The app uses hash routing today, so the route
// lives after the "#"; `origin` is passed in (window.location.origin).
export function inviteLink(origin: string, token: string): string {
  return `${origin}/index.html#/invite/${encodeURIComponent(token)}`
}
