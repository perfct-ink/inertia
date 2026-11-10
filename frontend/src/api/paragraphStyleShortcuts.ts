import api from '@/lib/api'
import type { UserStyleShortcut } from '@/data/paragraphStyleShortcut'
import { ApiResource, useApiMutation, useResourceList } from './base'

// The signed-in person's keystrokes for paragraph styles (data/paragraphStyleShortcut.ts).
// Like their styles they belong to the person, not to a Space. A style has at most one;
// they are found by style id ("quote", "custom-12"), not by a numeric id.
export class ParagraphStyleShortcutApi extends ApiResource<UserStyleShortcut> {
  constructor() {
    super('/api/v1/paragraph_style_shortcuts', 'paragraph_style_shortcut', 'paragraph_style_shortcuts')
  }

  // Sets or replaces the style's keystroke. The dialog that records it shows a
  // refusal (a keystroke already on another style) beside the row, so the error
  // notice is left to it.
  set(style: string, keys: string) {
    return api.put<UserStyleShortcut>(`${this.path}/${style}`, this.body({ keys }), { silent: true }).then((r) => r.data)
  }

  clear(style: string) {
    return api.delete(`${this.path}/${style}`)
  }
}

export const paragraphStyleShortcutApi = new ParagraphStyleShortcutApi()

// They change only when this person changes one, so they are kept for a while.
export const useParagraphStyleShortcuts = () => useResourceList(paragraphStyleShortcutApi, { staleTime: 5 * 60_000 })
export const useSetParagraphStyleShortcut = () =>
  useApiMutation(({ style, keys }: { style: string; keys: string }) => paragraphStyleShortcutApi.set(style, keys), [paragraphStyleShortcutApi.queryKey])
export const useClearParagraphStyleShortcut = () =>
  useApiMutation((style: string) => paragraphStyleShortcutApi.clear(style), [paragraphStyleShortcutApi.queryKey])
