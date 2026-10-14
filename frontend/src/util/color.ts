// Deterministic user id -> HSL color, so the same user always gets the same
// collaboration cursor color across tabs/sessions and different users
// visibly differ (golden-angle spacing between hues).
export function colorForUserId(userId: number | undefined): string {
  const hue = ((userId ?? 0) * 137.508) % 360
  return `hsl(${hue}, 70%, 45%)`
}
