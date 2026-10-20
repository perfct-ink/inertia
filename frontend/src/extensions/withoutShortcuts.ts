import type { AnyExtension } from '@tiptap/core'

// An extension with some of its default keyboard shortcuts removed, keeping the
// rest (code blocks need their Backspace and Enter handling, for example).
export function withoutShortcuts<T extends AnyExtension>(extension: T, keys: string[]): T {
  return extension.extend({
    addKeyboardShortcuts() {
      const parent: Record<string, unknown> = { ...(this.parent?.() ?? {}) }
      keys.forEach((key) => delete parent[key])
      return parent as ReturnType<NonNullable<typeof this.parent>>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as T
}
