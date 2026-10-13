import SwiftUI

struct AppLogo: View {
    var size: CGFloat = 72

    var body: some View {
        Image(nsImage: NSImage(named: "logo") ?? NSApp.applicationIconImage)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityLabel("Inertia logo")
    }
}
