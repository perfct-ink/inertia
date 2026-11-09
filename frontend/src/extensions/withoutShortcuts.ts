import type { AnyExtension } from '@tiptap/core'

// The part of an extension `withoutShortcuts` needs: `extend` takes the same
// config on a mark, a node and an extension, but TypeScript can't call it on the union.
interface Extendable {
  extend(config: { addKeyboardShortcuts(this: { parent?: () => Record<string, unknown> }): Record<string, unknown> }): unknown
}

// An extension with some of its default keyboard shortcuts removed, keeping the
// rest (a code block needs its Backspace and Enter handling, for example).
export function withoutShortcuts<T extends AnyExtension>(extension: T, keys: string[]): T {
  return (extension as unknown as Extendable).extend({
    addKeyboardShortcuts() {
      const shortcuts = { ...(this.parent?.() ?? {}) }
      keys.forEach((key) => delete shortcuts[key])
      return shortcuts
    },
  }) as T
}
