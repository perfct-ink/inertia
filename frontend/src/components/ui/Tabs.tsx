import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { Button } from './Button'
import { classNames } from './classNames'
import './Tabs.scss'

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  // What the tabs choose between ("View", "Group by"), read out with the group.
  label: string
  // `segmented`: the choices sit in a shaded tray and the chosen one is raised.
  // `outlined`: bordered boxes that share the row's width, for picking one value
  // in a form (a type) rather than switching what a page shows.
  variant?: 'segmented' | 'outlined'
}

// A row of Tab buttons that switch what a page shows (List / Timeline).
export function Tabs({ label, variant, className, ...props }: TabsProps) {
  return <div {...props} role="group" aria-label={label} className={classNames('ui-tabs', variant && `ui-tabs--${variant}`, className)} />
}

type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // The tab for the view that is showing.
  active: boolean
}

// One choice in a Tabs row. It is a toggle button (aria-pressed), not a
// tablist: the page re-renders or navigates, there is no panel to point at.
// It never submits a form (type="button" unless told otherwise).
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { active, className, type = 'button', ...props }, ref
) {
  return <Button {...props} ref={ref} type={type} aria-pressed={active} className={classNames('ui-tab', active && 'ui-tab--active', className)} />
})
