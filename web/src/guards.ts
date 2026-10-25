/**
 * Amin #5199 on the web: no copying, cutting, dragging out or long-press menu anywhere in the app. Typing and pasting
 * into fields still work. (A browser cannot stop screenshots; Amin was told, #5183.)
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
        // fields: typing and caret moves need selectstart; copy/cut/menu stay closed there too
        if (field && name === 'selectstart') return
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
