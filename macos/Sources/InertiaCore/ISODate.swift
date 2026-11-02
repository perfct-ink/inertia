import Foundation

/// The `YYYY-MM-DD` calendar dates task files store. One definition checks them for the
/// file's own validation and for the date fields in the native editors.
public enum ISODate {
    /// True for a real calendar date written as `YYYY-MM-DD` (no `2026-02-30`, no `2026-2-3`).
    public static func isValid(_ value: String) -> Bool {
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian); formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"; formatter.isLenient = false
        guard value.count == 10, let parsed = formatter.date(from: value) else { return false }
        return formatter.string(from: parsed) == value
    }
}
