import XCTest
@testable import InertiaCore

/// Volta parity: these values mirror `frontend/src/styles/_theme.scss`, `_volta.scss`,
/// `_tokens.scss` and the `ui-` control stylesheets. A change there needs a change here.
final class VoltaControlsTests: XCTestCase {
    private func assertEqual(_ a: RGBA, _ b: RGBA, accuracy: Double = 0.0001, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(a.red, b.red, accuracy: accuracy, file: file, line: line)
        XCTAssertEqual(a.green, b.green, accuracy: accuracy, file: file, line: line)
        XCTAssertEqual(a.blue, b.blue, accuracy: accuracy, file: file, line: line)
        XCTAssertEqual(a.alpha, b.alpha, accuracy: accuracy, file: file, line: line)
    }

    // MARK: Colors

    func testHSLConvertsLikeCSS() {
        assertEqual(RGBA(HSL(0, 0, 100)), .white)
        assertEqual(RGBA(HSL(0, 0, 0)), .black)
        // hsl(0 72% 51%): red 0.8628, green and blue 0.1572.
        assertEqual(RGBA(HSL(0, 72, 51)), RGBA(red: 0.8628, green: 0.1572, blue: 0.1572))
        // hsl(120 100% 50%) is pure green.
        assertEqual(RGBA(HSL(120, 100, 50)), RGBA(red: 0, green: 1, blue: 0))
    }

    func testThemeTokensMatchInertiasTealThemeInLightAndDark() {
        XCTAssertEqual(VoltaPalette.accent.light, HSL(174, 72, 32))
        XCTAssertEqual(VoltaPalette.accent.dark, HSL(174, 72, 42))
        XCTAssertEqual(VoltaPalette.accentHover.light, HSL(174, 72, 27))
        XCTAssertEqual(VoltaPalette.base.light, HSL(0, 0, 100))
        XCTAssertEqual(VoltaPalette.base.dark, HSL(220, 13, 9))
        XCTAssertEqual(VoltaPalette.trim.light, HSL(210, 20, 16))
        XCTAssertEqual(VoltaPalette.trimSubtle.light, HSL(200, 10, 40))
        XCTAssertEqual(VoltaPalette.trimSubtle.dark, HSL(180, 8, 67))
        XCTAssertEqual(VoltaPalette.card.dark, HSL(220, 13, 11))
        // The theme only sets one danger red; Volta's dark palette does not change it.
        XCTAssertEqual(VoltaPalette.danger.light, VoltaPalette.danger.dark)
        XCTAssertEqual(VoltaPalette.accent.value(dark: true), VoltaPalette.accent.dark)
        XCTAssertEqual(VoltaPalette.accent.value(dark: false), VoltaPalette.accent.light)
    }

    func testFillsResolve() {
        XCTAssertEqual(VoltaFill.clear.resolve(dark: false).alpha, 0)
        assertEqual(VoltaFill.white.resolve(dark: true), .white)
        assertEqual(VoltaFill.errorText.resolve(dark: false), RGBA(red255: 239, green255: 68, blue255: 68))
        assertEqual(VoltaFill.token(VoltaPalette.base).resolve(dark: false), .white)
        XCTAssertNotEqual(VoltaFill.token(VoltaPalette.base).resolve(dark: true), VoltaFill.token(VoltaPalette.base).resolve(dark: false))
    }

    func testDarkenedFillMixesInBlackLikeColorMix() {
        let danger = RGBA(VoltaPalette.danger.light)
        let darker = VoltaFill.darkened(VoltaPalette.danger, by: 0.15).resolve(dark: false)
        assertEqual(darker, RGBA(red: danger.red * 0.85, green: danger.green * 0.85, blue: danger.blue * 0.85))
        assertEqual(danger.mixed(with: .black, amount: 0), danger)
        assertEqual(danger.mixed(with: .black, amount: 1), .black)
        assertEqual(danger.mixed(with: .black, amount: 5), .black) // clamped
    }

    // MARK: Metrics

    func testMetricsMatchTheStylesheets() {
        XCTAssertEqual(VoltaMetrics.cornerRadius, 4)
        XCTAssertEqual(VoltaMetrics.animationDuration, 0.15, accuracy: 0.0001)
        XCTAssertEqual(VoltaMetrics.minimumControlHeight, 40)
        XCTAssertEqual(VoltaMetrics.space(10), 40)
        XCTAssertEqual(VoltaMetrics.space(24), VoltaMetrics.textAreaMinimumHeight)
        XCTAssertEqual(VoltaMetrics.fieldPadding, VoltaMetrics.Padding(horizontal: 12, vertical: 8))
        XCTAssertEqual(VoltaMetrics.checkableSize, 16)
    }

    func testTypeScale() {
        XCTAssertEqual(VoltaTextSize.sm.size, 14)
        XCTAssertEqual(VoltaTextSize.sm.lineHeight, 20)
        XCTAssertEqual(VoltaTextSize.base.size, 16)
        XCTAssertEqual(VoltaTextSize.twoXL.size, 24)
        XCTAssertEqual(VoltaTextSize.threeXL.lineHeight, 36)
        // Every step is bigger than the one before and leaves room for its text.
        let sizes = VoltaTextSize.allCases
        for (small, large) in zip(sizes, sizes.dropFirst()) { XCTAssertLessThan(small.size, large.size) }
        for step in sizes { XCTAssertGreaterThan(step.lineHeight, step.size) }
    }

    // MARK: Buttons

    func testPrimaryButton() {
        let rest = VoltaButtonSpec.make(.primary)
        XCTAssertEqual(rest.background, .token(VoltaPalette.accent))
        XCTAssertEqual(rest.foreground, .token(VoltaPalette.base))
        XCTAssertEqual(rest.minimumHeight, 40)
        XCTAssertEqual(rest.weight, .medium)
        XCTAssertEqual(rest.opacity, 1)
        XCTAssertEqual(VoltaButtonSpec.make(.primary, hovered: true).background, .token(VoltaPalette.accentHover))
    }

    func testSecondaryButtonStepsOneShadeOnHover() {
        let rest = VoltaButtonSpec.make(.secondary)
        XCTAssertEqual(rest.background, .token(VoltaPalette.card))
        XCTAssertEqual(rest.border, .token(VoltaPalette.baseSubtle))
        XCTAssertEqual(rest.foreground, .token(VoltaPalette.trimSubtle))
        let hover = VoltaButtonSpec.make(.secondary, hovered: true)
        XCTAssertEqual(hover.background, .token(VoltaPalette.accentSubtle))
        XCTAssertEqual(hover.border, .token(VoltaPalette.baseLessSubtle))
        XCTAssertEqual(hover.foreground, .token(VoltaPalette.trim))
    }

    func testGhostButtonIsCompactAndOnlyFillsOnHover() {
        let rest = VoltaButtonSpec.make(.ghost)
        XCTAssertEqual(rest.background, .clear)
        XCTAssertEqual(rest.minimumHeight, 0)
        XCTAssertEqual(rest.padding, VoltaMetrics.Padding(horizontal: 8, vertical: 4))
        XCTAssertEqual(rest.weight, .regular)
        XCTAssertEqual(VoltaButtonSpec.make(.ghost, hovered: true).background, .token(VoltaPalette.accentSubtle))
    }

    func testDestructiveButton() {
        let rest = VoltaButtonSpec.make(.destructive)
        XCTAssertEqual(rest.background, .token(VoltaPalette.danger))
        XCTAssertEqual(rest.foreground, .white)
        XCTAssertEqual(VoltaButtonSpec.make(.destructive, hovered: true).background, .darkened(VoltaPalette.danger, by: 0.15))
    }

    func testDisabledButtonFadesAndIgnoresHover() {
        for variant in VoltaVariant.allCases {
            let disabled = VoltaButtonSpec.make(variant, hovered: true, enabled: false)
            XCTAssertEqual(disabled.opacity, VoltaMetrics.disabledOpacity, "\(variant)")
            XCTAssertEqual(disabled.background, VoltaButtonSpec.make(variant, enabled: false).background, "\(variant)")
        }
    }

    func testHoverNeverChangesAButtonsSize() {
        for variant in VoltaVariant.allCases {
            let rest = VoltaButtonSpec.make(variant), hover = VoltaButtonSpec.make(variant, hovered: true)
            XCTAssertEqual(rest.minimumHeight, hover.minimumHeight)
            XCTAssertEqual(rest.padding, hover.padding)
            XCTAssertEqual(rest.weight, hover.weight)
            XCTAssertEqual(rest.textSize, hover.textSize)
        }
    }

    // MARK: Fields

    func testTextFieldIsAtLeastFortyPointsTall() {
        XCTAssertEqual(VoltaFieldSpec.make().minimumHeight, 40)
        XCTAssertEqual(VoltaFieldSpec.make(.select).minimumHeight, 40)
        XCTAssertEqual(VoltaFieldSpec.make(minimumHeight: 52).minimumHeight, 52)
    }

    func testFieldStates() {
        let rest = VoltaFieldSpec.make()
        XCTAssertEqual(rest.border, .token(VoltaPalette.baseSubtle))
        XCTAssertEqual(rest.background, .clear)
        XCTAssertNil(rest.ring)
        let hover = VoltaFieldSpec.make(hovered: true)
        XCTAssertEqual(hover.border, .token(VoltaPalette.baseLessSubtle))
        XCTAssertEqual(hover.background, .token(VoltaPalette.baseMoreSubtle))
        let focus = VoltaFieldSpec.make(hovered: true, focused: true)
        XCTAssertEqual(focus.border, .token(VoltaPalette.accent))
        XCTAssertEqual(focus.ring, .token(VoltaPalette.accent))
        XCTAssertEqual(focus.cornerRadius, 4)
    }

    func testInvalidFieldUsesDanger() {
        let invalid = VoltaFieldSpec.make(invalid: true)
        XCTAssertEqual(invalid.border, .token(VoltaPalette.danger))
        XCTAssertNil(invalid.ring)
        let focused = VoltaFieldSpec.make(focused: true, invalid: true)
        XCTAssertEqual(focused.border, .token(VoltaPalette.danger))
        XCTAssertEqual(focused.ring, .token(VoltaPalette.danger))
    }

    func testDisabledFieldFadesAndIgnoresHoverAndFocus() {
        let disabled = VoltaFieldSpec.make(hovered: true, focused: true, enabled: false)
        XCTAssertEqual(disabled.opacity, 0.5)
        XCTAssertEqual(disabled.border, .token(VoltaPalette.baseSubtle))
        XCTAssertEqual(disabled.background, .clear)
        XCTAssertNil(disabled.ring)
    }

    func testSelectRestsOnTheCardColor() {
        XCTAssertEqual(VoltaFieldSpec.make(.select).background, .token(VoltaPalette.card))
        XCTAssertEqual(VoltaFieldSpec.make(.select, hovered: true).background, .token(VoltaPalette.baseMoreSubtle))
    }

    // MARK: Checkbox and radio

    func testUncheckedCheckbox() {
        let box = VoltaCheckableSpec.make(.checkbox, checked: false)
        XCTAssertEqual(box.background, .token(VoltaPalette.base))
        XCTAssertEqual(box.border, .token(VoltaPalette.baseLessSubtle))
        XCTAssertNil(box.mark)
        XCTAssertEqual(box.size, 16)
        XCTAssertEqual(box.cornerRadius, 2)
        XCTAssertEqual(VoltaCheckableSpec.make(.checkbox, checked: false, hovered: true).border, .token(VoltaPalette.accent))
        XCTAssertEqual(VoltaCheckableSpec.make(.checkbox, checked: false, hovered: true).background, .token(VoltaPalette.base))
    }

    func testCheckedCheckboxFillsWithAccentAndShowsAWhiteMark() {
        let box = VoltaCheckableSpec.make(.checkbox, checked: true)
        XCTAssertEqual(box.background, .token(VoltaPalette.accent))
        XCTAssertEqual(box.border, .token(VoltaPalette.accent))
        XCTAssertEqual(box.mark, .white)
    }

    func testRadioIsRound() {
        XCTAssertEqual(VoltaCheckableSpec.make(.radio, checked: false).cornerRadius, VoltaMetrics.checkableSize / 2)
        XCTAssertEqual(VoltaCheckableSpec.make(.radio, checked: true).mark, .white)
    }

    func testCheckableFocusAndDisabled() {
        XCTAssertEqual(VoltaCheckableSpec.make(.checkbox, checked: false, focused: true).ring, .token(VoltaPalette.accent))
        let disabled = VoltaCheckableSpec.make(.checkbox, checked: true, hovered: true, focused: true, enabled: false)
        XCTAssertEqual(disabled.opacity, 0.5)
        XCTAssertNil(disabled.ring)
        XCTAssertEqual(VoltaCheckableSpec.make(.checkbox, checked: false, hovered: true, enabled: false).border, .token(VoltaPalette.baseLessSubtle))
    }

    // MARK: Surfaces and selects

    func testSurfaces() {
        XCTAssertEqual(VoltaSurfaceSpec.card.background, .token(VoltaPalette.card))
        XCTAssertEqual(VoltaSurfaceSpec.card.border, .token(VoltaPalette.baseSubtle))
        XCTAssertEqual(VoltaSurfaceSpec.card.cornerRadius, 4)
        XCTAssertEqual(VoltaSurfaceSpec.muted.background, .token(VoltaPalette.baseMoreSubtle))
    }

    func testSelectShowsTheSelectedLabelOrThePlaceholder() {
        let options = [SelectOption<Int?>(nil, "Unassigned"), SelectOption(1, "Ada"), SelectOption(2, "Grace")]
        XCTAssertEqual(SelectOption.label(for: nil, in: options), "Unassigned")
        XCTAssertEqual(SelectOption.label(for: 2, in: options), "Grace")
        // A removed record leaves the field showing the placeholder, not blank.
        XCTAssertEqual(SelectOption.label(for: 9, in: options, placeholder: "Choose"), "Choose")
        XCTAssertEqual(SelectOption.label(for: 9, in: options), "")
        XCTAssertEqual(SelectOption<String>.label(for: "a", in: []), "")
    }
}
