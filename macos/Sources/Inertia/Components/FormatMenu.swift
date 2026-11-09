import SwiftUI
import InertiaCore

/// One Format menu item: its title, the editor command the page runs and its Mac keystroke,
/// written as menus show it. The commands and keys are the rows of the web editor's shortcut
/// table (frontend/src/data/editorShortcut.ts, `formatMenuItems`); a frontend test reads this
/// file and fails if the two disagree. The Mac app loads that same editor in a WKWebView, so
/// the keys already work there; this menu makes them easy to find.
struct FormatItem: Identifiable {
    let title: String
    let action: String
    let keys: String
    var id: String { action }
    init(_ title: String, _ action: String, _ keys: String) {
        self.title = title
        self.action = action
        self.keys = keys
    }

    var shortcut: KeyboardShortcut? {
        guard let chord = KeyChord(keys) else { return nil }
        var modifiers: EventModifiers = []
        if chord.command { modifiers.insert(.command) }
        if chord.shift { modifiers.insert(.shift) }
        if chord.option { modifiers.insert(.option) }
        if chord.control { modifiers.insert(.control) }
        let key: KeyEquivalent
        switch chord.key {
        case "up": key = .upArrow
        case "down": key = .downArrow
        case "left": key = .leftArrow
        case "right": key = .rightArrow
        default: key = KeyEquivalent(Character(chord.key))
        }
        return KeyboardShortcut(key, modifiers: modifiers)
    }
}

/// The Format menu's sections, separated by dividers.
enum FormatMenu {
    static let sections: [[FormatItem]] = [
        [
            FormatItem("Bold", "bold", "⌘B"),
            FormatItem("Italic", "italic", "⌘I"),
            FormatItem("Underline", "underline", "⌘U"),
            FormatItem("Strikethrough", "strike", "⌘⇧X"),
            FormatItem("Inline code", "inlineCode", "⌘E"),
        ],
        [
            FormatItem("Normal text", "normalText", "⌘⌥0"),
            FormatItem("Heading 1", "heading1", "⌘⌥1"),
            FormatItem("Heading 2", "heading2", "⌘⌥2"),
            FormatItem("Heading 3", "heading3", "⌘⌥3"),
            FormatItem("Heading 4", "heading4", "⌘⌥4"),
            FormatItem("Heading 5", "heading5", "⌘⌥5"),
            FormatItem("Code block", "codeBlock", "⌘⇧M"),
        ],
        [
            FormatItem("Bulleted list", "bulletList", "⌘⇧7"),
            FormatItem("Numbered list", "orderedList", "⌘⇧9"),
            FormatItem("Checklist", "taskList", "⌘⇧L"),
            FormatItem("Mark checklist item done", "taskDone", "⌘⇧U"),
            FormatItem("Indent list item", "indent", "⌘]"),
            FormatItem("Outdent list item", "outdent", "⌘["),
            FormatItem("Move list item up", "moveUp", "⌃⌘↑"),
            FormatItem("Move list item down", "moveDown", "⌃⌘↓"),
        ],
        [
            FormatItem("Insert link", "link", "⌘K"),
            FormatItem("Insert table", "table", "⌥⌘T"),
            FormatItem("Clear formatting", "clearFormatting", "⌘\\"),
        ],
    ]
}

/// The Format menu. Each item sends its command to the workspace page; the page runs it in
/// the document editor that has the cursor, or, for ⌘K, ⌘E and ⌥⌘T, gives the key back its
/// meaning outside a document (quick-add, new event, new task). Disabled when the workspace
/// window is not in front, so the keys keep their usual meaning in task file windows.
struct FormatCommands: Commands {
    @FocusedValue(\.workspaceActive) private var workspaceActive

    var body: some Commands {
        CommandMenu("Format") {
            ForEach(Array(FormatMenu.sections.enumerated()), id: \.offset) { index, items in
                if index > 0 { Divider() }
                ForEach(items) { item in
                    Button(item.title) { NotificationCenter.default.post(name: .formatCommand, object: item.action) }
                        .keyboardShortcut(item.shortcut)
                        .disabled(workspaceActive != true)
                }
            }
        }
    }
}

/// True while the workspace window (the web app) is the front window.
struct WorkspaceActiveKey: FocusedValueKey {
    typealias Value = Bool
}

extension FocusedValues {
    var workspaceActive: Bool? {
        get { self[WorkspaceActiveKey.self] }
        set { self[WorkspaceActiveKey.self] = newValue }
    }
}
