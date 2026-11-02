// The public page for a share token (see the /shared/:token route).
export function sharedRoadmapUrl(origin: string, token: string): string {
  return `${origin}/shared/${token}`
}
