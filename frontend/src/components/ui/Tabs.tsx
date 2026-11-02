import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { Button } from './Button'
import { classNames } from './classNames'
import './Tabs.scss'

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  // What the tabs choose between ("View", "Group by"), read out with the group.
  label: string
}

// A row of Tab buttons that switch what a page shows (List / Timeline).
export function Tabs({ label, className, ...props }: TabsProps) {
  return <div {...props} role="group" aria-label={label} className={classNames('ui-tabs', className)} />
}

type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // The tab for the view that is showing.
  active: boolean
}

// One choice in a Tabs row. It is a toggle button (aria-pressed), not a
// tablist: the page re-renders or navigates, there is no panel to point at.
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { active, className, ...props }, ref
) {
  return <Button {...props} ref={ref} aria-pressed={active} className={classNames('ui-tab', active && 'ui-tab--active', className)} />
})
