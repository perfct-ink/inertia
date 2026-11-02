import Foundation

/// Sizes, radii, motion and type from Volta as the React app uses them
/// (`frontend/src/styles/_volta.scss`, `_tokens.scss`, `_typography.scss`).
/// One CSS pixel is one point. `space(n)` in the stylesheets is `n * 4`.
public enum VoltaMetrics {
    /// Volta's single corner radius (`radius('default' | 'md' | 'lg' | 'xl')`).
    public static let cornerRadius = 4.0
    /// Checkbox corners (`radius('sm')`).
    public static let smallCornerRadius = 2.0
    /// Every state change eases for 150ms (`--v-anim-speed`).
    public static let animationDuration = 0.15
    /// Text fields, selects and the primary, secondary and destructive buttons are at least this tall (`space(10)`).
    public static let minimumControlHeight = 40.0
    /// Disabled controls fade to this opacity.
    public static let disabledOpacity = 0.5
    /// Focus ring: a 2pt gap of the background color, then a 2pt accent ring (`focus-ring`).
    public static let focusGap = 2.0
    public static let focusRingWidth = 2.0
    /// Checkboxes and radios are drawn at this size (`space(4)`).
    public static let checkableSize = 16.0
    /// The dot inside a selected radio, about 28% of the corner-to-corner radius.
    public static let radioDotDiameter = 6.0
    /// A text area is at least this tall (`space(24)`).
    public static let textAreaMinimumHeight = 96.0
    /// The select chevron's room on the right (`$select-chevron-room`, `space(6)`).
    public static let selectChevronRoom = 24.0

    public static func space(_ steps: Double) -> Double { steps * 4 }
    /// Field padding: 8pt above and below, 12pt either side.
    public static let fieldPadding = Padding(horizontal: space(3), vertical: space(2))

    public struct Padding: Equatable {
        public let horizontal: Double
        public let vertical: Double
    }
}

/// Volta's type scale: font size and line height in points.
public enum VoltaTextSize: CaseIterable {
    case xs, sm, base, lg, xl, twoXL, threeXL

    public var size: Double {
        switch self {
        case .xs: return 12
        case .sm: return 14
        case .base: return 16
        case .lg: return 18
        case .xl: return 20
        case .twoXL: return 24
        case .threeXL: return 30
        }
    }
    public var lineHeight: Double {
        switch self {
        case .xs: return 16
        case .sm: return 20
        case .base: return 24
        case .lg, .xl: return 28
        case .twoXL: return 32
        case .threeXL: return 36
        }
    }
}

public enum VoltaFontWeight: Equatable {
    case regular, medium, semibold
}
