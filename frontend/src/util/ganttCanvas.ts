import { EXPORT_ROW_HEIGHT, ganttExportLayout, ganttFileName, type GanttExportLayout } from '@/data/ganttExport'
import type { Scheduled } from '@/data/schedule'

interface Palette { background: string; text: string; muted: string; bar: string; done: string; critical: string; today: string }

// The page's own colours (so the image matches light or dark), with fallbacks.
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    background: token('--v-color-base', '#ffffff'),
    text: token('--v-color-trim', '#111111'),
    muted: token('--v-color-trim-less-subtle', '#808080'),
    bar: token('--v-accent-subtle', '#cfe8e5'),
    done: token('--v-accent', '#0d9488'),
    critical: token('--v-color-danger', '#e30000'),
    today: token('--v-color-danger', '#e30000'),
  }
}

// Paints the layout onto a 2D context: month header, row labels, bars with the
// done part filled, critical outlines, and today's line.
export function paintGantt(ctx: CanvasRenderingContext2D, layout: GanttExportLayout, palette: Palette) {
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.font = '12px -apple-system, system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = palette.muted
  layout.months.forEach((m) => {
    ctx.fillText(m.label, m.x + 4, 16)
    ctx.fillRect(m.x, 4, 1, layout.height - 8)
  })

  layout.rows.forEach((row) => {
    const middle = row.y + EXPORT_ROW_HEIGHT / 2
    ctx.fillStyle = palette.text
    const label = row.title.length > 34 ? `${row.title.slice(0, 33)}…` : row.title
    ctx.fillText(label, 8 + row.depth * 14, middle)
    if (!row.bar) return
    ctx.fillStyle = palette.bar
    ctx.fillRect(row.bar.x, row.y + 6, row.bar.width, EXPORT_ROW_HEIGHT - 12)
    ctx.fillStyle = palette.done
    ctx.fillRect(row.bar.x, row.y + 6, row.bar.doneWidth, EXPORT_ROW_HEIGHT - 12)
    if (row.critical) {
      ctx.strokeStyle = palette.critical
      ctx.lineWidth = 2
      ctx.strokeRect(row.bar.x, row.y + 6, row.bar.width, EXPORT_ROW_HEIGHT - 12)
    }
  })

  if (layout.todayX !== null) {
    ctx.fillStyle = palette.today
    ctx.fillRect(layout.todayX, 20, 1.5, layout.height - 24)
  }
}

// Draws the chart to an off-screen canvas (twice the size, for sharpness) and
// downloads it as a PNG. Rejects if the browser can't produce the image.
export function exportGanttPng(items: Scheduled[], folderName: string): Promise<void> {
  const layout = ganttExportLayout(items)
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = layout.width * scale
  canvas.height = layout.height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('This browser cannot draw the chart image.'))
  ctx.scale(scale, scale)
  paintGantt(ctx, layout, readPalette())
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('The chart image could not be created.')); return }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = ganttFileName(folderName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}

