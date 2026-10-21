import XCTest
@testable import InertiaCore

final class VoltaPaletteTests: XCTestCase {
    private func assertRGB(_ hsl: HSL, _ expected: (Double, Double, Double), file: StaticString = #filePath, line: UInt = #line) {
        let rgb = hsl.rgb
        XCTAssertEqual(rgb.red, expected.0, accuracy: 0.002, file: file, line: line)
        XCTAssertEqual(rgb.green, expected.1, accuracy: 0.002, file: file, line: line)
        XCTAssertEqual(rgb.blue, expected.2, accuracy: 0.002, file: file, line: line)
    }

    func testHSLConvertsLikeCSS() {
        assertRGB(HSL(0, 0, 100), (1, 1, 1))
        assertRGB(HSL(0, 0, 0), (0, 0, 0))
        assertRGB(HSL(0, 100, 50), (1, 0, 0))
        assertRGB(HSL(120, 100, 50), (0, 1, 0))
        assertRGB(HSL(240, 100, 50), (0, 0, 1))
        // Inertia's teal accent, hsl(174deg 72% 32%) = rgb(23, 140, 129).
        assertRGB(VoltaPalette.accent.light, (23.0 / 255, 140.0 / 255, 129.0 / 255))
    }

    func testTokenPicksLightOrDark() {
        XCTAssertEqual(VoltaPalette.base.value(dark: false), HSL(0, 0, 100))
        XCTAssertEqual(VoltaPalette.base.value(dark: true), HSL(220, 13, 9))
    }

    func testDangerIsTheSameInBothAppearances() {
        XCTAssertEqual(VoltaPalette.danger.light, VoltaPalette.danger.dark)
    }
}
