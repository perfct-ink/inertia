// Joins truthy class names: classNames('ui-button', active && 'ui-button--active', className).
export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
