import SwiftUI
import InertiaCore

/// The `ui-input--checkable` checkbox for native screens: a 16pt box that fills with the accent
/// color and shows a white check when on. Apply it with `.toggleStyle(VoltaCheckboxToggleStyle())`
/// (`voltaTheme()` sets it for a whole window). Space toggles it from the keyboard like any button.
struct VoltaCheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        VoltaCheckableRow(kind: .checkbox, isOn: configuration.isOn, action: { configuration.isOn.toggle() }) {
            configuration.label
        }
    }
}

/// Radio buttons for choosing one of a few options (`ui-input--checkable` with `type="radio"`).
/// Selects are better for long lists; radios suit two to four visible choices.
struct VoltaRadioGroup<Value: Hashable>: View {
    var title: String
    @Binding var selection: Value
    let options: [SelectOption<Value>]

    var body: some View {
        VStack(alignment: .leading, spacing: VoltaMetrics.space(2)) {
            ForEach(options, id: \.self) { option in
                VoltaCheckableRow(kind: .radio, isOn: selection == option.value, action: { selection = option.value }) {
                    Text(option.label)
                }
                .accessibilityAddTraits(selection == option.value ? .isSelected : [])
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
    }
}

/// One checkbox or radio with its label: the shared drawing and states.
private struct VoltaCheckableRow<Label: View>: View {
    let kind: VoltaCheckableKind
    let isOn: Bool
    let action: () -> Void
    @ViewBuilder var label: Label

    var body: some View {
        Button(action: action) {
            VoltaCheckableContent(kind: kind, isOn: isOn) { label }
        }
        .buttonStyle(.plain)
        .accessibilityValue(isOn ? "checked" : "unchecked")
    }
}

private struct VoltaCheckableContent<Label: View>: View {
    let kind: VoltaCheckableKind
    let isOn: Bool
    @ViewBuilder var label: Label
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var hovering = false

    var body: some View {
        let spec = VoltaCheckableSpec.make(kind, checked: isOn, hovered: hovering, focused: isFocused, enabled: isEnabled)
        HStack(spacing: VoltaMetrics.space(2)) {
            mark(spec)
            label.voltaFont(.sm).foregroundStyle(Volta.foreground)
        }
        .opacity(spec.opacity)
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        .animation(Volta.animation, value: hovering)
        .animation(Volta.animation, value: isOn)
    }

    private func mark(_ spec: VoltaCheckableSpec) -> some View {
        let shape = RoundedRectangle(cornerRadius: spec.cornerRadius)
        return shape.fill(Volta.color(spec.background))
            .overlay { shape.strokeBorder(Volta.color(spec.border), lineWidth: 1) }
            .overlay {
                if let markFill = spec.mark {
                    if kind == .radio { Circle().fill(Volta.color(markFill)).frame(width: VoltaMetrics.radioDotDiameter) }
                    else { VoltaCheckMark().stroke(Volta.color(markFill), style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)) }
                }
            }
            .frame(width: spec.size, height: spec.size)
            .voltaFocusRing(spec.ring, cornerRadius: spec.cornerRadius)
    }
}

/// The check inside a checked box, drawn on a 16-unit grid like the React icon (`M4 8.5l2.5 2.5L12 5.5`).
private struct VoltaCheckMark: Shape {
    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width, rect.height) / 16
        func point(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: rect.minX + x * scale, y: rect.minY + y * scale) }
        var path = Path()
        path.move(to: point(4, 8.5))
        path.addLine(to: point(6.5, 11))
        path.addLine(to: point(12, 5.5))
        return path
    }
}
