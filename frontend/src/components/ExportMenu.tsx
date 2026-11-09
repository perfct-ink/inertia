import { Download } from 'lucide-react'
import { Button, Menu, type MenuItem } from '@/components/ui'
import { EXPORT_FORMATS, type ExportFormat } from '@/data/exportFormat'

interface ExportMenuProps {
  // Called with the format the person picked; the caller downloads the file.
  onExport: (format: ExportFormat) => void
  // Nothing to export yet: the button stays, switched off.
  disabled?: boolean
  // Classes for the button, so it matches the toolbar it sits in.
  className?: string
  iconClassName?: string
  // Opens the list towards the left, for a toolbar at the right of the screen.
  alignEnd?: boolean
}

// "Export" with a choice of CSV or Excel. The file formats are listed in
// data/exportFormat.ts; downloading is util/download.ts downloadRows.
export default function ExportMenu({ onExport, disabled, className, iconClassName, alignEnd }: ExportMenuProps) {
  const trigger = (
    <>
      <Download className={iconClassName} aria-hidden="true" />
      Export
    </>
  )
  if (disabled) return <Button disabled className={className}>{trigger}</Button>
  const items: MenuItem[] = EXPORT_FORMATS.map((format) => ({
    key: format.key,
    label: `${format.label} (.${format.extension})`,
    onSelect: () => onExport(format.key),
  }))
  return <Menu label="Export" items={items} triggerClassName={className} alignEnd={alignEnd}>{trigger}</Menu>
}
