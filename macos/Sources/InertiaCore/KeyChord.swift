import Foundation

/// A Mac keystroke written the way menus show it ("⌘⇧X", "⌃⌘↑"), split into the parts a menu
/// item needs. The web editor's shortcut table (frontend/src/data/editorShortcut.ts) holds the
/// same strings, so the Format menu reads its keys from the same text and cannot drift from it.
public struct KeyChord: Equatable {
    /// One lowercase character ("x", "7", "]") or "up", "down", "left", "right" for an arrow.
    public let key: String
    public let command: Bool
    public let shift: Bool
    public let option: Bool
    public let control: Bool

    /// Nil unless `keys` is zero or more modifiers (⌘ ⇧ ⌥ ⌃) and then exactly one key.
    public init?(_ keys: String) {
        var command = false, shift = false, option = false, control = false
        var rest = Substring(keys)
        modifiers: while let first = rest.first {
            switch first {
            case "⌘": command = true
            case "⇧": shift = true
            case "⌥": option = true
            case "⌃": control = true
            default: break modifiers
            }
            rest = rest.dropFirst()
        }
        guard rest.count == 1, let glyph = rest.first else { return nil }
        let arrows: [Character: String] = ["↑": "up", "↓": "down", "←": "left", "→": "right"]
        self.key = arrows[glyph] ?? String(glyph).lowercased()
        self.command = command
        self.shift = shift
        self.option = option
        self.control = control
    }
}
