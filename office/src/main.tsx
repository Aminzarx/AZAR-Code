import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import qrcode from 'qrcode-generator';
import './styles/tokens.css';
import './styles/kss-kit.css';
import './styles/base.css';
import './office.css';
import { applyTheme } from './lib/theme';
import { ago } from './lib/fmt';
import { Alert, Badge, Btn, Card, Empty, ErrorBox, Field, Kpi, Modal, PageHeader, SearchBox, Segmented, Skeleton, ToastProvider, useAction, useConfirm, useToast } from './ui/kit';
import { Icon } from './ui/icons';
import { api, ApiError, IN_PANEL, session, type Adviser, type NewFile, type OfficeFile, type Overview, type Rules, type Quote, type SignedIn, type Tokens } from './api';

/**
 * EYVAN office dashboard (Amin #5659/#5664/#5909/#5913/#5934): the real-estate office manager's own dashboard —
 * its own sign-in («ورود با ایوان» or username + password, Amin #6033/#6034), the IRIS panel's components and tokens. Every number comes from the
 * office's files on the server and the work of the advisers who joined with a code.
 */
applyTheme('light');

const fa = (n: number) => n.toLocaleString('fa-IR');
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const KINDS = ['فروش', 'رهن و اجاره', 'اجاره', 'تهاتر'] as const;
const STAGE: Record<string, string> = { new: 'تازه', contacted: 'تماس گرفته شد', viewing: 'بازدید', negotiating: 'مذاکره' };

/** Toman, short: ۲۸ میلیارد / ۹٫۵ میلیارد / ۸۰۰ میلیون */
function money(t: number | null): string {
  if (t == null) return '—';
  const [n, unit] = t >= 1e9 ? [t / 1e9, 'میلیارد'] : t >= 1e6 ? [t / 1e6, 'میلیون'] : [t, 'تومان'];
  return `${(Math.round(n * 10) / 10).toLocaleString('fa-IR')} ${unit}`;
}
const priceOf = (f: OfficeFile) =>
  f.kind === 'رهن و اجاره' || f.kind === 'اجاره'
    ? [f.deposit != null && 'ودیعه ' + money(f.deposit), f.rent != null && 'اجاره ' + money(f.rent)].filter(Boolean).join(' · ') || '—'
    : money(f.price);
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
const dayNum = (d: string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(d + 'T12:00:00Z'));
const today = () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Tehran' }).format(new Date());

// ------------------------------------------------------------------ login ----
const PHONE = /^09\d{9}$/;
const persianDate = (iso: string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(iso));

/**
 * Amin #6346 «ورود با ایوان»: the manager writes the mobile number; a sign-in screen opens at once in that number's EYVAN
 * app (when the app is open) and holding its button for 3 seconds signs this page in. While it waits, the guide says so.
 */
function WithEyvan({ onSession }: { onSession: (r: SignIn) => void }) {
  const [phone, setPhone] = useState('');
  const [wait, setWait] = useState<{ poll: string; expiresAt: string } | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useAction();
  const number = toLatin(phone).replace(/\D/g, '');
  const ask = () => run(async () => {
    setError(null);
    setWait(await api.linkPhone(number));
  });
  useEffect(() => {
    if (!wait) return;
    let alive = true;
    const tick = () => setLeft(Math.max(0, Math.round((Date.parse(wait.expiresAt) - Date.now()) / 1000)));
    tick();
    const clock = setInterval(tick, 1000);
    const poll = setInterval(() => {
      api.linkPoll(wait.poll).then((r) => {
        if (alive && 'token' in r) { alive = false; onSession(r); }
      }, (e: ApiError & { ticket?: string }) => {
        if (!alive) return;
        if (e.code === 'no_office' && e.ticket) { alive = false; onSession({ ticket: e.ticket }); }
        else if (e.status !== 0 && e.status !== 429) { alive = false; setWait(null); setError(e.message); }
      });
    }, 2000);
    return () => { alive = false; clearInterval(clock); clearInterval(poll); };
  }, [wait, onSession]);
  if (wait) {
    return (
      <div className="eyvan-link">
        <ol className="eyvan-steps">
          <li>برنامهٔ ایوان را روی گوشی <b dir="ltr">{number.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)))}</b> باز کنید.</li>
          <li>صفحهٔ «ورود به داشبورد دفتر» همان لحظه در برنامه باز می‌شود.</li>
          <li>دکمهٔ «نگه دارید تا وارد شوید» را <b>۳ ثانیه</b> نگه دارید تا هویت شما بررسی شود.</li>
        </ol>
        <div className="row nowrap" role="status"><span className="wait-dot" aria-hidden="true" /> <span className="muted">منتظر تأیید در برنامهٔ ایوان… {left > 0 ? `${fa(left)} ثانیه` : ''}</span></div>
        <p className="muted small">اگر صفحه در برنامه باز نشد، برنامه را ببندید و دوباره باز کنید. برای این شماره باید پنل دفتر فعال باشد.</p>
        <Btn variant="ghost" onClick={() => setWait(null)}>تغییر شماره</Btn>
      </div>
    );
  }
  return (
    <div className="eyvan-link">
      <p className="muted">شمارهٔ همراهی را بنویسید که با آن در برنامهٔ ایوان هستید.</p>
      <Field label="شمارهٔ همراه" required>
        <input className="kss-input" dir="ltr" inputMode="numeric" autoComplete="tel" placeholder="09121234567" value={phone}
          onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && PHONE.test(number)) { e.preventDefault(); void ask(); } }} autoFocus />
      </Field>
      {error && <Alert tone="bad">{error}</Alert>}
      <Btn type="button" variant="primary" busy={busy} disabled={!PHONE.test(number)} onClick={() => void ask()}>ورود با ایوان</Btn>
    </div>
  );
}

type SignIn = SignedIn | { ticket: string };

/**
 * Amin #6033/#6034: the office dashboard's sign-in — «ورود با ایوان» (the app confirms a code) or the username and
 * password chosen on the request. Only accounts whose office panel was approved get in.
 */
function Login({ onIn }: { onIn: () => void }) {
  const [how, setHow] = useState<'eyvan' | 'password'>('eyvan');
  const [ticket, setTicket] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { busy, run, error } = useAction();
  const onSession = useCallback((r: SignIn) => {
    if ('ticket' in r) { setTicket(r.ticket); return; }
    session.set(r.token, r.expiresAt);
    onIn();
  }, [onIn]);
  const submit = () =>
    run(async () => {
      if (ticket) { onSession(await api.ssoOpen(ticket, name.trim())); return; }
      try {
        onSession(await api.password(toLatin(username).trim().toLowerCase(), password));
      } catch (e) {
        const t = (e as { code?: string; ticket?: string });
        if (t.code === 'no_office' && t.ticket) setTicket(t.ticket);
        else throw e;
      }
    });
  return (
    <main className="login">
      <form className="kss-card login-card" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="side-brand"><div className="logo"><Icon name="home" size={18} /></div><div><b>ایوان</b><small>داشبورد دفتر املاک</small></div></div>
        {ticket ? (
          <>
            <h1 className="login-title">دفتر تازه</h1>
            <p className="muted">برای این حساب هنوز دفتری ساخته نشده؛ نام دفتر را بنویسید.</p>
            <Field label="نام دفتر" required><input className="kss-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً دفتر املاک پارسه" autoFocus /></Field>
            {error && <Alert tone="bad">{error}</Alert>}
            <Btn type="submit" variant="primary" busy={busy} disabled={!name.trim()}>ساخت دفتر و ورود</Btn>
          </>
        ) : (
          <>
            <h1 className="login-title">ورود مدیر دفتر</h1>
            <Segmented label="روش ورود" value={how} onChange={setHow} options={[{ value: 'eyvan', label: 'ورود با ایوان' }, { value: 'password', label: 'نام کاربری و رمز' }]} />
            {how === 'eyvan' ? <WithEyvan onSession={onSession} /> : (
              <>
                <p className="muted">نام کاربری و رمزی که در درخواست پنل دفتر در برنامهٔ ایوان گذاشتید.</p>
                <Field label="نام کاربری" required><input className="kss-input" dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></Field>
                <Field label="رمز" required><input className="kss-input" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                {error && <Alert tone="bad">{error}</Alert>}
                <Btn type="submit" variant="primary" busy={busy} disabled={!username.trim() || !password}>ورود</Btn>
              </>
            )}
            <p className="muted small">پنل دفتر را از برنامهٔ ایوان، تنظیمات ← اتصال‌ها و API‌ها ← دفتر املاک ← درخواست پنل املاک، درخواست می‌دهید.</p>
          </>
        )}
      </form>
    </main>
  );
}

// ------------------------------------------------------------- from the panel ----
/** Amin #5967: opened from the card in kssx.ir/app with a signed handoff (?h=…); one login, no second code */
function FromPanel({ onIn }: { onIn: () => void }) {
  const [state, setState] = useState<{ t: 'wait' } | { t: 'name'; ticket: string } | { t: 'fail'; m: string }>({ t: 'wait' });
  const [name, setName] = useState('');
  const { busy, run, error } = useAction();
  useEffect(() => {
    const h = new URLSearchParams(location.search).get('h');
    history.replaceState(null, '', location.pathname);
    if (!h) { setState({ t: 'fail', m: 'داشبورد دفتر را از پنل کاربری باز کنید.' }); return; }
    api.sso(h).then((r) => { session.set(r.token, r.expiresAt); onIn(); }, (e: Error & { code?: string; ticket?: string }) =>
      setState(e.code === 'no_office' && e.ticket ? { t: 'name', ticket: e.ticket } : { t: 'fail', m: e.message }));
  }, [onIn]);
  const open = () => run(async () => {
    if (state.t !== 'name') return;
    const r = await api.ssoOpen(state.ticket, name.trim());
    session.set(r.token, r.expiresAt);
    onIn();
  });
  return (
    <main className="login">
      <form className="kss-card login-card" onSubmit={(e) => { e.preventDefault(); void open(); }}>
        <div className="side-brand"><div className="logo"><Icon name="home" size={18} /></div><div><b>ایوان</b><small>داشبورد دفتر املاک</small></div></div>
        {state.t === 'wait' ? <Skeleton rows={2} label="در حال ورود" /> : state.t === 'fail' ? (
          <>
            <Alert tone="warn">{state.m}</Alert>
            <a className="kss-btn kss-btn--primary" href="/app">بازگشت به پنل</a>
          </>
        ) : (
          <>
            <h1 className="login-title">دفتر تازه</h1>
            <p className="muted">برای این حساب هنوز دفتری ساخته نشده؛ نام دفتر را بنویسید.</p>
            <Field label="نام دفتر" required><input className="kss-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً دفتر املاک پارسه" autoFocus /></Field>
            {error && <Alert tone="bad">{error}</Alert>}
            <Btn type="submit" variant="primary" busy={busy} disabled={!name.trim()}>ساخت دفتر</Btn>
          </>
        )}
      </form>
    </main>
  );
}

// ------------------------------------------------------------------ pieces ----
function NewFilesChart({ days }: { days: Overview['perDay'] }) {
  const W = 640, H = 150, pad = 20, max = Math.max(1, ...days.map((d) => d.office)), bw = (W - pad * 2) / days.length;
  if (!days.some((d) => d.office)) return <Empty compact title="در ۱۴ روز اخیر فایلی ثبت نشده">با «فایل تازه» اولین فایل دفتر را ثبت کنید.</Empty>;
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 26}`} width="100%" role="img" aria-label="فایل‌های تازه در ۱۴ روز اخیر">
        {[0.5, 1].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H - (H - 14) * f} y2={H - (H - 14) * f} stroke="var(--line)" strokeDasharray="3 4" />)}
        {days.map((d, i) => {
          const h = ((H - 14) * d.office) / max, x = pad + i * bw + bw * 0.2, w = bw * 0.6;
          return (
            <g key={d.day}>
              <title>{fa(d.office)} فایل</title>
              <rect x={x} y={H - h} width={w} height={Math.max(h, d.office ? 2 : 0)} rx="3" fill="var(--series-1)" />
              <text x={x + w / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--fg-3)" fontFamily="var(--font)">{dayNum(d.day)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Stages({ o }: { o: Overview }) {
  if (!o.advisers.length) return <Empty compact title="هنوز مشاوری وصل نیست">معامله‌های مشاوران وصل اینجا دیده می‌شود.</Empty>;
  if (!o.openDeals) return <Empty compact title="مشاوران معاملهٔ بازی ندارند" />;
  const max = Math.max(1, ...o.stages.map((s) => s.count));
  return (
    <div className="stack sm">
      {o.stages.map((s) => (
        <div key={s.stage}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>{STAGE[s.stage]}</span><b className="num">{fa(s.count)}</b></div>
          <div className="meter"><div style={{ inlineSize: (100 * s.count) / max + '%', background: 'var(--series-1)' }} /></div>
        </div>
      ))}
    </div>
  );
}

function Advisers({ o, reload, onCode }: { o: Overview; reload: () => void; onCode: () => void }) {
  const { run } = useAction();
  const { ask: confirm, node: confirmNode } = useConfirm();
  const rank = [...o.advisers].sort((a, b) => b.closedToday - a.closedToday || b.newFiles - a.newFiles || b.contacts - a.contacts);
  const idle = (a: Adviser) => !a.newFiles && !a.contacts && !a.reminders && !a.closedToday;
  return (
    <>
      {confirmNode}
      {!rank.length ? (
        <Empty title="هنوز مشاوری به دفتر وصل نشده" action={<Btn variant="primary" icon="key" onClick={onCode}>ساخت کد اتصال مشاور</Btn>}>
          برای هر مشاور یک کد ۸ رقمی و یک کلمه بسازید؛ مشاور آن را در برنامهٔ ایوان وارد می‌کند.
        </Empty>
      ) : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>مشاور</th><th className="num">فایل تازه</th><th className="num">تماس و پیگیری</th><th className="num">معامله بسته</th><th className="num">معاملهٔ باز</th><th>آخرین فعالیت</th><th><span className="sr-only">کار</span></th></tr></thead>
          <tbody>
            {rank.map((a, i) => (
              <tr key={a.id}>
                <td><span className="row tight nowrap"><span className="faint num">{fa(i + 1)}</span><b style={{ fontWeight: 500 }}>{a.name}</b></span></td>
                <td className="num">{fa(a.newFiles)}</td><td className="num">{fa(a.contacts)}</td>
                <td className="num">{a.closedToday ? <Badge tone="ok">{fa(a.closedToday)}</Badge> : fa(0)}</td>
                <td className="num">{fa(a.openDeals)}</td>
                <td className="muted nowrap">{idle(a) ? <Badge tone="warn">امروز فعالیتی ندارد</Badge> : a.lastSeen ? ago(a.lastSeen) : '—'}</td>
                <td><button className="kss-icon-btn" aria-label={'قطع اتصال ' + a.name} title="قطع اتصال" onClick={() => confirm({
                  title: 'قطع اتصال مشاور', object: a.name, consequence: 'فایل‌های دفتر از برنامهٔ این مشاور برداشته می‌شود؛ برای اتصال دوباره کد تازه لازم است.',
                  confirmLabel: 'قطع اتصال', onConfirm: () => run(() => api.unlink(a.id).then(reload), 'اتصال قطع شد'),
                })}><Icon name="x" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {o.codes.length > 0 && (
        <div className="codes">
          <b>کدهای استفاده‌نشده</b>
          {o.codes.map((c) => (
            <div key={c.code} className="row" style={{ justifyContent: 'space-between' }}>
              <span>کد <b className="num" dir="ltr">{c.code}</b> · کلمه «{c.word}» <span className="faint">· {daysLeft(c.expires_at) ? fa(daysLeft(c.expires_at)) + ' روز اعتبار' : 'امروز باطل می‌شود'}</span></span>
              <button className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => run(() => api.revokeCode(c.code).then(reload), 'کد باطل شد')}>باطل کردن</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Expiring({ o, reload }: { o: Overview; reload: () => void }) {
  const { run } = useAction();
  if (!o.expiring.length) return <Empty compact title="هفتهٔ آینده فایلی منقضی نمی‌شود">هر فایل ۳۰ روز اعتبار دارد و در ۷ روز آخر اینجا می‌آید.</Empty>;
  return (
    <ul className="stack sm plain">
      {o.expiring.map((f) => (
        <li key={f.id} className="row" style={{ justifyContent: 'space-between' }}>
          <span><span>{f.title}</span><div className="faint xs">{f.city}، {f.region}</div></span>
          <span className="row tight nowrap">
            <Badge tone="warn">{daysLeft(f.expiresAt) ? fa(daysLeft(f.expiresAt)) + ' روز مانده' : 'امروز'}</Badge>
            <button className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => run(() => api.renew(f.id).then(reload), 'فایل ۳۰ روز تمدید شد')}>تمدید</button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Rule({ label, hint, on, onChange, fixed }: { label: string; hint?: string; on: boolean; onChange?: (v: boolean) => void; fixed?: boolean }) {
  return (
    <label className="row nowrap rule">
      <span><span>{label}</span>{hint && <div className="faint xs">{hint}</div>}</span>
      <input type="checkbox" role="switch" className="switch" checked={on} disabled={fixed} onChange={(e) => onChange?.(e.target.checked)} />
    </label>
  );
}

function RuleSwitches({ rules, set }: { rules: Rules; set: (r: Rules) => void }) {
  return (
    <>
      <Rule label="مشخصات، متراژ و قیمت" hint="همیشه فرستاده می‌شود" on fixed />
      <Rule label="توضیحات" on={rules.description} onChange={(v) => set({ ...rules, description: v })} />
      <Rule label="آدرس دقیق" hint="خاموش: فقط شهر و منطقه دیده می‌شود" on={rules.address} onChange={(v) => set({ ...rules, address: v })} />
      <Rule label="نام و شمارهٔ مالک" hint="خاموش: مشاور برای تماس از دفتر می‌پرسد" on={rules.owner} onChange={(v) => set({ ...rules, owner: v })} />
    </>
  );
}

function Sharing({ o, reload }: { o: Overview; reload: () => void }) {
  const toast = useToast();
  const save = (r: Rules) => api.rules(r).then(() => { reload(); toast('قواعد ارسال ذخیره شد'); }, (e: Error) => toast(e.message, 'bad'));
  return (
    <div className="stack sm">
      <RuleSwitches rules={o.office.rules} set={save} />
      <Alert tone="warn" title="نسخهٔ وب مشاوران">مشاورانی که ایوان را در مرورگر باز می‌کنند می‌توانند متن را کپی کنند؛ اطلاعات حساس را با دقت روشن کنید.</Alert>
    </div>
  );
}

// ---------------------------------------------------------- new file + send ----
function NewFileModal({ onClose, onMade }: { onClose: () => void; onMade: (id: string, title: string) => void }) {
  const [f, setF] = useState<Record<string, string>>({ kind: 'فروش', city: 'تهران' });
  const { busy, run, error } = useAction();
  const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const n = (k: string) => (f[k] ? Number(toLatin(f[k]!).replace(/[^\d.]/g, '')) : null);
  const rent = f.kind === 'رهن و اجاره' || f.kind === 'اجاره';
  const save = () => run(async () => {
    const body: NewFile = {
      title: f.title, kind: f.kind, propertyType: f.propertyType, city: f.city, region: f.region, address: f.address,
      size: n('size'), rooms: n('rooms'), price: rent ? null : n('price'), deposit: rent ? n('deposit') : null, rent: rent ? n('rent') : null,
      description: f.description, ownerName: f.ownerName, ownerPhone: f.ownerPhone ? toLatin(f.ownerPhone).replace(/\D/g, '') : '',
    };
    const r = await api.createFile(body);
    onMade(r.id, f.title ?? '');
  });
  const money = (k: string, label: string) => (
    <Field label={label + ' (تومان)'}><input className="kss-input num" inputMode="numeric" dir="ltr" value={f[k] ?? ''} onChange={set(k)} /></Field>
  );
  return (
    <Modal title="فایل تازهٔ دفتر" sub="فایل به نام دفتر ثبت می‌شود و ۳۰ روز اعتبار دارد" onClose={onClose} size="wide" locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!f.title?.trim() || !f.region?.trim()} onClick={() => void save()}>ثبت فایل</Btn></>}>
      <div className="form-grid">
        {/* Amin #5965: title and deal kind on one row */}
        <div className="span2 title-row">
          <Field label="عنوان فایل" required hint="مثلاً آپارتمان ۱۲۰ متری ونک"><input className="kss-input" value={f.title ?? ''} onChange={set('title')} autoFocus /></Field>
          <Field label="نوع معامله" required>
            <Segmented label="نوع معامله" value={f.kind!} onChange={(v) => setF((x) => ({ ...x, kind: v }))} options={KINDS.map((k) => ({ value: k, label: k }))} />
          </Field>
        </div>
        {/* Amin #5966: property type, city and area on one row */}
        <div className="span2 one-row place">
          <Field label="نوع ملک"><input className="kss-input" value={f.propertyType ?? ''} onChange={set('propertyType')} placeholder="آپارتمان…" /></Field>
          <Field label="شهر"><input className="kss-input" value={f.city ?? ''} onChange={set('city')} /></Field>
          <Field label="منطقه" required><input className="kss-input" value={f.region ?? ''} onChange={set('region')} placeholder="مثلاً ونک" /></Field>
        </div>
        <div className="span2"><Field label="آدرس دقیق" hint="به‌طور پیش‌فرض برای مشاوران فرستاده نمی‌شود"><input className="kss-input" value={f.address ?? ''} onChange={set('address')} /></Field></div>
        {/* Amin #5964: price, area and rooms on one row (on a phone too, as long as they fit) */}
        <div className={'span2 one-row' + (rent ? ' four' : '')}>
          {rent ? <>{money('deposit', 'ودیعه')}{money('rent', 'اجاره')}</> : money('price', 'قیمت')}
          <Field label="متراژ (متر)"><input className="kss-input num" inputMode="numeric" dir="ltr" value={f.size ?? ''} onChange={set('size')} /></Field>
          <Field label="اتاق"><input className="kss-input num" inputMode="numeric" dir="ltr" value={f.rooms ?? ''} onChange={set('rooms')} /></Field>
        </div>
        <div className="span2"><Field label="توضیحات"><textarea className="kss-input" rows={3} value={f.description ?? ''} onChange={set('description')} /></Field></div>
        <Field label="نام مالک"><input className="kss-input" value={f.ownerName ?? ''} onChange={set('ownerName')} /></Field>
        <Field label="شمارهٔ مالک" hint="به‌طور پیش‌فرض برای مشاوران فرستاده نمی‌شود"><input className="kss-input" dir="ltr" inputMode="tel" value={f.ownerPhone ?? ''} onChange={set('ownerPhone')} placeholder="09xxxxxxxxx" /></Field>
      </div>
      <p className="muted small">ثبت فایل یک بار، به اندازهٔ حجم فایل، از توکن‌های دفتر کم می‌کند؛ تمدید رایگان است.</p>
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
    </Modal>
  );
}

function SendModal({ o, ids, onClose, onSent }: { o: Overview; ids: string[]; onClose: () => void; onSent: () => void }) {
  const [all, setAll] = useState(true);
  const [who, setWho] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<Rules>(o.office.rules);
  // Amin #6344: a share runs with no end or until a day; the office can cancel it either way
  const [span, setSpan] = useState<'none' | '7' | '30' | '90'>('none');
  const until = span === 'none' ? null : new Date(Date.now() + Number(span) * 86400000).toISOString();
  const { busy, run, error } = useAction();
  const send = () => run(() => api.share(ids, all ? 'all' : [...who], rules, until).then(onSent), `${fa(ids.length)} فایل فرستاده شد`);
  // Amin #6269: each file's tokens × each recipient who does not have it yet; the server charges the same sum
  const people = all ? o.advisers.map((a) => a.id) : [...who];
  const picked = o.files.filter((f) => ids.includes(f.id));
  const cost = picked.some((f) => f.tokens == null) ? null
    : picked.reduce((sum, f) => sum + (f.tokens ?? 0) * people.filter((p) => !f.sentTo.includes(p) && !f.sentTo.includes('*')).length, 0);
  return (
    <Modal title={`ارسال ${fa(ids.length)} فایل به مشاوران`} sub="مشاوران فایل را فقط با اینترنت در برنامه می‌بینند؛ روی گوشی ذخیره نمی‌شود" onClose={onClose} locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>بعداً</Btn><Btn variant="primary" icon="upload" busy={busy} disabled={!o.advisers.length || (!all && !who.size)} onClick={() => void send()}>ارسال</Btn></>}>
      {!o.advisers.length ? <Alert tone="info">هنوز مشاوری وصل نیست؛ اول برای مشاور کد اتصال بسازید. فایل در جدول می‌ماند و بعداً می‌توانید بفرستید.</Alert> : (
        <div className="stack sm">
          <b>به چه کسی؟</b>
          <Rule label={`همهٔ مشاوران (${fa(o.advisers.length)} نفر)`} on={all} onChange={setAll} />
          {!all && o.advisers.map((a) => (
            <label key={a.id} className="row nowrap rule">
              <span>{a.name}</span>
              <input type="checkbox" className="kss-check" checked={who.has(a.id)} onChange={() => setWho((s) => { const n = new Set(s); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })} />
            </label>
          ))}
          <b style={{ marginBlockStart: 'var(--s3)' }}>چه اطلاعاتی برود؟</b>
          <RuleSwitches rules={rules} set={setRules} />
          <b style={{ marginBlockStart: 'var(--s3)' }}>تا کی؟</b>
          <Segmented label="مدت اشتراک" value={span} onChange={setSpan}
            options={[{ value: 'none', label: 'نامحدود' }, { value: '7', label: '۷ روز' }, { value: '30', label: '۳۰ روز' }, { value: '90', label: '۹۰ روز' }]} />
          <small className="muted">{until ? `تا ${persianDate(until)} برای مشاور دیده می‌شود؛ بعد خودبه‌خود برداشته می‌شود.` : 'تا وقتی خودتان لغو نکنید دیده می‌شود.'} از «فرستاده به» در جدول فایل‌ها هر وقت بخواهید لغو می‌کنید.</small>
          {cost !== null && (
            <Alert tone={o.tokens && cost > o.tokens.balance ? 'bad' : 'info'}>
              این ارسال {fa(cost)} توکن از دفتر کم می‌کند (توکن هر فایل × تعداد مشاورانی که آن را ندارند). موجودی دفتر: {fa(Math.floor(o.tokens?.balance ?? 0))} توکن. توکن مشاوران کم نمی‌شود.
            </Alert>
          )}
        </div>
      )}
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
    </Modal>
  );
}

/** Amin #6344: who has a file now, until when, and «لغو» for one or all — the adviser stops seeing it at once */
function SharesModal({ o, fileId, onClose, reload }: { o: Overview; fileId: string; onClose: () => void; reload: () => void }) {
  const f = o.files.find((x) => x.id === fileId);
  const names = new Map(o.advisers.map((a) => [a.id, a.name]));
  const { busy, run, error } = useAction();
  const cancel = (adviserId?: string) => run(() => api.shareCancel(fileId, adviserId).then(reload), adviserId ? 'اشتراک لغو شد' : 'همهٔ اشتراک‌های این فایل لغو شد');
  const shares = f?.shares ?? [];
  return (
    <Modal title="اشتراک‌های فایل" sub={f?.title} onClose={onClose} size="sm" locked={busy}
      footer={<>{shares.length > 1 && <Btn variant="danger" busy={busy} onClick={() => void cancel()}>لغو همه</Btn>}<Btn variant="primary" onClick={onClose}>تمام</Btn></>}>
      {!shares.length ? <Empty title="این فایل الان برای کسی فرستاده نشده">با «ارسال به مشاوران» دوباره بفرستید.</Empty> : (
        <div className="stack sm">
          {shares.map((s) => (
            <div key={s.adviserId} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{s.adviserId === '*' ? 'همهٔ مشاوران' : names.get(s.adviserId) ?? 'مشاور'} <span className="faint">· {s.until ? `تا ${persianDate(s.until)}` : 'نامحدود'}</span></span>
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => void cancel(s.adviserId)}>لغو</Btn>
            </div>
          ))}
        </div>
      )}
      {error && <Alert tone="bad">{error}</Alert>}
    </Modal>
  );
}

function FilesTable({ o, onNew, onSend, onShares }: { o: Overview; onNew: () => void; onSend: (ids: string[]) => void; onShares: (id: string) => void }) {
  const [kind, setKind] = useState<string>('all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const names = useMemo(() => new Map(o.advisers.map((a) => [a.id, a.name])), [o.advisers]);
  const rows = o.files.filter((f) => (kind === 'all' || f.kind === kind) && (!q || [f.title, f.region, f.city, f.ownerName].some((x) => x?.includes(q))));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sentTo = (f: OfficeFile) =>
    f.sentTo.includes('*') ? 'همهٔ مشاوران' : f.sentTo.length === 1 ? names.get(f.sentTo[0]!) ?? '۱ مشاور' : f.sentTo.length ? fa(f.sentTo.length) + ' مشاور' : null;
  if (!o.files.length) return <Empty title="دفتر هنوز فایلی ندارد" action={<Btn variant="primary" icon="plus" onClick={onNew}>فایل تازه</Btn>}>فایل‌هایی که اینجا ثبت می‌کنید به نام دفتر است و می‌توانید برای مشاوران بفرستید.</Empty>;
  return (
    <>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="جست‌وجو در عنوان، منطقه، مالک" />
        <Segmented label="نوع معامله" value={kind} onChange={setKind} options={[{ value: 'all', label: 'همه' }, ...KINDS.map((k) => ({ value: k, label: k }))]} />
        <div className="spacer" style={{ flex: 1 }} />
        {picked.size > 0 && <span className="count">{fa(picked.size)} فایل انتخاب شده</span>}
        <Btn size="sm" variant="primary" icon="upload" disabled={!picked.size} onClick={() => onSend([...picked])}>ارسال به مشاوران</Btn>
      </div>
      {!rows.length ? <Empty kind="filtered" title="فایلی با این جست‌وجو پیدا نشد">نوع معامله یا متن جست‌وجو را تغییر دهید.</Empty> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th style={{ inlineSize: 40 }}><span className="sr-only">انتخاب</span></th><th>فایل</th><th>نوع</th><th className="num">قیمت</th><th className="num">متراژ</th><th>ثبت</th><th>فرستاده به</th><th>انقضا</th></tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td><input type="checkbox" className="kss-check" checked={picked.has(f.id)} onChange={() => toggle(f.id)} aria-label={'انتخاب ' + f.title} /></td>
                <td><b style={{ fontWeight: 500 }}>{f.title}</b><div className="faint xs">{f.city}، {f.region}</div></td>
                <td><Badge tone={f.kind === 'فروش' ? 'info' : 'neutral'} icon={false}>{f.kind}</Badge></td>
                <td className="num nowrap">{priceOf(f)}</td>
                <td className="num">{f.size != null ? fa(f.size) + ' متر' : '—'}</td>
                <td className="muted nowrap">{ago(f.createdAt)}</td>
                <td>{sentTo(f) ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm" onClick={() => onShares(f.id)} title="دیدن و لغو اشتراک">{sentTo(f)}</button> : <span className="faint">فرستاده نشده</span>}</td>
                <td>{daysLeft(f.expiresAt) <= 7 ? <Badge tone="warn">{fa(daysLeft(f.expiresAt))} روز مانده</Badge> : <span className="faint">{fa(daysLeft(f.expiresAt))} روز</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}

/** a QR as SVG squares (no outside service; CSP keeps everything on our own address) */
function Qr({ text, size = 176, label }: { text: string; size?: number; label: string }) {
  const cells = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text, 'Byte');
    q.make();
    const n = q.getModuleCount();
    const on: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) on.push(`M${c + 2} ${r + 2}h1v1h-1z`);
    return { n: n + 4, d: on.join('') };
  }, [text]);
  return (
    <svg className="qr" viewBox={`0 0 ${cells.n} ${cells.n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={cells.n} height={cells.n} fill="#fff" />
      <path d={cells.d} fill="#000" />
    </svg>
  );
}

function CodeModal({ onClose }: { onClose: () => void }) {
  const [c, setC] = useState<{ code: string; word: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.newCode().then(setC, (e: Error) => setErr(e.message)); }, []);
  return (
    <Modal title="کد اتصال مشاور" sub="یک‌بار مصرف، برای یک مشاور، ۷ روز اعتبار" onClose={onClose} size="sm" footer={<Btn variant="primary" onClick={onClose}>تمام</Btn>}>
      {err ? <Alert tone="bad">{err}</Alert> : !c ? <Skeleton rows={2} /> : (
        <div className="stack sm" style={{ textAlign: 'center' }}>
          {/* Amin #6330: the adviser's EYVAN app scans this (eyvan://office-join?c=…&w=…), or types the code and word */}
          <div className="qr-wrap"><Qr text={`eyvan://office-join?c=${c.code}&w=${encodeURIComponent(c.word)}`} label="کد QR اتصال مشاور" /></div>
          <div className="code-big num" dir="ltr">{c.code}</div>
          <div className="word-big">{c.word}</div>
          <p className="muted">مشاور در برنامهٔ ایوان، تنظیمات ← اتصال‌ها و API‌ها ← «اتصال به دفتر املاک» را باز می‌کند و این کد را اسکن می‌کند، یا کد و کلمه را می‌نویسد.</p>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ page ----
/**
 * Amin #6269: the office's own tokens: the balance, buying (kss-pricing's price and smallest purchase; billing's
 * gateway), and every charge in words. Adding a file takes its tokens once; sending takes them per new recipient.
 */
function TokensCard({ reloadKey }: { reloadKey: string }) {
  const [t, setT] = useState<Tokens | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const { busy, run, error } = useAction();
  useEffect(() => { api.tokens().then((x) => { setT(x); setErr(null); }, (e: Error) => setErr(e.message)); }, [reloadKey]);
  const n = count ? Number(toLatin(count).replace(/\D/g, '')) : 0;
  useEffect(() => {
    setQuote(null);
    if (!t?.buy.open || !t.buy.minTokens || n < t.buy.minTokens) return;
    const h = window.setTimeout(() => { api.tokenQuote(n).then((r) => setQuote(r.quote), () => setQuote(null)); }, 300);
    return () => window.clearTimeout(h);
  }, [n, t?.buy.open, t?.buy.minTokens]);
  const buy = () => run(async () => {
    const r = await api.tokenBuy(n, `office-${Date.now()}-${n}`);
    if (r.payUrl) location.href = r.payUrl;
  });
  const closedWhy: Record<string, string> = {
    sales_off: 'خرید توکن برای این دفتر هنوز باز نشده است.', price_unset: 'قیمت توکن هنوز تعیین نشده است.',
    vat_unset: 'مالیات قیمت توکن هنوز تعیین نشده است.', min_unset: 'کمترین خرید توکن هنوز تعیین نشده است.',
  };
  return (
    <Card id="tokens" title="توکن‌های دفتر" sub="ثبت هر فایل یک بار به اندازهٔ حجمش، و ارسال آن برای هر مشاوری که فایل را ندارد، از این موجودی کم می‌شود">
      {err && !t ? <Alert tone="bad">{err}</Alert> : !t ? <Skeleton rows={3} /> : (
        <div className="stack">
          <div className="grid g4 card-grid">
            <Kpi icon="chart" k="موجودی توکن دفتر" v={fa(Math.floor(t.balance))} tone={t.balance <= 0 ? 'warn' : undefined} d="جدا از توکن‌های اپ شما و مشاوران" />
          </div>
          {t.buy.open ? (
            <div className="stack sm">
              <Field label="چند توکن می‌خرید؟" hint={t.buy.minTokens ? `کمترین خرید ${fa(t.buy.minTokens)} توکن` : undefined}>
                <input className="kss-input num" inputMode="numeric" dir="ltr" value={count} onChange={(e) => setCount(e.target.value)} placeholder={t.buy.minTokens ? fa(t.buy.minTokens) : ''} />
              </Field>
              {quote && <p className="small">مبلغ: <b>{fa(quote.totalToman)} تومان</b>{quote.vatToman ? ` (با ${fa(quote.vatToman)} تومان مالیات)` : ''}</p>}
              <div><Btn variant="primary" icon="upload" busy={busy} disabled={!quote} onClick={() => void buy()}>پرداخت و خرید توکن</Btn></div>
              {error && <Alert tone="bad">{error}</Alert>}
            </div>
          ) : <Alert tone="info">{closedWhy[t.buy.reason ?? ''] ?? 'خرید توکن الان باز نیست.'}</Alert>}
          {t.lines.length ? (
            <div className="table-wrap"><table className="kss-table">
              <thead><tr><th>زمان</th><th>شرح</th><th className="num">توکن</th></tr></thead>
              <tbody>{t.lines.map((l, i) => (
                <tr key={i}><td>{ago(l.at)}</td><td>{l.what}</td><td className="num" dir="ltr">{l.amount > 0 ? '+' : '−'}{fa(Math.abs(Math.round(l.amount)))}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted small">هنوز توکنی خرج یا خریده نشده است.</p>}
        </div>
      )}
    </Card>
  );
}

const signOut = () => api.logout().catch(() => undefined).finally(() => { session.clear(); if (IN_PANEL) location.href = '/app'; else location.reload(); });

/**
 * Amin #6343: the office's settings — taking the request back, even after approval. The files go home to the manager's
 * EYVAN app, every share ends, every adviser is unlinked and this dashboard closes.
 */
function Settings({ o }: { o: Overview }) {
  const { ask: confirm, node: confirmNode } = useConfirm();
  const [done, setDone] = useState<string | null>(null);
  if (done) return <Alert tone="ok" title="درخواست پس گرفته شد" action={<Btn size="sm" onClick={() => { session.clear(); if (IN_PANEL) location.href = '/app'; else location.reload(); }}>بستن داشبورد</Btn>}>{done}</Alert>;
  return (
    <div className="stack sm">
      {confirmNode}
      <b>پس‌گرفتن درخواست پنل دفتر</b>
      <p className="muted">با پس‌گرفتن درخواست، همهٔ فایل‌های دفتر ({fa(o.files.length)} فایل) به برنامهٔ ایوان شما برمی‌گردد، همهٔ اشتراک‌ها لغو می‌شود، دسترسی همهٔ مشاوران ({fa(o.advisers.length)} نفر) قطع می‌شود و این داشبورد بسته می‌شود. برنامهٔ ایوان دوباره مثل قبل کار می‌کند. هر وقت بخواهید می‌توانید دوباره درخواست بدهید؛ توکن‌های دفتر سر جایش می‌ماند.</p>
      <div><Btn variant="danger" icon="logout" onClick={() => confirm({
        title: 'پس‌گرفتن درخواست پنل دفتر', object: o.office.name,
        consequence: 'فایل‌ها به برنامهٔ ایوان شما برمی‌گردد؛ همهٔ اشتراک‌ها لغو و دسترسی همهٔ مشاوران قطع می‌شود؛ این داشبورد بسته می‌شود.',
        confirmLabel: 'پس‌گرفتن درخواست',
        onConfirm: () => api.withdraw().then((r) => setDone(`${fa(r.files)} فایل دفتر در برنامهٔ ایوان شماست. برنامه را یک بار ببندید و باز کنید تا فایل‌ها دیده شوند.`)),
      })}>پس‌گرفتن درخواست</Btn></div>
    </div>
  );
}

function Dashboard() {
  const [o, setO] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [layer, setLayer] = useState<null | { t: 'new' } | { t: 'code' } | { t: 'send'; ids: string[] } | { t: 'shares'; id: string }>(null);
  const [nav, setNav] = useState(false);
  const toast = useToast();
  const load = useCallback(() => api.overview().then((x) => { setO(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); const t = window.setInterval(() => void load(), 60000); return () => window.clearInterval(t); }, [load]);
  const sentAll = o?.files.filter((f) => f.sentTo.length).length ?? 0;

  const meta: ReactNode = o && (
    <>
      <span><Icon name="clock" size={12} />به‌روزرسانی: {ago(o.asOf)}</span>
      <span><Icon name="users" size={12} />{fa(o.advisers.length)} مشاور وصل</span>
    </>
  );
  return (
    <div className={'shell' + (nav ? ' nav-open' : '')}>
      {nav && <div className="scrim" onClick={() => setNav(false)} />}
      <aside className="side" aria-label="منوی اصلی" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setNav(false); }}>
        <div className="side-brand"><div className="logo"><Icon name="home" size={18} /></div><div><b>ایوان</b><small>داشبورد دفتر املاک</small></div></div>
        <div className="side-group">دفتر</div>
        <nav>
          <a href="#top" className="item on" aria-current="page"><Icon name="overview" size={20} /><span>نمای کلی</span></a>
          <a href="#files" className="item"><Icon name="file" size={20} /><span>فایل‌ها</span>{!!o?.files.length && <span className="count num">{fa(o.files.length)}</span>}</a>
          <a href="#tokens" className="item"><Icon name="chart" size={20} /><span>توکن‌های دفتر</span>{o?.tokens && <span className="count num">{fa(Math.floor(o.tokens.balance))}</span>}</a>
        </nav>
        <div className="side-group">مشاوران</div>
        <nav>
          <a href="#advisers" className="item"><Icon name="user" size={20} /><span>مشاوران و اتصال</span></a>
          <a href="#sharing" className="item"><Icon name="shield" size={20} /><span>قواعد ارسال</span></a>
        </nav>
        <div className="side-group">حساب</div>
        <nav>
          <a href="#settings" className="item"><Icon name="settings" size={20} /><span>تنظیمات</span></a>
        </nav>
        <div className="grow" />
        <button className="kss-btn kss-btn--ghost kss-btn--sm side-out" onClick={() => void signOut()}><Icon name="logout" size={16} />خروج</button>
      </aside>
      <div className="main">
        <header className="top">
          <button className="kss-icon-btn menu-btn" aria-label="منو" aria-expanded={nav} onClick={() => setNav(true)}><Icon name="menu" size={20} /></button>
          <span className="ctx"><Icon name="store" />{o?.office.name ?? 'دفتر املاک'}</span>
          <div className="spacer" />
          <span className="ctx hide-sm"><Icon name="user" />مدیر دفتر</span>
          {/* Amin #6349: «خروج» always in sight, on phones too (the side menu is folded there) */}
          <button className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => void signOut()}><Icon name="logout" size={16} />خروج</button>
        </header>
        <main id="top"><div className="page">
          <PageHeader title="نمای کلی دفتر" sub={`${today()}؛ همهٔ عددها از فایل‌های دفتر و کار مشاوران وصل`} meta={meta}
            actions={<><Btn icon="plus" onClick={() => setLayer({ t: 'new' })}>فایل تازه</Btn><Btn variant="primary" icon="key" onClick={() => setLayer({ t: 'code' })}>ساخت کد اتصال مشاور</Btn></>} />
          {err && !o ? <ErrorBox what="داشبورد" error={err} retry={() => void load()} /> : !o ? <Skeleton rows={6} /> : (
            <div className="stack">
              <div className="grid g4 card-grid">
                <Kpi icon="file" k="فایل‌های تازه امروز" v={fa(o.newToday)} d={`فایل‌های ثبت‌شدهٔ دفتر از ساعت ۰۰:۰۰ · ${fa(o.newWeek)} فایل در ۷ روز`} href="#files" />
                <Kpi icon="users" k="مشاوران وصل" v={fa(o.advisers.length)} d={o.advisers.length ? `${fa(o.advisers.filter((a) => a.newFiles || a.contacts || a.closedToday).length)} نفر امروز فعال بوده‌اند` : 'با کد اتصال مشاور اضافه کنید'} href="#advisers" />
                <Kpi icon="upload" k="فایل‌های فرستاده" v={fa(sentAll)} d={`از ${fa(o.files.length)} فایل فعال دفتر · برای مشاوران`} href="#files" />
                <Kpi icon="clock" k="فایل‌های رو به انقضا" v={fa(o.expiring.length)} tone={o.expiring.length ? 'warn' : undefined} d="۷ روز آینده · تمدید یا بایگانی کنید" href="#expiring" />
              </div>
              <div className="grid g-main">
                <Card title="فایل‌های تازه در ۱۴ روز اخیر" sub="تعداد فایل ثبت‌شدهٔ دفتر در هر روز، به وقت تهران"><NewFilesChart days={o.perDay} /></Card>
                <Card title="معامله‌های باز مشاوران" sub={o.openDeals ? `${fa(o.openDeals)} معاملهٔ باز، بر اساس آخرین مرحله` : 'از برنامهٔ مشاوران وصل'}><Stages o={o} /></Card>
              </div>
              <div className="grid g-main">
                <div className="stack">
                  <Card id="advisers" title="فعالیت مشاوران امروز" sub="از ساعت ۰۰:۰۰ تا الان · مرتب بر اساس معاملهٔ بسته و فایل تازه" flush><Advisers o={o} reload={() => void load()} onCode={() => setLayer({ t: 'code' })} /></Card>
                  <Card id="expiring" title="رو به انقضا" sub="۷ روز آینده"><Expiring o={o} reload={() => void load()} /></Card>
                </div>
                <Card id="sharing" title="قواعد ارسال به مشاوران" sub="پیش‌فرض هر ارسال؛ هنگام ارسال قابل تغییر است"><Sharing o={o} reload={() => void load()} /></Card>
              </div>
              <Card id="files" title="فایل‌های دفتر" sub={`${fa(o.files.length)} فایل · انتخاب تکی یا چندتایی برای ارسال`} end={<Btn size="sm" icon="plus" onClick={() => setLayer({ t: 'new' })}>فایل تازه</Btn>} flush>
                <FilesTable o={o} onNew={() => setLayer({ t: 'new' })} onSend={(ids) => setLayer({ t: 'send', ids })} onShares={(id) => setLayer({ t: 'shares', id })} />
              </Card>
              <TokensCard reloadKey={o.asOf} />
              <Card id="settings" title="تنظیمات دفتر"><Settings o={o} /></Card>
            </div>
          )}
        </div></main>
      </div>
      {layer?.t === 'new' && <NewFileModal onClose={() => setLayer(null)} onMade={(id, title) => { toast(`«${title}» ثبت شد`); void load(); setLayer({ t: 'send', ids: [id] }); }} />}
      {layer?.t === 'code' && <CodeModal onClose={() => { setLayer(null); void load(); }} />}
      {layer?.t === 'shares' && o && <SharesModal o={o} fileId={layer.id} onClose={() => setLayer(null)} reload={() => void load()} />}
      {layer?.t === 'send' && o &&<SendModal o={o} ids={layer.ids} onClose={() => setLayer(null)} onSent={() => { setLayer(null); void load(); }} />}
    </div>
  );
}

function App() {
  const handed = new URLSearchParams(location.search).has('h');
  const [inside, setInside] = useState(!handed && !!session.get());
  const onIn = useCallback(() => setInside(true), []);
  return <ToastProvider>{inside ? <Dashboard /> : handed ? <FromPanel onIn={onIn} /> : <Login onIn={onIn} />}</ToastProvider>;
}

createRoot(document.getElementById('root')!).render(<App />);
