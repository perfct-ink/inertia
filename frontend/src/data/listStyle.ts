// The looks a bullet list can have. A list's style is stored on the `bulletList`
// node as its `listStyle` attribute, so a dashed list is still a bullet list to
// anything that reads documents: Tab/Shift+Tab indenting, Markdown ("- "), and
// browser tabs or servers that predate the attribute (they drop it and show
// plain bullets). A document without the attribute has plain bullets. Mirrored
// in collab-server/src/schema.ts (the attribute and its default); keep the two
// in step.
export type ListStyle = 'bullet' | 'dashed'

export const DEFAULT_LIST_STYLE: ListStyle = 'bullet'

// The attribute written to the list's HTML (copy and paste, getHTML). Plain bullets write nothing.
export const LIST_STYLE_HTML_ATTRIBUTE = 'data-list-style'

// What a stored or parsed value means; anything unknown is a plain bullet list.
export function listStyleOf(value: unknown): ListStyle {
  return value === 'dashed' ? 'dashed' : DEFAULT_LIST_STYLE
}

// The attributes written on the list's HTML element. A dashed list is drawn without
// the browser's own markers (`list-style: none`), which makes Safari with VoiceOver
// stop treating it as a list, so it says `role="list"` itself.
export function listStyleHtmlAttributes(style: unknown): Record<string, string> {
  const known = listStyleOf(style)
  return known === DEFAULT_LIST_STYLE ? {} : { [LIST_STYLE_HTML_ATTRIBUTE]: known, role: 'list' }
}

// What choosing a list style does, given the innermost list around the cursor
// (`inside`: its node name, null when the cursor is not in a list):
// - unlist: it is already that style, so the item leaves the list
// - restyle: a bullet list of the other style changes style in place
// - convert: a numbered list becomes a bullet list of the chosen style
// - wrap: anything else becomes a new list
export type ListAction = 'unlist' | 'restyle' | 'convert' | 'wrap'

export function listAction(inside: string | null, current: ListStyle, chosen: ListStyle): ListAction {
  if (inside === 'bulletList') return current === chosen ? 'unlist' : 'restyle'
  if (inside === 'orderedList') return 'convert'
  return 'wrap'
}

// Tab on a list item can start a nested list, which the editor creates with the
// default style. Such a list (it holds only the item just indented) takes its
// parent's style, so a dashed list stays dashed when indented. A nested list
// that already had other items keeps what it was.
export function indentedListStyle(parent: ListStyle, nested: ListStyle, nestedItemCount: number): ListStyle {
  return nestedItemCount === 1 ? parent : nested
}
