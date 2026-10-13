import AppKit

guard CommandLine.arguments.count == 2 else {
    FileHandle.standardError.write(Data("Usage: stop-native-mac.swift <app bundle path>\n".utf8))
    exit(1)
}

let target = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL.resolvingSymlinksInPath()
let apps = NSWorkspace.shared.runningApplications.filter {
    $0.bundleURL?.standardizedFileURL.resolvingSymlinksInPath() == target
}

for app in apps {
    print("Stopping development Inertia (PID \(app.processIdentifier))...")
    _ = app.terminate()
}

func waitForExit(seconds: TimeInterval) {
    let deadline = Date().addingTimeInterval(seconds)
    while apps.contains(where: { !$0.isTerminated }) && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
}

waitForExit(seconds: 5)
for app in apps where !app.isTerminated {
    print("Force-stopping development Inertia (PID \(app.processIdentifier))...")
    _ = app.forceTerminate()
}
waitForExit(seconds: 2)

if apps.contains(where: { !$0.isTerminated }) {
    FileHandle.standardError.write(Data("Could not stop the development app; build canceled.\n".utf8))
    exit(1)
}
