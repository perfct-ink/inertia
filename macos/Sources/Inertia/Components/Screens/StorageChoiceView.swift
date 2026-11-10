import SwiftUI
import InertiaCore

/// The first screen: two cards, Cloud Storage (the inertia.it.com account) or Local Storage (a
/// folder in iCloud Drive). Shown until a choice is made, and again from "Change storage".
struct StorageChoiceView: View {
    @EnvironmentObject private var session: Session

    var body: some View {
        VStack(spacing: VoltaMetrics.space(6)) {
            VStack(spacing: 8) {
                AppLogo()
                Text("Where should Inertia keep your files?").voltaFont(.twoXL, weight: .semibold).tracking(-0.6).foregroundStyle(Volta.foreground)
                Text("You can change this later.").voltaMuted()
            }
            HStack(alignment: .top, spacing: VoltaMetrics.space(4)) {
                ForEach(StorageChoice.allCases) { choice in
                    StorageCard(choice: choice) { session.choose(choice) }
                }
            }
        }
        .padding(VoltaMetrics.space(8))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .voltaWindow()
    }
}

/// One of the two cards. A button, so it works from the keyboard, and it reacts to the pointer.
private struct StorageCard: View {
    let choice: StorageChoice
    let action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: VoltaMetrics.space(3)) {
                Image(systemName: choice.symbol).font(.system(size: 28)).foregroundStyle(Volta.accent)
                Text(choice.title).voltaFont(.lg, weight: .semibold).foregroundStyle(Volta.foreground)
                Text(choice.summary).voltaMuted().fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .multilineTextAlignment(.leading)
            .padding(VoltaMetrics.space(5))
            .frame(width: 260, height: 220, alignment: .topLeading)
            .background(hovering ? Volta.muted : Volta.card, in: RoundedRectangle(cornerRadius: VoltaMetrics.cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: VoltaMetrics.cornerRadius)
                    .strokeBorder(hovering ? Volta.borderStrong : Volta.border, lineWidth: 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: VoltaMetrics.cornerRadius))
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(Volta.animation, value: hovering)
        .accessibilityLabel(choice.title)
        .accessibilityHint(choice.summary)
    }
}
