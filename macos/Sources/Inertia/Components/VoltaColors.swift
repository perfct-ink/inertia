import SwiftUI
import AppKit
import InertiaCore

/// Volta's colors for native screens, matching the React app's theme. Each one
/// follows the system light/dark appearance. Use these instead of system colors
/// (`.secondary`, `.red`, `Color.accentColor`) so the Mac screens look like the web ones.
enum Volta {
    static let accent = color(VoltaPalette.accent)
    static let accentSubtle = color(VoltaPalette.accentSubtle)
    static let base = color(VoltaPalette.base)
    static let card = color(VoltaPalette.card)
    static let muted = color(VoltaPalette.baseMoreSubtle)
    static let border = color(VoltaPalette.baseSubtle)
    static let borderStrong = color(VoltaPalette.baseLessSubtle)
    static let foreground = color(VoltaPalette.trim)
    static let mutedForeground = color(VoltaPalette.trimSubtle)
    static let danger = color(VoltaPalette.danger)

    private static func color(_ token: VoltaToken) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let dark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            let rgb = token.value(dark: dark).rgb
            return NSColor(srgbRed: rgb.red, green: rgb.green, blue: rgb.blue, alpha: 1)
        })
    }
}
