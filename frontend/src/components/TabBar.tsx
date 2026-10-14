import { Button, classNames } from '@/components/ui'
import { Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { X, FileText, Table as TableIcon } from 'lucide-react'
import { useTabsStore } from '@/store/tabs'
import './TabBar.scss'

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
    <div className="view-tab_bar">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <div key={tab.id} className={classNames('tab_bar-tab', active && 'tab_bar-tab--active')}>
            <Button
              onClick={() => { setActive(tab.id); navigate(tab.path) }}
              aria-current={active ? 'page' : undefined}
              className="tab_bar-select"
            >
              {tab.docType === 'table'
                ? <Database className="tab_bar-icon" />
                : tab.docType === 'spreadsheet'
                ? <TableIcon className="tab_bar-icon" />
                : <FileText className="tab_bar-icon" />
              }
              <span className="tab_bar-label">{tab.title}</span>
            </Button>
            <Button
              onClick={(e) => handleClose(e, tab.id)}
              aria-label={`Close ${tab.title}`}
              title="Close"
              className="tab_bar-close"
            >
              <X className="tab_bar-close_icon" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
