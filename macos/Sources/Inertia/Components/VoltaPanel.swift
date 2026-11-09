import SwiftUI
import InertiaCore

/// A titled group of related controls on the card color (the native counterpart of a bordered
/// section in the web editors). Replaces `GroupBox`, which draws the system's own box.
struct VoltaPanel<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: VoltaMetrics.space(2)) {
            Text(title).voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(VoltaMetrics.space(3))
        .voltaSurface(.card)
    }
}

/// A 1pt rule in the quiet border color (`--border`), in place of the system divider.
struct VoltaDivider: View {
    var body: some View {
        Rectangle().fill(Volta.border).frame(height: 1).accessibilityHidden(true)
    }
}
