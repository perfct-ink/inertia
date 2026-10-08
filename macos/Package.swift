// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Inertia", platforms: [.macOS(.v14)],
    products: [.executable(name: "Inertia", targets: ["Inertia"])],
    targets: [
        .target(name: "InertiaCore"),
        .executableTarget(name: "Inertia", dependencies: ["InertiaCore"]),
        .testTarget(name: "InertiaCoreTests", dependencies: ["InertiaCore"], resources: [.copy("Fixtures")])
    ]
)
