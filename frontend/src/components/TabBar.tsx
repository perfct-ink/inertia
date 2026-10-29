import { Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { X, FileText, Table as TableIcon } from 'lucide-react'
import { useTabsStore } from '@/store/tabs'

export default function TabBar() {
  const navigate = useNavigate()
  const { tabs, activeId, setActive, closeTab } = useTabsStore()

  if (tabs.length === 0) return null

  function handleClose(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const next = closeTab(id)
    if (next) navigate(next.path)
    else navigate('/workspace')
  }

  return (
    <div className="flex items-end border-b bg-muted/30 overflow-x-auto shrink-0 h-11">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 h-full border-r text-sm shrink-0 max-w-[160px] relative transition-colors ${
              active
                ? 'bg-background text-foreground shadow-[inset_0_2px_0_hsl(var(--primary))]'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <button
              onClick={() => { setActive(tab.id); navigate(tab.path) }}
              aria-current={active ? 'page' : undefined}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-2"
            >
              {tab.docType === 'table'
                ? <Database className="w-3.5 h-3.5 shrink-0 opacity-60" />
                : tab.docType === 'spreadsheet'
                ? <TableIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                : <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
              }
              <span className="truncate">{tab.title}</span>
            </button>
            <button
              aria-label={`Close ${tab.title}`}
              onClick={(e) => handleClose(e, tab.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
