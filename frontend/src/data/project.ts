// Emojis offered when choosing a project's icon; any other emoji can be typed.
export const PROJECT_EMOJIS = [
  '🚀', '📁', '📌', '🎯', '💡', '🛠️', '📈', '🧪',
  '🎨', '🎵', '📚', '🏠', '🌱', '⭐', '🔥', '💬',
  '🧭', '📦', '🗓️', '✅', '🐞', '🔒', '🌍', '💼',
]

// What a project shows as its icon: an uploaded image wins over an emoji;
// neither means the default project icon.
export type ProjectIconKind = { image: string } | { emoji: string } | null

export function projectIconOf(project: { icon?: string | null; image_url?: string | null }): ProjectIconKind {
  if (project.image_url) return { image: project.image_url }
  if (project.icon?.trim()) return { emoji: project.icon.trim() }
  return null
}
