/**
 * Amin #5199 on the web: no copying, cutting, dragging out or long-press menu on the page itself. Fields are free:
 * copy, cut, paste and their menu work there (Navid, 2026-10-26). (A browser cannot stop screenshots; Amin was told, #5183.)
 */
export function installGuards(): void {
  const style = document.createElement('style')
  style.textContent = `
    * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    input, textarea { -webkit-user-select: text; user-select: text; }
    img { -webkit-user-drag: none; pointer-events: none; }
  `
  document.head.appendChild(style)
  const block = (event: Event) => event.preventDefault()
  for (const name of ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']) {
    document.addEventListener(
      name,
      (event) => {
        const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
        // fields: copy, cut, paste, the menu and selecting all work (Navid, 2026-10-26)
        if (field && name !== 'dragstart') return
        block(event)
      },
      { capture: true }
    )
  }
  // no printing the page (Ctrl+P / the browser menu) and no saving it
  window.addEventListener('beforeprint', () => document.body.style.setProperty('visibility', 'hidden'))
  window.addEventListener('afterprint', () => document.body.style.removeProperty('visibility'))
  document.addEventListener(
    'keydown',
    (event) => {
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && (key === 'p' || key === 's')) event.preventDefault()
    },
    { capture: true }
  )
}
