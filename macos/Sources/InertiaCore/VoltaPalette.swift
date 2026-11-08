import Foundation

/// Volta's color tokens as set by Inertia's theme (`frontend/src/styles/_theme.scss`),
/// light and dark: the default blue theme. Keep these in step with that file; the React
/// app reads the same values as CSS variables. (The web app's other colour themes and
/// its sidebar tints are not mirrored here.)
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

public struct VoltaToken: Equatable {
    public let light: HSL
    public let dark: HSL
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
    public static let card = VoltaToken(light: HSL(0, 0, 100), dark: HSL(222, 28, 13))
}
