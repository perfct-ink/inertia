import SwiftUI
import AppKit
import InertiaCore

/// Volta's colors for native screens, matching the React app's theme. Each one follows the
/// system light/dark appearance, so use these instead of system colors (`.secondary`, `.red`,
/// `Color.accentColor`) and the Mac screens look like the web ones. The values live in
/// `InertiaCore/VoltaPalette.swift`.
enum Volta {
    static let accent = token(VoltaPalette.accent)
    static let accentSubtle = token(VoltaPalette.accentSubtle)
    static let base = token(VoltaPalette.base)
    static let card = token(VoltaPalette.card)
    static let muted = token(VoltaPalette.baseMoreSubtle)
    static let border = token(VoltaPalette.baseSubtle)
    static let borderStrong = token(VoltaPalette.baseLessSubtle)
    static let foreground = token(VoltaPalette.trim)
    static let mutedForeground = token(VoltaPalette.trimSubtle)
    static let danger = token(VoltaPalette.danger)

    /// The color a control spec asks for, in the current appearance.
    static func color(_ fill: VoltaFill) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let dark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            let rgba = fill.resolve(dark: dark)
            return NSColor(srgbRed: rgba.red, green: rgba.green, blue: rgba.blue, alpha: rgba.alpha)
        })
    }

    private static func token(_ token: VoltaToken) -> Color { color(.token(token)) }

    /// Every state change eases for Volta's 150ms.
    static let animation = Animation.easeInOut(duration: VoltaMetrics.animationDuration)
}

extension VoltaFontWeight {
    var fontWeight: Font.Weight {
        switch self {
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        }
    }
}

extension View {
    /// Volta's type: the system font (SF Pro) at a step of the type scale.
    func voltaFont(_ size: VoltaTextSize = .sm, weight: VoltaFontWeight = .regular) -> some View {
        font(.system(size: size.size, weight: weight.fontWeight))
    }

    /// Small muted text: captions, hints and secondary lines.
    func voltaCaption() -> some View {
        voltaMuted(.xs)
    }

    /// Muted text at a step of the type scale (`muted-foreground`): helper copy and secondary lines.
    func voltaMuted(_ size: VoltaTextSize = .sm) -> some View {
        voltaFont(size).foregroundStyle(Volta.mutedForeground)
    }

    /// The accent ring around a focused control: a gap of the background, then the ring (`focus-ring`).
    func voltaFocusRing(_ color: VoltaFill?, cornerRadius: Double = VoltaMetrics.cornerRadius) -> some View {
        overlay {
            if let color {
                let gap = VoltaMetrics.focusGap, ring = VoltaMetrics.focusRingWidth
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius + gap / 2)
                        .stroke(Volta.base, lineWidth: gap).padding(-gap / 2)
                    RoundedRectangle(cornerRadius: cornerRadius + gap + ring / 2)
                        .stroke(Volta.color(color), lineWidth: ring).padding(-(gap + ring / 2))
                }.allowsHitTesting(false)
            }
        }
    }

    /// A panel: the card color with a quiet border (or the muted tint) and Volta's radius.
    func voltaSurface(_ spec: VoltaSurfaceSpec = .card) -> some View {
        background(Volta.color(spec.background), in: RoundedRectangle(cornerRadius: spec.cornerRadius))
            .overlay { RoundedRectangle(cornerRadius: spec.cornerRadius).strokeBorder(Volta.color(spec.border), lineWidth: 1) }
    }

    /// Volta's look for a whole window: the accent for native controls and the shared field and checkbox styles.
    func voltaTheme() -> some View {
        tint(Volta.accent)
            .textFieldStyle(InertiaTextFieldStyle())
            .toggleStyle(VoltaCheckboxToggleStyle())
    }

    /// The page color behind a window's content (`--background`), in light and dark.
    func voltaWindow() -> some View {
        background(Volta.base)
    }

    /// A list drawn on the muted tint inside a sheet, instead of the system's list background.
    func voltaList() -> some View {
        scrollContentBackground(.hidden)
            .background(Volta.muted, in: RoundedRectangle(cornerRadius: VoltaMetrics.cornerRadius))
    }

    /// A sign-in or sign-up card centered in a window, as on the web (`auth-card` on `view-auth`):
    /// 32pt padding on the card color over the muted page color, with Volta's corner radius.
    func voltaAuthCard(width: CGFloat = 400) -> some View {
        padding(VoltaMetrics.space(8))
            .frame(width: width)
            .background(Volta.card, in: RoundedRectangle(cornerRadius: VoltaMetrics.cornerRadius))
            .shadow(color: .black.opacity(0.05), radius: 1, y: 1)
            .padding(VoltaMetrics.space(4))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Volta.muted)
    }
}
