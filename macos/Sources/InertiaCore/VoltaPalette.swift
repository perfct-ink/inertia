import Foundation

/// Volta's color tokens as set by Inertia's theme (`frontend/src/styles/_theme.scss`),
/// light and dark. Keep these in step with that file; the React app reads the same
/// values as CSS variables. The names follow the React semantic colors:
/// `baseSubtle` is `--border`, `baseLessSubtle` is `--border-strong`,
/// `baseMoreSubtle` is `--muted`, `trim` is `--foreground`, `trimSubtle` is
/// `--muted-foreground` and `accentSubtle` is `--accent`.
public struct HSL: Equatable {
    public let hue: Double        // degrees, 0...360
    public let saturation: Double // percent, 0...100
    public let lightness: Double  // percent, 0...100
    public init(_ hue: Double, _ saturation: Double, _ lightness: Double) {
        self.hue = hue; self.saturation = saturation; self.lightness = lightness
    }

    /// Red, green and blue in 0...1 (the CSS hsl() conversion).
    public var rgb: (red: Double, green: Double, blue: Double) {
        let s = saturation / 100, l = lightness / 100
        let a = s * min(l, 1 - l)
        func channel(_ n: Double) -> Double {
            let k = (n + hue / 30).truncatingRemainder(dividingBy: 12)
            return l - a * max(-1, min(k - 3, 9 - k, 1))
        }
        return (channel(0), channel(8), channel(4))
    }
}

/// An sRGB color, each channel 0...1.
public struct RGBA: Equatable {
    public let red: Double
    public let green: Double
    public let blue: Double
    public let alpha: Double
    public init(red: Double, green: Double, blue: Double, alpha: Double = 1) {
        self.red = red; self.green = green; self.blue = blue; self.alpha = alpha
    }
    public init(_ hsl: HSL) {
        let rgb = hsl.rgb
        self.init(red: rgb.red, green: rgb.green, blue: rgb.blue)
    }
    /// Whole-number channels, as written in CSS (`#ef4444` is 239, 68, 68).
    public init(red255 r: Double, green255 g: Double, blue255 b: Double) {
        self.init(red: r / 255, green: g / 255, blue: b / 255)
    }
    public static let white = RGBA(red: 1, green: 1, blue: 1)
    public static let black = RGBA(red: 0, green: 0, blue: 0)

    /// CSS `color-mix(in srgb, self, other <amount>)`: `amount` (0...1) is how much of `other` is mixed in.
    public func mixed(with other: RGBA, amount: Double) -> RGBA {
        let t = min(max(amount, 0), 1)
        return RGBA(red: red + (other.red - red) * t, green: green + (other.green - green) * t,
                    blue: blue + (other.blue - blue) * t, alpha: alpha + (other.alpha - alpha) * t)
    }
}

public struct VoltaToken: Equatable {
    public let light: HSL
    public let dark: HSL
    public init(light: HSL, dark: HSL) { self.light = light; self.dark = dark }
    public func value(dark isDark: Bool) -> HSL { isDark ? dark : light }
}

public enum VoltaPalette {
    public static let accent = VoltaToken(light: HSL(217, 72, 32), dark: HSL(217, 72, 42))
    public static let accentHover = VoltaToken(light: HSL(217, 72, 27), dark: HSL(217, 72, 36))
    public static let accentSubtle = VoltaToken(light: HSL(217, 30, 90), dark: HSL(217, 15, 18))
    public static let accentForeground = VoltaToken(light: HSL(217, 72, 20), dark: HSL(217, 60, 75))
    public static let base = VoltaToken(light: HSL(0, 0, 100), dark: HSL(222, 32, 10))
    public static let baseSubtle = VoltaToken(light: HSL(217, 20, 88), dark: HSL(222, 22, 22))
    public static let baseLessSubtle = VoltaToken(light: HSL(217, 20, 78), dark: HSL(222, 18, 32))
    public static let baseMoreSubtle = VoltaToken(light: HSL(217, 20, 94), dark: HSL(222, 26, 15))
    public static let trim = VoltaToken(light: HSL(210, 20, 16), dark: HSL(0, 0, 95))
    public static let trimSubtle = VoltaToken(light: HSL(200, 10, 40), dark: HSL(220, 12, 68))
    public static let danger = VoltaToken(light: HSL(0, 72, 51), dark: HSL(0, 72, 51))
    /// `--card`: white in light mode (it is `--v-color-base`), a step above the dark base in dark mode.
    public static let card = VoltaToken(light: HSL(0, 0, 100), dark: HSL(222, 28, 13))
}

/// A color a control draws with: a theme token, or one of the few fixed colors
/// the React styles use (`palette('white')`, `palette('red-500')`) that do not change with the theme.
public enum VoltaFill: Equatable {
    case clear
    case white
    /// Tailwind red-500 (`#ef4444`), the color of `FormError` text.
    case errorText
    case token(VoltaToken)
    /// `color-mix(in srgb, token, black <amount>)`: the destructive button's hover.
    case darkened(VoltaToken, by: Double)

    /// The color for the light or dark appearance. `clear` resolves to a fully transparent color.
    public func resolve(dark: Bool) -> RGBA {
        switch self {
        case .clear: return RGBA(red: 0, green: 0, blue: 0, alpha: 0)
        case .white: return .white
        case .errorText: return RGBA(red255: 239, green255: 68, blue255: 68)
        case .token(let token): return RGBA(token.value(dark: dark))
        case .darkened(let token, let amount): return RGBA(token.value(dark: dark)).mixed(with: .black, amount: amount)
        }
    }
}
