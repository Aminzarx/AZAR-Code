/**
 * AVA's component kit: IRIS's kit (messaging/web/src/ui/kit.tsx), copied so both products share one UI, plus a few
 * AVA call-site compatibilities marked AVA. Built to the KSS UI Design System v1.0.0. Each piece maps to a KSS component
 * (KSS-UI-COMP-001 §6-13) so pages compose instead of inventing one-off UI (COMP-001 §28).
 * UI polish 2398: the pieces render WEB's shared kit (kss-system/ui-kit-2398, styles/kss-kit.css, never edited here):
 * kss-btn, kss-card, kss-stat (#2357 states), kss-chip, kss-notice, kss-empty, kss-field. AVA keeps only its layout.
 */
import { cloneElement, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { ago, dateTime, digits, num } from '../lib/fmt';
import { Select } from './select';
import { KssToast } from './toast';

// ------------------------------------------------------------ page header ----
/** Breadcrumb -> title + primary actions on one row -> short description -> context line (LAYOUT-001 §26). */
export function PageHeader({ title, sub, actions, crumbs, meta, quiet }: {
  title: string; sub?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[]; meta?: ReactNode;
  /** the title and its line are read out but not shown: inside /app's frame the shell's title is the only one (UI audit A5.1, F2) */
  quiet?: boolean;
}) {
  return (
    <div className="ph">
      <div className="ph-text">
        {crumbs && crumbs.length > 0 && (
          <nav className="crumbs" aria-label="مسیر">
            {crumbs.map((c, i) => (
              <span key={i} className="row tight">
                {i > 0 && <Icon name="chevron" size={14} />}
                {c.href ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className={quiet ? 'sr-only' : undefined}>{title}</h1>
        {sub && <p className={quiet ? 'sr-only' : undefined}>{sub}</p>}
        {meta && <div className="meta">{meta}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/** «به‌روزرسانی: ۲ دقیقه پیش» - freshness, never a fake "live" label (DASH-001 §55-56). Re-renders every 30 s. */
export function Freshness({ at }: { at: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  if (!at) return null;
  return <span title={dateTime(new Date(at).toISOString())}><Icon name="clock" size={12} />به‌روزرسانی: {ago(new Date(at).toISOString())}</span>;
}

// ------------------------------------------------------------ containers ----
export function Card({ title, sub, end, children, flush, className, id }: {
  title?: ReactNode; sub?: ReactNode; end?: ReactNode; children?: ReactNode; flush?: boolean; className?: string; id?: string;
}) {
  const hid = useId();
  return (
    <section className={'kss-card ' + (className || '')} aria-labelledby={title ? hid : undefined} id={id}>
      {(title || end) && (
        <div className="kss-card__head">
          <div>{title && <h2 id={hid} className="kss-card__title">{title}</h2>}{sub && <div className="kss-card__sub">{sub}</div>}</div>
          {end && <div className="kss-actions">{end}</div>}
        </div>
      )}
      <div className={'kss-card__body' + (flush ? ' flush' : '')}>{children}</div>
    </section>
  );
}

/** KPI: name, value, context line; links to the list behind it (DASH-001 §19-23, §28). No trend without a real comparison basis. */
/** #2357: a word in place of a number is a state, never a fake ۰ (kss-stat data-state); a real zero is a number */
const STAT_WORD: Record<string, string> = { 'نامشخص': 'unknown', 'اطلاعات کافی نیست': 'insufficient', 'نیازمند تنظیم': 'needs_setting', 'تعریف نشده': 'undefined' };
const statState = (v: ReactNode) => typeof v === 'string' && STAT_WORD[v.trim()] ? STAT_WORD[v.trim()] : v === 0 || v === '۰' || v === '0' ? 'zero' : 'ok';
export function Kpi({ k, v, d, tone, icon, href }: { k: string; v: ReactNode; d?: ReactNode; tone?: 'bad' | 'warn'; icon?: string; href?: string }) {
  const body = (
    <div className={'kss-stat' + (tone ? ' kss-stat--' + (tone === 'bad' ? 'error' : 'warning') : '')} data-state={statState(v)}>
      <p className="kss-stat__label">{icon && <Icon name={icon} size={16} />}<span className="kl">{k}</span></p>
      <div className="kss-stat__value">{v}</div>
      {d && <div className="kss-stat__meta">{d}</div>}
    </div>
  );
  const cls = 'kss-card kss-card__body kpi' + (href ? ' kss-card--link' : '');
  return href ? <a className={cls} href={href}>{body}</a> : <div className={cls}>{body}</div>;
}

/** AVA: the earlier KPI name. Waiting work is amber, never error red (audit P-18). */
export function Stat({ k, v, d, alert, icon, href }: { k: string; v: ReactNode; d?: ReactNode; alert?: boolean; icon?: string; href?: string }) {
  return <Kpi k={k} v={v} d={d} icon={icon} href={href} tone={alert ? 'warn' : undefined} />;
}

// ------------------------------------------------------------ status ----
export type Tone = 'ok' | 'warn' | 'bad' | 'crit' | 'info' | 'neutral';
const TONE_ICON: Record<Tone, string> = { ok: 'ok', warn: 'warn', bad: 'error', crit: 'risk', info: 'info', neutral: 'info' };
/** the kit's chip colours and icon shapes per tone (kss-kit.css §2, §7): a word + a shape, never colour alone */
const CHIP: Record<Tone, string> = { ok: 'success', warn: 'warning', bad: 'error', crit: 'critical', info: 'info', neutral: 'neutral' };
const KICO: Record<Tone, string> = { ok: 'check', warn: 'warn', bad: 'error', crit: 'error', info: 'info', neutral: 'dot' };
const kIco = (name: string) => <span className={'kss-ico kss-ico--' + name} aria-hidden="true" />;

/** A semantic badge: text + icon + colour, never colour alone (STATE-001 §22). */
// AVA: tone 'accent' is IRIS's 'info'; `dot="pulse"` marks something live (a call in progress) instead of an icon
export function Badge({ tone: t, icon, children, spin, dot }: { tone?: Tone | 'accent'; icon?: string | false; children: ReactNode; spin?: boolean; dot?: boolean | 'pulse' }) {
  const tone: Tone | undefined = t === 'accent' ? 'info' : t;
  const tn: Tone = tone ?? 'neutral';
  const ic = icon === false || dot === 'pulse' ? null : icon ? <Icon name={icon} size={12} spin={spin} /> : kIco(KICO[tn]);
  return <span className={'kss-chip kss-chip--' + CHIP[tn]}>{dot === 'pulse' && <span className="dot pulse" aria-hidden="true" />}{ic}{children}</span>;
}

const NOTICE: Record<Tone, string> = { ok: 'success', warn: 'warning', bad: 'error', crit: 'error', info: '', neutral: 'neutral' };
/** Alert: icon, title, explanation, action (VISUAL-001 §49). Errors say what failed, why, and what to do (STATE-001 §33). */
export function Alert({ tone = 'info', title, children, action, icon, role }: {
  tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; icon?: string; role?: 'alert' | 'status';
}) {
  return (
    <div className={'kss-notice' + (NOTICE[tone] ? ' kss-notice--' + NOTICE[tone] : '') + (tone === 'crit' ? ' crit' : '')}
      role={role ?? (tone === 'bad' || tone === 'crit' ? 'alert' : undefined)}>
      {icon ? <Icon name={icon} size={18} /> : kIco(KICO[tone] === 'dot' ? 'info' : KICO[tone])}
      <div className="kss-notice__body">{title && <span className="kss-notice__title">{title}</span>}{children}</div>
      {action && <div className="kss-notice__actions">{action}</div>}
    </div>
  );
}

/** A section that failed to load: what failed, the cause, Retry (STATE-001 §33, DASH-001 §59). */
export function ErrorBox({ what = 'این بخش', error, retry }: { what?: string; error: string; retry?: () => void }) {
  return (
    <Alert tone="bad" title={what + ' بارگذاری نشد.'} action={retry && <button className="kss-btn kss-btn--secondary kss-btn--sm" onClick={retry}><Icon name="refresh" />تلاش دوباره</button>}>
      <span className="small">علت: {error}. اگر تکرار شد، اتصال اینترنت را بررسی کنید یا چند دقیقه بعد دوباره امتحان کنید.</span>
    </Alert>
  );
}

// ------------------------------------------------------------ empty & loading ----
/**
 * Empty states that are told apart (STATE-001 §49-54, DATA-001 §29):
 *  none = nothing exists yet – filtered = nothing matches the search/filters – restricted = no permission.
 */
export function Empty({ kind = 'none', title, children, action, compact, icon }: {
  kind?: 'none' | 'filtered' | 'restricted'; title: string; children?: ReactNode; action?: ReactNode; compact?: boolean; icon?: string;
}) {
  const ic = icon || (kind === 'filtered' ? 'search' : kind === 'restricted' ? 'lock' : 'inbox');
  return (
    <div className={'kss-empty' + (compact ? ' kss-empty--inline' : '')} role="status">
      <span className="kss-empty__icon"><Icon name={ic} size={24} /></span>
      <p className="kss-empty__title">{title}</p>
      {children && <div className="kss-empty__text">{children}</div>}
      {action && <div className="kss-empty__actions">{action}</div>}
    </div>
  );
}

/** Skeleton that resembles the content it stands in for (STATE-001 §25). */
export function Skeleton({ rows = 3, label = 'در حال بارگذاری' }: { rows?: number; label?: string }) {
  return (
    <div className="stack sm" style={{ padding: 16 }} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skel" style={{ inlineSize: (92 - i * 13) + '%' }} />)}
    </div>
  );
}

/** Relative time with the full Jalali date-time on hover. */
export function When({ iso }: { iso: string | null | undefined }) {
  return <span title={dateTime(iso)}>{ago(iso)}</span>;
}

// ------------------------------------------------------------ actions ----
/** Button with a Loading state that blocks a second submit (COMP-001 §6, ACTION-001 §56). */
/** kit 2398 variants: no variant = secondary; 'danger' only opens a confirmation (danger-quiet); 'danger solid' confirms it */
const BTN = { primary: 'kss-btn--primary', danger: 'kss-btn--danger-quiet', 'danger solid': 'kss-btn--danger', ghost: 'kss-btn--ghost', link: 'kss-btn--link' } as const;
export function Btn({ busy, busyLabel, icon, variant, size, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean; busyLabel?: string; icon?: string; variant?: 'primary' | 'danger' | 'danger solid' | 'ghost' | 'link'; size?: 'sm' | 'lg';
}) {
  const cls = ['kss-btn', variant ? BTN[variant] : 'kss-btn--secondary', size && 'kss-btn--' + size];
  // loading: the kit draws the spinner (aria-busy) and the label stays, so the width does not jump
  return (
    <button {...rest} className={[...cls, className].filter(Boolean).join(' ')}
      disabled={rest.disabled || busy} aria-busy={busy || undefined}>
      {!busy && icon ? <Icon name={icon} /> : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

// ------------------------------------------------------------ forms ----
/** Label always visible, required marked with *, hint below, error replaces the hint (FORM-001 §15-16, §33). */
export function Field({ label, hint, error, required, children }: {
  label: string; hint?: ReactNode; error?: string | null; required?: boolean; children: ReactNode;
}) {
  const id = useId();
  const child = isValidElement(children) && ((typeof children.type === 'string' && ['input', 'select', 'textarea'].includes(children.type))
    || (typeof children.type === 'function' && (children.type as { fieldControl?: boolean }).fieldControl))
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: (children.props as { id?: string }).id || id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error || hint ? id + '-d' : undefined,
      'aria-required': required || undefined,
    })
    : children;
  return (
    <div className="kss-field">
      <label className="kss-label" htmlFor={id}>{label}{required && <span className="req" aria-hidden="true">*</span>}</label>
      {child}
      {error ? <div className="kss-error" id={id + '-d'}>{kIco('error')}{error}</div>
        : hint ? <div className="kss-help" id={id + '-d'}>{hint}</div> : null}
    </div>
  );
}

/** Scoped search: icon + input + clear, the placeholder names what is searched (SEARCH-001 §8-12, §28). */
/** `end`: a control inside the field at its end, such as the inbox's filter button (D-P84). */
export function SearchBox({ value, onChange, placeholder, end }: { value: string; onChange: (v: string) => void; placeholder: string; end?: ReactNode }) {
  return (
    <div className={'search' + (end ? ' has-end' : '')} role="search">
      <Icon name="search" />
      <input className="kss-input" type="search" value={value} placeholder={placeholder} aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
      {value && <button type="button" className="kss-icon-btn clear" onClick={() => onChange('')} aria-label="پاک کردن جستجو" title="پاک کردن جستجو"><Icon name="x" /></button>}
      {end && <span className="search-end">{end}</span>}
    </div>
  );
}

/**
 * A «؟» next to a setting's name: tap or click opens a short explanation under it, tap again closes it.
 * Inline rather than a hover tooltip, so it works with a finger and with a screen reader.
 */
export function HelpTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="help-tip">
      <button type="button" className="help-q" aria-expanded={open} aria-controls={id} aria-label={'راهنمای ' + label}
        onClick={() => setOpen((o) => !o)}>؟</button>
      {open && <span id={id} role="note" className="help-text">{children}</span>}
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange, disabled, label = 'انتخاب' }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; label?: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={disabled}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ tables ----
/** Sort state for a table: predictable, reversible, shown on the header (DATA-001 §17, TABLE-001 §20). */
export function useSort<T>(rows: T[] | null | undefined, keys: Record<string, (r: T) => string | number | null>, init: { key: string; dir: 'asc' | 'desc' }) {
  const [sort, setSort] = useState(init);
  const sorted = useMemo(() => {
    if (!rows) return [];
    const f = keys[sort.key];
    if (!f) return rows;
    const m = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fa')) * m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const th = (key: string, label: string, cls?: string) => {
    const on = sort.key === key;
    return (
      <th className={cls} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} scope="col">
        <button type="button" className="sort" onClick={() => setSort({ key, dir: on && sort.dir === 'desc' ? 'asc' : 'desc' })}>
          {label}<Icon name={on ? (sort.dir === 'asc' ? 'sortAsc' : 'sortDesc') : 'sortNone'} size={12} style={{ opacity: on ? 1 : 0.45 }} />
        </button>
      </th>
    );
  };
  return { sorted, th };
}

/** «نمایش ۱–۲۵ از ۲۴۳» + page size 25/50/100 + previous/next (TABLE-001 §30-31). */
export function usePager<T>(rows: T[], reset: unknown) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  useEffect(() => setPage(0), [reset, size]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  const slice = rows.slice(p * size, p * size + size);
  const foot = rows.length > 25 ? (
    <div className="tbl-foot">
      <span>نمایش {digits(p * size + 1)}–{digits(Math.min(rows.length, (p + 1) * size))} از {num(rows.length)}</span>
      <label className="row tight">در هر صفحه
        <Select className="select" value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {[25, 50, 100].map((n) => <option key={n} value={n}>{digits(n)}</option>)}
        </Select>
      </label>
      <span className="push row tight">
        <button className="kss-btn kss-btn--secondary kss-btn--sm" disabled={p === 0} onClick={() => setPage(p - 1)}>قبلی</button>
        <span>صفحه‌ی {digits(p + 1)} از {digits(pages)}</span>
        <button className="kss-btn kss-btn--secondary kss-btn--sm" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>بعدی</button>
      </span>
    </div>
  ) : null;
  return { slice, foot };
}

// ------------------------------------------------------------ toast ----
// Every notice is the shared KSS glass toast (CHG-022 item 13, Amin #9553/#9571): ui/toast/ (copied, never edited). Kind =
// meaning: ok = saved/done, bad = a request failed, warn = nothing changed / look at this, info = a neutral note.
// The old one-at-a-time bottom toast (NOTIFICATION-001 §22-25) is gone; times, stacking and roles come from the module.
export type ToastTone = 'ok' | 'bad' | 'warn' | 'info';
const TOAST_KIND = { ok: 'success', bad: 'error', warn: 'warning', info: 'info' } as const;
export const toast = (msg: string, tone: ToastTone = 'ok', title?: string) => { KssToast[TOAST_KIND[tone]](msg, title); };
export const useToast = () => toast;

/**
 * Wrap an async handler: one at a time (no double submit), success as a short toast, a failure as an error toast (title
 * «<what> انجام نشد» when given). `error` is kept so a form stays open with what was typed (FORM-001 §61) and can offer a
 * next step (e.g. «خرید توکن»); it is not drawn again as a red line.
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>, ok?: string, what?: string) => {
    setBusy(true); setError(null);
    try { await fn(); if (ok) toast(ok); return true; }
    catch (e) { const m = (e as Error).message; setError(m); toast(m, 'bad', what ? what + ' انجام نشد' : undefined); return false; }
    finally { setBusy(false); }
  }, []);
  return { busy, run, error, clearError: () => setError(null) };
}

/** A failure that a purchase fixes: the token-shortage line with «خرید توکن» stays in the form as the next step. */
export function NeedTokens({ error, onClose }: { error: string | null; onClose?: () => void }) {
  if (!error || !/توکن/.test(error)) return null;
  return <Alert tone="warn" action={<a className="kss-btn kss-btn--sm" href="#/tokens" onClick={onClose}>خرید توکن</a>}>{error}</Alert>;
}

// ------------------------------------------------------------------ modal ----
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * KSS-UI-MODAL-001: title + close / content / footer «secondary  primary». Focus moves in on open, stays
 * inside (Tab wraps), and returns to the opener on close (§15, §49). Escape closes unless `locked`
 * (an operation is running). A backdrop click closes only when `dismissable` - not for forms, QR
 * pairing or confirmations, where it could lose work (§17).
 */
export function Modal({ title, sub, onClose, children, footer, size, critical, dismissable, locked, steps }: {
  title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode;
  size?: 'sm' | 'wide'; critical?: boolean; dismissable?: boolean; locked?: boolean; steps?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const tid = useId();
  const close = useRef(onClose); close.current = onClose;
  const lock = useRef(locked); lock.current = locked;
  // the control that opened the layer, captured at first render (before any autoFocus moves focus)
  const openerRef = useRef<HTMLElement | null | undefined>(undefined);
  if (openerRef.current === undefined) openerRef.current = document.activeElement as HTMLElement | null;
  useEffect(() => {
    const opener = openerRef.current;
    const el = box.current!;
    // an element React already focused (autoFocus) wins; otherwise the first field in the body
    if (!el.contains(document.activeElement)) {
      const first = el.querySelector<HTMLElement>('.modal-b ' + FOCUSABLE) || el.querySelector<HTMLElement>(FOCUSABLE);
      (first || el).focus();
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lock.current) { e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab') return;
      e.stopPropagation();   // the innermost layer owns the focus loop
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0]!, z = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    el.addEventListener('keydown', key);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { el.removeEventListener('keydown', key); document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  // MSG-REQ-N31: a layer is drawn on <body>, never inside the form that opened it (the composer's quick replies saved
  // and sent at once), and its own forms' submit events stop here instead of reaching that form through React
  return createPortal(
    <div className={'modal-bg' + (critical ? ' critical' : '')} onSubmit={(e) => e.stopPropagation()}
      onMouseDown={(e) => { if (dismissable && !locked && e.target === e.currentTarget) onClose(); }}>
      <div ref={box} tabIndex={-1} className={'modal' + (size ? ' ' + size : '') + (critical ? ' critical' : '')}
        role={critical ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={tid}>
        <div className="modal-h">
          <div style={{ minInlineSize: 0 }}>
            {steps && <div className="steps-ind">{steps}</div>}
            <h2 id={tid}>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button type="button" className="kss-icon-btn x" onClick={onClose} disabled={locked} aria-label="بستن" title="بستن (Esc)"><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>, document.body);
}

/**
 * Confirmation for a destructive or consequential action: what happens, to which object, whether it
 * can be undone, and a button that names the operation - never «بله» (MODAL-001 §20-21, ACTION-001 §55).
 */
export function Confirm({ title, object, consequence, irreversible, confirmLabel, danger = true, onConfirm, onClose }: {
  title: string; object?: ReactNode; consequence: ReactNode; irreversible?: boolean; confirmLabel: string; danger?: boolean;
  onConfirm: () => Promise<unknown>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} size="sm" onClose={onClose} locked={busy} footer={<>
      <button className="kss-btn kss-btn--secondary" onClick={onClose} disabled={busy}>انصراف</button>
      <Btn variant={danger ? 'danger solid' : 'primary'} busy={busy} busyLabel="در حال انجام…" onClick={async () => {
        setBusy(true);
        try { await onConfirm(); onClose(); } catch (e) { toast((e as Error).message, 'bad', title + ' انجام نشد'); setBusy(false); }
      }}>{confirmLabel}</Btn>
    </>}>
      {object && <div><span className="faint small">مورد: </span><b>{object}</b></div>}
      <div className="wrap">{consequence}</div>
      {irreversible && <div className="row tight small" style={{ color: 'var(--bad-text)' }}><Icon name="warn" />این کار برگشت‌پذیر نیست.</div>}
    </Modal>
  );
}


// ------------------------------------------------------------------ AVA: confirm from a page ----
/** AVA: `ask({...})` opens a Confirm (above) and `node` draws it; replaces the browser's confirm() (audit P-05). */
export type ConfirmAsk = Omit<Parameters<typeof Confirm>[0], 'onClose'>;
export function useConfirm() {
  const [c, setC] = useState<ConfirmAsk | null>(null);
  return { ask: setC, node: c ? <Confirm {...c} onClose={() => setC(null)} /> : null };
}

/** AVA: a table row that opens a page, by mouse or keyboard (Enter), and says so to a screen reader (audit P-04). */
export const rowLink = (href: string, label?: string) => ({
  className: 'click', tabIndex: 0, role: 'link' as const, 'aria-label': label,
  onClick: () => { location.hash = href; },
  onKeyDown: (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter') { e.preventDefault(); location.hash = href; } },
});
