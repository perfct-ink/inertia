// The link an inviter shares, a plain web path (see docs/features/clean_urls.md);
// `origin` is passed in (window.location.origin).
export function inviteLink(origin: string, token: string): string {
  return `${origin}/invite/${encodeURIComponent(token)}`
}
