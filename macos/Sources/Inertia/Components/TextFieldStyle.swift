import SwiftUI

struct InertiaTextFieldStyle: TextFieldStyle {
    static let loginHeight: CGFloat = 52
    var showsBorder = true
    var minimumHeight: CGFloat = 40
    @FocusState private var focused: Bool

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .padding(.horizontal, showsBorder ? 10 : 0)
            .padding(.vertical, 10)
            .frame(minHeight: minimumHeight)
            .background {
                if showsBorder { RoundedRectangle(cornerRadius: 6).fill(.background) }
            }
            .overlay {
                if showsBorder {
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(focused ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: focused ? 2 : 1)
                }
            }
            .focused($focused)
    }
}
