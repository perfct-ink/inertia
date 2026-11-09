import SwiftUI
import InertiaCore

private struct VoltaFieldInvalidKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    /// True when the fields below should show the error state (a danger border and ring).
    var voltaFieldInvalid: Bool {
        get { self[VoltaFieldInvalidKey.self] }
        set { self[VoltaFieldInvalidKey.self] = newValue }
    }
}

extension View {
    /// Marks the fields inside as invalid. Pair it with a visible message (`ValidationMessage`)
    /// so the error is never shown by color alone.
    func voltaInvalid(_ invalid: Bool = true) -> some View {
        environment(\.voltaFieldInvalid, invalid)
    }
}

/// The box around every Volta field (text fields, text areas and selects): a quiet border that
/// firms up on hover and turns to the accent color, with a ring, on focus. Hover and focus never
/// change its size. Controls own their focus state and pass it in.
struct VoltaFieldFrame<Content: View>: View {
    var kind: VoltaFieldKind = .text
    var focused: Bool
    var minimumHeight: Double = VoltaMetrics.minimumControlHeight
    var padding: VoltaMetrics.Padding = VoltaMetrics.fieldPadding
    /// False draws only the padding and minimum height, for a title that is edited in place.
    var bordered = true
    @ViewBuilder var content: Content
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.voltaFieldInvalid) private var invalid
    @State private var hovering = false

    var body: some View {
        let spec = VoltaFieldSpec.make(kind, hovered: hovering, focused: focused, invalid: invalid,
                                       enabled: isEnabled, minimumHeight: minimumHeight)
        let shape = RoundedRectangle(cornerRadius: spec.cornerRadius)
        if bordered {
            content
                .voltaFont(spec.textSize)
                .foregroundStyle(Volta.foreground)
                .padding(.horizontal, padding.horizontal)
                .padding(.vertical, padding.vertical)
                .frame(minHeight: spec.minimumHeight)
                .background(Volta.color(spec.background), in: shape)
                .overlay { shape.strokeBorder(Volta.color(spec.border), lineWidth: 1) }
                .voltaFocusRing(spec.ring, cornerRadius: spec.cornerRadius)
                .opacity(spec.opacity)
                .contentShape(shape)
                .onHover { hovering = $0 }
                .animation(Volta.animation, value: hovering)
                .animation(Volta.animation, value: focused)
        } else {
            content
                .padding(.vertical, padding.vertical)
                .frame(minHeight: spec.minimumHeight)
                .opacity(spec.opacity)
        }
    }
}

/// Multi-line text with Volta's field styling, for notes and descriptions.
struct VoltaTextArea: View {
    var title: String
    @Binding var text: String
    var minimumHeight: Double = VoltaMetrics.textAreaMinimumHeight
    @FocusState private var focused: Bool

    var body: some View {
        // TextEditor insets its text a little itself, so less padding gives the same 12 and 8 points.
        VoltaFieldFrame(focused: focused, minimumHeight: minimumHeight,
                        padding: VoltaMetrics.Padding(horizontal: 7, vertical: 3)) {
            TextEditor(text: $text)
                .focused($focused)
                .scrollContentBackground(.hidden)
                .accessibilityLabel(title)
        }
    }
}
