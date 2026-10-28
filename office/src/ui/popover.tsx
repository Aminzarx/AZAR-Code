/**
 * A small anchored layer (KSS-UI-MODAL-001 §38-40: a short contextual choice is a popover, not a modal).
 * Opens under its trigger, or above it when there is more room there; closes on Escape, Tab, an outside click, or a choice;
 * focus returns to the trigger.
 * MSG-REQ-A23: the layer is drawn on <body> with fixed coordinates, so a scrolling or clipped parent (the chat thread)
 * can never cut it off or slide it under the next message.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6, EDGE = 8;
const TABBABLE = 'a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
export function focusByTypeahead(e: { key: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean; preventDefault: () => void }, items: HTMLElement[], search: { value: string; at: number }) {
  if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.altKey || e.metaKey || !items.length) return;
  const normalize = (s: string) => s.normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\u200c/g, ' ').trim().toLocaleLowerCase('fa');
  const key = normalize(e.key), now = Date.now();
  search.value = now - search.at > 700 || search.value === key ? key : search.value + key; search.at = now;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const start = search.value.length === 1 ? at + 1 : Math.max(0, at);
  const ordered = [...items.slice(start), ...items.slice(0, start)];
  const found = ordered.find(item => normalize(item.textContent || '').startsWith(search.value));
  if (found) { e.preventDefault(); found.focus(); }
}

export function Popover({ trigger, children, label, align = 'start', width = 260, anchorClass, disabled = false }: {
  trigger: (p: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  children: (close: () => void) => ReactNode; label: string; align?: 'start' | 'end'; width?: number | 'trigger'; anchorClass?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef({ value: '', at: 0 });
  const close = () => { setOpen(false); btn.current?.focus(); };
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  // place against the trigger: inline start/end edge, below or above, kept inside the viewport
  const place = () => {
    const b = btn.current, el = box.current;
    if (!b || !el) return;
    const r = b.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    const rtl = getComputedStyle(b).direction === 'rtl';
    if (width === 'trigger') el.style.inlineSize = Math.max(r.width, 200) + 'px';   // a drop-down field: as wide as the field
    const w = Math.min(el.offsetWidth, vw - 2 * EDGE);
    const alignRight = rtl ? align === 'start' : align === 'end';
    const left = Math.max(EDGE, Math.min((alignRight ? r.right - w : r.left), vw - w - EDGE));
    const below = vh - r.bottom - GAP - EDGE, above = r.top - GAP - EDGE;
    const h = el.scrollHeight;
    const up = h > below && above > below;
    el.style.left = left + 'px';
    el.style.maxBlockSize = Math.min(380, up ? above : below) + 'px';
    if (up) { el.style.top = ''; el.style.bottom = (vh - r.top + GAP) + 'px'; }
    else { el.style.bottom = ''; el.style.top = (r.bottom + GAP) + 'px'; }
    el.style.visibility = 'visible';
  };
  useLayoutEffect(() => { if (open) place(); });

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') {
        // The portal is last in body, but Tab order belongs beside its original trigger.
        const scope = btn.current?.closest('[role="dialog"][aria-modal="true"],dialog[open]') || document;
        const items = [...scope.querySelectorAll<HTMLElement>(TABBABLE)].filter(x => x.tabIndex >= 0 && x.getClientRects().length && !box.current?.contains(x) && !x.closest('[inert],[hidden]'));
        const at = items.indexOf(btn.current!); const index = at + (e.shiftKey ? -1 : 1);
        const to = items[index] || (scope !== document ? items[(index + items.length) % items.length] : undefined);
        e.stopPropagation();
        if (to) { e.preventDefault(); setOpen(false); to.focus(); }
        else { btn.current?.focus(); setOpen(false); } // allow browser/outer dialog to continue at the boundary
      } else if (!e.defaultPrevented && (e.target as HTMLElement).closest('[role="menu"]')) {
        const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || [])];
        const at = items.indexOf(document.activeElement as HTMLElement);
        const to = e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
        if (to !== null && items.length) { e.preventDefault(); items[(to + items.length) % items.length]?.focus(); }
        else focusByTypeahead(e, items, search.current);
      }
    };
    const move = () => place();
    document.addEventListener('mousedown', down);
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    const el = box.current;
    el?.addEventListener('keydown', key);
    search.current = { value: '', at: 0 };
    (el?.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') || el?.querySelector<HTMLElement>('button:not(:disabled), [tabindex="0"], input') || el)?.focus();
    return () => {
      document.removeEventListener('mousedown', down); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true);
      el?.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <span className={'pop-anchor' + (anchorClass ? ' ' + anchorClass : '')} onKeyDown={e => {
      if (e.target === btn.current && !open && !disabled && !e.defaultPrevented && ['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setOpen(true); }
    }}>
      {trigger({ open, toggle: () => { if (!disabled) setOpen((o) => !o); }, ref: btn })}
      {open && createPortal(
        <div ref={box} className="pop" role="dialog" aria-label={label} tabIndex={-1} style={{ inlineSize: width === 'trigger' ? undefined : width, visibility: 'hidden' }}
          onSubmit={(e) => e.stopPropagation()}>{children(close)}</div>, document.body)}
    </span>
  );
}

/** A menu of actions inside a popover. */
export function MenuItem({ icon, children, onClick, danger, disabled, hint }: {
  icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; hint?: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const button = ref.current;
    if (button?.closest('[role="menu"]')) button.setAttribute('role', 'menuitem');
  }, []);
  return (
    <button ref={ref} type="button" className={'menu-item' + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled}>
      {icon}<span className="mi-text">{children}{hint && <span className="caption" style={{ display: 'block' }}>{hint}</span>}</span>
    </button>
  );
}
