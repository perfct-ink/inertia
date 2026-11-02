// Opens the browser's print dialog for the Gantt chart alone (choose "Save as PDF"
// there). A body class lets the print stylesheet in GanttPane.scss hide the rest of
// the page; it is removed when printing ends.
export function printGantt() {
  document.body.classList.add('gantt_printing')
  const done = () => { document.body.classList.remove('gantt_printing'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
}
