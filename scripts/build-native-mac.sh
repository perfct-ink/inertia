#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
swift build --package-path macos -c release
BIN_DIR=$(swift build --package-path macos -c release --show-bin-path)
APP=macos/dist/Inertia.app
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/Inertia" "$APP/Contents/MacOS/Inertia"
cp frontend/build/icon.icns "$APP/Contents/Resources/icon.icns"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.inertia.native</string>
<key>CFBundleName</key><string>Inertia</string>
<key>CFBundleDisplayName</key><string>Inertia</string>
<key>CFBundleExecutable</key><string>Inertia</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>icon</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
printf 'Built %s\n' "$APP"
