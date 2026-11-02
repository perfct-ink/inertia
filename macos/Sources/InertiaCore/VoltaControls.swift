import Foundation

// What each control looks like in each state, as plain values. The SwiftUI
// controls in `macos/Sources/Inertia/Components/` only translate these into
// views, so the mapping from variant and state to color and spacing is tested
// here. The sources are `Button.scss`, `Input.scss`, `Select.scss`,
// `Textarea.scss`, `FormError.scss` and the `checkable` and `field-states`
// mixins in `frontend/src/styles/_tokens.scss`.

public enum VoltaVariant: String, CaseIterable {
    case primary, secondary, ghost, destructive
}

public struct VoltaButtonSpec: Equatable {
    public let background: VoltaFill
    public let border: VoltaFill
    public let foreground: VoltaFill
    public let opacity: Double
    public let minimumHeight: Double
    public let padding: VoltaMetrics.Padding
    public let cornerRadius: Double
    public let textSize: VoltaTextSize
    public let weight: VoltaFontWeight

    /// `hovered` also stands for a pressed button. A disabled button never shows its hover.
    public static func make(_ variant: VoltaVariant, hovered: Bool = false, enabled: Bool = true) -> VoltaButtonSpec {
        let hover = hovered && enabled
        let opacity = enabled ? 1.0 : VoltaMetrics.disabledOpacity
        let radius = VoltaMetrics.cornerRadius
        switch variant {
        case .primary:
            return VoltaButtonSpec(
                background: .token(hover ? VoltaPalette.accentHover : VoltaPalette.accent), border: .clear,
                foreground: .token(VoltaPalette.base), opacity: opacity, minimumHeight: VoltaMetrics.minimumControlHeight,
                padding: VoltaMetrics.Padding(horizontal: 12, vertical: 8), cornerRadius: radius, textSize: .sm, weight: .medium)
        case .secondary:
            return VoltaButtonSpec(
                background: .token(hover ? VoltaPalette.accentSubtle : VoltaPalette.card),
                border: .token(hover ? VoltaPalette.baseLessSubtle : VoltaPalette.baseSubtle),
                foreground: .token(hover ? VoltaPalette.trim : VoltaPalette.trimSubtle), opacity: opacity,
                minimumHeight: VoltaMetrics.minimumControlHeight, padding: VoltaMetrics.Padding(horizontal: 12, vertical: 8),
                cornerRadius: radius, textSize: .sm, weight: .medium)
        case .ghost:
            return VoltaButtonSpec(
                background: hover ? .token(VoltaPalette.accentSubtle) : .clear, border: .clear,
                foreground: .token(VoltaPalette.trim), opacity: opacity, minimumHeight: 0,
                padding: VoltaMetrics.Padding(horizontal: 8, vertical: 4), cornerRadius: radius, textSize: .sm, weight: .regular)
        case .destructive:
            return VoltaButtonSpec(
                background: hover ? .darkened(VoltaPalette.danger, by: 0.15) : .token(VoltaPalette.danger), border: .clear,
                foreground: .white, opacity: opacity, minimumHeight: VoltaMetrics.minimumControlHeight,
                padding: VoltaMetrics.Padding(horizontal: 12, vertical: 8), cornerRadius: radius, textSize: .sm, weight: .medium)
        }
    }
}

public enum VoltaFieldKind: Equatable {
    case text, select
}

public struct VoltaFieldSpec: Equatable {
    public let background: VoltaFill
    public let border: VoltaFill
    /// The focus ring color, or nil when the field is not focused.
    public let ring: VoltaFill?
    public let opacity: Double
    public let minimumHeight: Double
    public let padding: VoltaMetrics.Padding
    public let cornerRadius: Double
    public let textSize: VoltaTextSize

    /// A quiet border that firms up on hover and takes the accent color on focus, as in `field-states`.
    /// Unlike the stylesheet, focus wins over hover for the border, so the focused field is always the accented one.
    /// An invalid field has a danger border and ring. Selects sit on the card color; text fields are transparent.
    public static func make(_ kind: VoltaFieldKind = .text, hovered: Bool = false, focused: Bool = false,
                            invalid: Bool = false, enabled: Bool = true, minimumHeight: Double = VoltaMetrics.minimumControlHeight) -> VoltaFieldSpec {
        let hover = hovered && enabled
        let accent: VoltaFill = invalid ? .token(VoltaPalette.danger) : .token(VoltaPalette.accent)
        let border: VoltaFill = invalid || (focused && enabled)
            ? accent : .token(hover ? VoltaPalette.baseLessSubtle : VoltaPalette.baseSubtle)
        let rest: VoltaFill = kind == .select ? .token(VoltaPalette.card) : .clear
        return VoltaFieldSpec(
            background: hover ? .token(VoltaPalette.baseMoreSubtle) : rest, border: border,
            ring: focused && enabled ? accent : nil,
            opacity: enabled ? 1 : VoltaMetrics.disabledOpacity, minimumHeight: minimumHeight,
            padding: VoltaMetrics.fieldPadding, cornerRadius: VoltaMetrics.cornerRadius, textSize: .sm)
    }
}

public enum VoltaCheckableKind: Equatable {
    case checkbox, radio
}

public struct VoltaCheckableSpec: Equatable {
    public let background: VoltaFill
    public let border: VoltaFill
    /// The check mark or radio dot, nil while unchecked.
    public let mark: VoltaFill?
    public let ring: VoltaFill?
    public let opacity: Double
    public let size: Double
    public let cornerRadius: Double

    /// The `checkable` mixin: a bordered box that fills with the accent color when checked.
    /// Radios are round. Hovering an unchecked box only turns its border to the accent color.
    public static func make(_ kind: VoltaCheckableKind, checked: Bool, hovered: Bool = false,
                            focused: Bool = false, enabled: Bool = true) -> VoltaCheckableSpec {
        let hover = hovered && enabled
        let accent: VoltaFill = .token(VoltaPalette.accent)
        let size = VoltaMetrics.checkableSize
        return VoltaCheckableSpec(
            background: checked ? accent : .token(VoltaPalette.base),
            border: checked || hover ? accent : .token(VoltaPalette.baseLessSubtle),
            mark: checked ? .white : nil, ring: focused && enabled ? accent : nil,
            opacity: enabled ? 1 : VoltaMetrics.disabledOpacity, size: size,
            cornerRadius: kind == .radio ? size / 2 : VoltaMetrics.smallCornerRadius)
    }
}

/// Panels and cards: the card color with a quiet border and Volta's corner radius.
/// `muted` is the tinted background behind groups of cards.
public struct VoltaSurfaceSpec: Equatable {
    public let background: VoltaFill
    public let border: VoltaFill
    public let cornerRadius: Double

    public static let card = VoltaSurfaceSpec(background: .token(VoltaPalette.card), border: .token(VoltaPalette.baseSubtle),
                                              cornerRadius: VoltaMetrics.cornerRadius)
    public static let muted = VoltaSurfaceSpec(background: .token(VoltaPalette.baseMoreSubtle), border: .clear,
                                               cornerRadius: VoltaMetrics.cornerRadius)
}

/// One choice in a select: the value it sets and the label it shows.
public struct SelectOption<Value: Hashable>: Hashable {
    public let value: Value
    public let label: String
    public init(_ value: Value, _ label: String) { self.value = value; self.label = label }

    /// The label shown for the current selection. A value with no option (for example a
    /// record that was removed) shows the placeholder rather than a blank field.
    public static func label(for selection: Value, in options: [SelectOption<Value>], placeholder: String = "") -> String {
        options.first { $0.value == selection }?.label ?? placeholder
    }
}

/// Options for the selects on the native screens, built from the records a task file holds.
public enum SelectChoices {
    /// One option per record, labelled with `label`.
    public static func records<Record>(_ records: [Record], id: KeyPath<Record, Int>, label: KeyPath<Record, String>) -> [SelectOption<Int>] {
        records.map { SelectOption($0[keyPath: id], $0[keyPath: label]) }
    }

    /// For a choice that may be left empty: `none` (selected by `nil`) first, then one option per record.
    public static func optional<Record>(none: String, _ records: [Record], id: KeyPath<Record, Int>, label: KeyPath<Record, String>) -> [SelectOption<Int?>] {
        [SelectOption<Int?>(nil, none)] + records.map { SelectOption(Optional($0[keyPath: id]), $0[keyPath: label]) }
    }

    /// For the board filters, which hold a string: `"all"`, `"unassigned"`, or a record's id as text.
    public static func filter<Record>(all: String, unassigned: String, _ records: [Record], id: KeyPath<Record, Int>, label: KeyPath<Record, String>) -> [SelectOption<String>] {
        [SelectOption("all", all), SelectOption("unassigned", unassigned)] + records.map { SelectOption(String($0[keyPath: id]), $0[keyPath: label]) }
    }
}
