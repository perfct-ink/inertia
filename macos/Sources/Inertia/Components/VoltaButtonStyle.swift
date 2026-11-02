import SwiftUI
import InertiaCore

/// Volta's button for native screens: primary, secondary, ghost and destructive, matching
/// `ui-button` in React. Use `.buttonStyle(.volta(.primary))`. Plain SwiftUI buttons keep
/// their native keyboard and accessibility behavior; only the drawing changes.
struct VoltaButtonStyle: ButtonStyle {
    var variant: VoltaVariant = .primary
    /// Stretch to the width the parent offers (login and provider buttons).
    var fullWidth = false

    func makeBody(configuration: Configuration) -> some View {
        VoltaButtonBody(configuration: configuration, variant: variant, fullWidth: fullWidth)
    }
}

extension ButtonStyle where Self == VoltaButtonStyle {
    static func volta(_ variant: VoltaVariant = .primary, fullWidth: Bool = false) -> VoltaButtonStyle {
        VoltaButtonStyle(variant: variant, fullWidth: fullWidth)
    }
}

private struct VoltaButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let variant: VoltaVariant
    let fullWidth: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var hovering = false

    var body: some View {
        let pressed = configuration.isPressed
        let spec = VoltaButtonSpec.make(variant, hovered: hovering || pressed, enabled: isEnabled)
        let shape = RoundedRectangle(cornerRadius: spec.cornerRadius)
        configuration.label
            .voltaFont(spec.textSize, weight: spec.weight)
            .foregroundStyle(Volta.color(spec.foreground))
            .padding(.horizontal, spec.padding.horizontal)
            .padding(.vertical, spec.padding.vertical)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(minHeight: spec.minimumHeight)
            .background(Volta.color(spec.background), in: shape)
            .overlay { shape.strokeBorder(Volta.color(spec.border), lineWidth: 1) }
            .voltaFocusRing(isFocused && isEnabled ? .token(VoltaPalette.accent) : nil, cornerRadius: spec.cornerRadius)
            .opacity(spec.opacity)
            .contentShape(shape)
            .onHover { hovering = $0 }
            .animation(Volta.animation, value: hovering)
            .animation(Volta.animation, value: pressed)
    }
}
