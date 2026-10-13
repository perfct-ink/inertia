import type { CSSProperties } from 'react'

// Thin drag region for the macOS traffic light area only. Must stay
// narrow: -webkit-app-region hit-testing happens at the Chromium/OS layer,
// ignoring pointer-events, so a full-width strip here (it previously used
// `right: 0`, covering the whole window) swallowed clicks on anything
// beneath it — e.g. most of the tab bar, which sits flush with the top of
// the window with no title-bar spacer above it.
export default function TitleBarDragRegion() {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron')
  if (!isElectron) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '80px',
        height: '28px',
        WebkitAppRegion: 'drag',
        zIndex: 9999,
        pointerEvents: 'none',
      } as CSSProperties}
    />
  )
}
