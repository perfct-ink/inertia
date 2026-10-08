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
    <div className="flex items-end border-b bg-muted/10 overflow-x-auto shrink-0 h-9">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            onClick={() => { setActive(tab.id); navigate(tab.path) }}
            className={`group flex items-center gap-1.5 px-3 h-full border-r text-sm shrink-0 max-w-[160px] relative transition-colors ${
              active
                ? 'bg-background text-foreground border-b-background -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {tab.docType === 'table'
              ? <Database className="w-3.5 h-3.5 shrink-0 opacity-60" />
              : tab.docType === 'spreadsheet'
              ? <TableIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
              : <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
            }
            <span className="truncate">{tab.title}</span>
            <span
              onClick={(e) => handleClose(e, tab.id)}
              className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
