/**
 * A drop-down field drawn like the panel's menus (MSG-REQ-A30, Amin: «منوی فیلدهای کشویی خیلی ساده‌اند»). The browser's
 * own <select> list cannot be styled, so this is a button with a listbox in a popover (COMP-001 §37A.2 menus).
 * It takes the same children as <select> (<option>, <optgroup>) and calls onChange with { target: { value } },
 * so it drops in where a <select> was.
 * Keyboard: Enter, Space or ↓ opens; ↑ ↓ Home End move; Enter or Space chooses; Esc or Tab closes.
 */
import { Children, isValidElement, useRef, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { Popover, focusByTypeahead } from './popover';
import { Icon } from './icons';

interface Opt { value: string; label: ReactNode; disabled?: boolean; group?: string }
type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

function options(children: ReactNode, group?: string, parentDisabled = false): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (ch) => {
    if (!isValidElement(ch)) return;
    const el = ch as ReactElement<OptionProps & { label?: string }>;
    if (el.type === 'optgroup') out.push(...options(el.props.children, el.props.label, parentDisabled || !!el.props.disabled));
    else if (el.type === 'option') out.push({ value: String(el.props.value ?? ''), label: el.props.children, disabled: parentDisabled || el.props.disabled, group });
  });
  return out;
}

export function Select({ value, onChange, children, className, style, disabled, autoFocus, id, ...aria }: {
  value: string | number; onChange: (e: { target: { value: string } }) => void; children: ReactNode;
  className?: string; style?: CSSProperties; disabled?: boolean; autoFocus?: boolean; id?: string;
  'aria-label'?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; 'aria-required'?: boolean;
}) {
  const opts = options(children);
  const cur = opts.find((o) => o.value === String(value));
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ value: '', at: 0 });
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)') || [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
    if (to === null) { focusByTypeahead(e, items, search.current); return; }
    e.preventDefault();
    search.current = { value: '', at: 0 };
    items[(to + items.length) % items.length]?.focus();
  };
  return (
    <Popover disabled={disabled} label={aria['aria-label'] || 'انتخاب'} width="trigger" anchorClass={'sel-anchor' + (style?.inlineSize === 'auto' || /ws/.test(className || '') ? ' inline' : '')} trigger={({ toggle, ref, open }) =>
      <button ref={ref} id={id} type="button" className={'kss-input select-btn ' + (className || '').split(/\s+/).filter(name => name !== 'select' && name !== 'input' && name !== 'kss-select').join(' ').trim()} style={style}
        disabled={disabled} autoFocus={autoFocus} aria-haspopup="listbox" aria-expanded={open} {...aria}
        onClick={() => { search.current = { value: '', at: 0 }; toggle(); }} onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); search.current = { value: '', at: 0 }; toggle(); } }}>
        <span className="sel-v">{cur ? cur.label : <span className="faint">انتخاب…</span>}</span>
        <Icon name="expand" size={18} className="sel-chev" />
      </button>}>
      {(close) => {
        let lastGroup: string | undefined;
        return <div ref={list} className="menu" role="listbox" aria-label={aria['aria-label']} onKeyDown={move}>
          {opts.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? <div key={'g' + i} className="caption" role="presentation">{o.group}</div> : null;
            lastGroup = o.group;
            const on = o.value === String(value);
            return [head,
              <button key={o.value + i} type="button" role="option" aria-selected={on} disabled={o.disabled} data-autofocus={(on && !o.disabled) || undefined}
                className={'menu-item opt-item' + (on ? ' on' : '')} onClick={() => { close(); if (!on) onChange({ target: { value: o.value } }); }}>
                <span className="mi-text">{o.label}</span>{on && <Icon name="check" size={16} className="opt-check" />}
              </button>];
          })}
        </div>;
      }}
    </Popover>
  );
}
/** Field (kit.tsx) gives this control its id and error / hint wiring, as it does for <select>. */
Select.fieldControl = true;
