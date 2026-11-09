import SwiftUI
import InertiaCore

/// Volta's select (`ui-select`): a bordered field with a chevron that opens a menu of options.
/// It replaces `Picker` on native screens so selects look like the web ones. The menu, keyboard
/// and VoiceOver behavior are the system menu's, and VoiceOver reads the title and current choice.
///
///     VoltaSelect("Assignee", selection: $draft.assigneeID, options: assignees)
///
/// Use `hidesTitle` where the title would repeat nearby text (a row's control). Inside a `Form`
/// the title sits in the label column like the other fields.
struct VoltaSelect<Value: Hashable>: View {
    let title: String
    @Binding var selection: Value
    let options: [SelectOption<Value>]
    /// Shown when the selection matches no option.
    var placeholder = ""
    var hidesTitle = false

    init(_ title: String, selection: Binding<Value>, options: [SelectOption<Value>], placeholder: String = "", hidesTitle: Bool = false) {
        self.title = title
        _selection = selection
        self.options = options
        self.placeholder = placeholder
        self.hidesTitle = hidesTitle
    }

    var body: some View {
        if hidesTitle { menu } else { LabeledContent(title) { menu } }
    }

    private var menu: some View {
        let current = SelectOption.label(for: selection, in: options, placeholder: placeholder)
        return Menu {
            Picker(title, selection: $selection) {
                ForEach(options, id: \.self) { Text($0.label).tag($0.value) }
            }.pickerStyle(.inline).labelsHidden()
        } label: {
            VoltaSelectLabel(text: current)
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .accessibilityLabel(title)
        .accessibilityValue(current)
    }
}

private struct VoltaSelectLabel: View {
    let text: String
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        VoltaFieldFrame(kind: .select, focused: isFocused) {
            HStack(spacing: VoltaMetrics.space(2)) {
                Text(text).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.down").font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Volta.mutedForeground).accessibilityHidden(true)
            }
        }
    }
}
