import './SharedScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function SharedScreen() {
  usePageTitle('Shared')
  return <div className="view-shared">Shared view</div>
}
