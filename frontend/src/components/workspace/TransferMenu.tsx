import { ArrowRightLeft, MoreVertical } from 'lucide-react'
import { Menu, classNames, type MenuItem } from '@/components/ui'
import { useTransferTargets } from '@/hooks/useTransferTargets'
import { useTransferStore } from '@/store/transfer'
import { TRANSFER_MODES, transferMenuLabel, type TransferItem } from '@/data/transfer'
import './TransferMenu.scss'

interface TransferMenuProps {
  // The document or folder this menu is for (documentTransfer / folderTransfer).
  item: TransferItem
  // Only a ⋮ button, for a row in a list; otherwise "Move or copy" with an icon.
  compact?: boolean
  variant?: 'ghost' | 'unstyled'
  triggerClassName?: string
}

// "Move to Space…" and "Copy to Space…" for one document or folder, wherever it
// is shown outside the sidebar tree. It opens the same dialog as the tree's
// menus (TransferHost, mounted in the sidebar) and is a plain button, so it
// works on a phone. Nothing is rendered when there is no other Space to write in.
export function TransferMenu({ item, compact = false, variant = 'ghost', triggerClassName }: TransferMenuProps) {
  const open = useTransferStore((s) => s.open)
  const { canTransfer } = useTransferTargets()
  if (!canTransfer) return null

  const items: MenuItem[] = TRANSFER_MODES.map((mode) => ({
    key: mode,
    label: transferMenuLabel(mode),
    onSelect: () => open({ mode, ...item }),
  }))

  return (
    <Menu
      label={compact ? `More actions for ${item.name}` : 'Move or copy to another Space'}
      items={items}
      triggerVariant={variant}
      triggerClassName={classNames('transfer_menu-trigger', triggerClassName)}
      alignEnd
    >
      {compact
        ? <MoreVertical className="transfer_menu-icon" aria-hidden="true" />
        : <><ArrowRightLeft className="transfer_menu-icon" aria-hidden="true" /><span className="transfer_menu-text">Move or copy</span></>}
    </Menu>
  )
}
