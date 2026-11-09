import SwiftUI
import InertiaCore

/// Volta's text field for every native screen: 40pt minimum, 4pt corners, a quiet border that
/// firms up on hover and takes the accent color and a ring on focus (`ui-input`). Mark a field
/// with `.voltaInvalid()` for the error state; a disabled field fades.
struct InertiaTextFieldStyle: TextFieldStyle {
    static let loginHeight: CGFloat = 52
    var showsBorder = true
    var minimumHeight: CGFloat = VoltaMetrics.minimumControlHeight

    func _body(configuration: TextField<Self._Label>) -> some View {
        VoltaTextFieldBody(showsBorder: showsBorder, minimumHeight: minimumHeight) { configuration.textFieldStyle(.plain) }
    }
}

private struct VoltaTextFieldBody<Content: View>: View {
    let showsBorder: Bool
    let minimumHeight: Double
    @ViewBuilder var content: Content
    @FocusState private var focused: Bool

    var body: some View {
        VoltaFieldFrame(focused: focused, minimumHeight: minimumHeight, bordered: showsBorder) {
            content.focused($focused)
        }
    }
}
