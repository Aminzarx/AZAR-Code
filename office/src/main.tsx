import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import qrcode from 'qrcode-generator';
import './styles/tokens.css';
import './styles/kss-kit.css';
import './styles/base.css';
import './office.css';
import { applyTheme } from './lib/theme';
import { ago, digits } from './lib/fmt';
import { Alert, Badge, Btn, Card, Empty, ErrorBox, Field, Kpi, Modal, PageHeader, SearchBox, Segmented, Skeleton, ToastProvider, useAction, useConfirm, useToast } from './ui/kit';
import { Icon } from './ui/icons';
import { api, ApiError, IN_PANEL, session, type Adviser, type Contact, type NewFile, type OfficeFile, type Overview, type Rules, type Quote, type SignedIn, type Tokens } from './api';
import { ApplicantModal, ApplicantRecord, ApplicantsPage, ContractModal, ContractsPage, DivarCard, DivarImport, FileMatches, MatchingPage, ReminderModal, RemindersPage, TodayCard, useDesk } from './work';

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
/** Amin #6531: only a file sent to advisers has an end; the manager's own unsent files never expire */
const dated = (f: OfficeFile) => !f.expiresAt.startsWith('9999');
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
  if (!o.expiring.length) return <Empty compact title="هفتهٔ آینده فایلی منقضی نمی‌شود">فایلی که برای مشاوران می‌فرستید ۳۰ روز اعتبار دارد و در ۷ روز آخر این‌جا می‌آید؛ فایل‌های خودتان که فرستاده نشده‌اند انقضا ندارند.</Empty>;
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
function NewFileModal({ onClose, onMade, divarOn }: { onClose: () => void; onMade: (id: string, title: string) => void; divarOn?: boolean }) {
  const [f, setF] = useState<Record<string, string>>({ kind: 'فروش', city: 'تهران' });
  // Amin #6337: a Divar post (the manager's own) fills the form for checking
  const fill = (nf: NewFile) => setF((x) => ({ ...x, ...Object.fromEntries(Object.entries(nf).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => [k, String(v)])) }));
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
    <Modal title="فایل تازهٔ دفتر" sub="فایل در برنامهٔ ایوان شما هم ثبت می‌شود و می‌توانید برای مشاوران بفرستید" onClose={onClose} size="wide" locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!f.title?.trim() || !f.region?.trim()} onClick={() => void save()}>ثبت فایل</Btn></>}>
      {divarOn ? <DivarImport onFill={fill} /> : <p className="muted small divar-hint"><Icon name="link" size={14} />ورود فایل از لینک آگهی دیوار را می‌توانید از <a href="#/settings" onClick={onClose}>تنظیمات</a> روشن کنید.</p>}
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
      <p className="muted small">ثبت فایل یک بار، به اندازهٔ حجم فایل، از توکن‌ها کم می‌کند و فایل در برنامهٔ ایوان شما هم دیده می‌شود.</p>
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#/tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
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
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#/tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
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

function FilesTable({ o, onNew, onSend, onShares, onOpen }: { o: Overview; onNew: () => void; onSend: (ids: string[]) => void; onShares: (id: string) => void; onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<string>('all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const names = useMemo(() => new Map(o.advisers.map((a) => [a.id, a.name])), [o.advisers]);
  const rows = o.files.filter((f) => (kind === 'all' || f.kind === kind) && (!q || [f.title, f.region, f.city, f.ownerName].some((x) => x?.includes(q))));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // a click on the row opens the file, except on its checkbox or its own buttons (Amin #6336)
  const open = (e: { target: EventTarget }, id: string) => { if (!(e.target as HTMLElement).closest('input, button, a, label')) onOpen(id); };
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
        <>
        {/* Amin #6342: on a phone the table becomes cards */}
        <ul className="plain file-cards">
          {rows.map((f) => (
            <li key={f.id} className="file-card" onClick={(e) => open(e, f.id)}>
              <input type="checkbox" className="kss-check" checked={picked.has(f.id)} onChange={() => toggle(f.id)} aria-label={'انتخاب ' + f.title} />
              <div className="grow">
                <b>{f.title}</b>
                <div className="faint xs">{f.kind} · {[f.city, f.region].filter(Boolean).join('، ')}{f.size != null ? ` · ${fa(f.size)} متر` : ''}</div>
                <div className="row tight wrap mt-xs"><span className="num small">{priceOf(f)}</span>{sentTo(f) ? <Badge tone="info" icon={false}>{sentTo(f)}</Badge> : null}{dated(f) && daysLeft(f.expiresAt) <= 7 ? <Badge tone="warn">{fa(daysLeft(f.expiresAt))} روز مانده</Badge> : null}</div>
              </div>
              <Icon name="chevron" size={18} />
            </li>
          ))}
        </ul>
        <div className="tbl-wrap file-tbl"><table className="tbl">
          <thead><tr><th style={{ inlineSize: 40 }}><span className="sr-only">انتخاب</span></th><th>فایل</th><th>نوع</th><th className="num">قیمت</th><th className="num">متراژ</th><th>ثبت</th><th>فرستاده به</th><th>انقضا</th></tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="clickable" onClick={(e) => open(e, f.id)} title="باز کردن پرونده">
                <td><input type="checkbox" className="kss-check" checked={picked.has(f.id)} onChange={() => toggle(f.id)} aria-label={'انتخاب ' + f.title} /></td>
                <td><b style={{ fontWeight: 500 }}>{f.title}</b><div className="faint xs">{f.city}، {f.region}</div></td>
                <td><Badge tone={f.kind === 'فروش' ? 'info' : 'neutral'} icon={false}>{f.kind}</Badge></td>
                <td className="num nowrap">{priceOf(f)}</td>
                <td className="num">{f.size != null ? fa(f.size) + ' متر' : '—'}</td>
                <td className="muted nowrap">{ago(f.createdAt)}</td>
                <td>{sentTo(f) ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm" onClick={() => onShares(f.id)} title="دیدن و لغو اشتراک">{sentTo(f)}</button> : <span className="faint">فرستاده نشده</span>}</td>
                <td>{!dated(f) ? <span className="faint">بدون انقضا</span> : daysLeft(f.expiresAt) <= 7 ? <Badge tone="warn">{fa(daysLeft(f.expiresAt))} روز مانده</Badge> : <span className="faint">{fa(daysLeft(f.expiresAt))} روز</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        </>
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

/**
 * Amin #6338: «افزودن مشاور» — the connection code laid out so a newcomer follows it: the QR big, three numbered steps
 * that name the exact place in the app, the code and word each in its own box with «کپی», and «کپی پیام برای مشاور»
 * (the steps + code + word ready to paste in a chat). One-time, one adviser, 7 days (the server's rule).
 */
function CodeModal({ onClose }: { onClose: () => void }) {
  const [c, setC] = useState<{ code: string; word: string; expiresAt?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => { api.newCode().then(setC, (e: Error) => setErr(e.message)); }, []);
  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => toast(`${what} کپی شد`), () => toast('کپی نشد؛ دستی بنویسید'));
  };
  const message = c ? [
    'برای اتصال به داشبورد دفتر در برنامهٔ ایوان:',
    '۱. برنامهٔ ایوان را باز کنید (اگر ندارید: kssx.ir/dl/eyvan.apk)',
    '۲. تنظیمات ← اتصال‌ها و API‌ها ← دفتر املاک ← اتصال به داشبورد دفتر',
    `۳. کد اتصال ${digits(c.code)} و کلمهٔ «${c.word}» را بنویسید.`,
    'این کد یک‌بار مصرف است و ۷ روز اعتبار دارد.',
  ].join('\n') : '';
  return (
    <Modal title="افزودن مشاور به دفتر" sub={c?.expiresAt ? `کد یک‌بار مصرف، برای یک مشاور · تا ${persianDate(c.expiresAt)} معتبر` : 'کد یک‌بار مصرف، برای یک مشاور، ۷ روز اعتبار'}
      onClose={onClose} size="wide"
      footer={<>{c && <Btn icon="copy" onClick={() => copy(message, 'پیام')}>کپی پیام برای مشاور</Btn>}<Btn variant="primary" onClick={onClose}>تمام</Btn></>}>
      {err ? <Alert tone="bad">{err}</Alert> : !c ? <Skeleton rows={4} /> : (
        <div className="join-grid">
          <div className="join-qr">
            <Qr text={`eyvan://office-join?c=${c.code}&w=${encodeURIComponent(c.word)}`} size={208} label="بارکد اتصال مشاور" />
            <span className="muted small">مشاور این بارکد را با برنامهٔ ایوان اسکن می‌کند</span>
          </div>
          <div className="stack">
            <ol className="join-steps">
              <li><b>برنامهٔ ایوان</b> را روی گوشی مشاور باز کنید. <span className="muted">اگر نصب نیست: kssx.ir/dl/eyvan.apk</span></li>
              <li>در برنامه: <b>تنظیمات ← اتصال‌ها و API‌ها ← دفتر املاک ← اتصال به داشبورد دفتر</b></li>
              <li><b>«اسکن بارکد کد اتصال»</b> را بزنید و همین بارکد را اسکن کنید؛ یا کد و کلمهٔ زیر را بنویسید.</li>
            </ol>
            <div className="join-codes">
              <div className="join-box">
                <span className="muted small">کد اتصال</span>
                <b className="code-big num" dir="ltr">{digits(c.code)}</b>
                <button type="button" className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => copy(c.code, 'کد')}><Icon name="copy" size={14} />کپی</button>
              </div>
              <div className="join-box">
                <span className="muted small">کلمه</span>
                <b className="word-big">{c.word}</b>
                <button type="button" className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => copy(c.word, 'کلمه')}><Icon name="copy" size={14} />کپی</button>
              </div>
            </div>
            <Alert tone="info">بعد از اتصال، نام مشاور در «مشاوران» دیده می‌شود و می‌توانید برایش فایل بفرستید.</Alert>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Amin #6336: a file's own record — everything on it, who has it, and what can be done with it */
function FileModal({ o, f, onClose, onSend, onShares, reload, onContract, onReminder, openApplicant }: {
  o: Overview; f: OfficeFile; onClose: () => void; onSend: () => void; onShares: () => void; reload: () => void;
  onContract: () => void; onReminder: () => void; openApplicant: (id: string) => void;
}) {
  const { busy, run } = useAction();
  const left = daysLeft(f.expiresAt);
  const names = new Map(o.advisers.map((a) => [a.id, a.name]));
  const holders = (f.shares ?? []).map((s) => (s.adviserId === '*' ? 'همهٔ مشاوران' : names.get(s.adviserId) ?? 'مشاور') + (s.until ? ` (تا ${persianDate(s.until)})` : ''));
  const row = (k: string, v: ReactNode) => (v === null || v === '' || v === undefined ? null : <><dt>{k}</dt><dd>{v}</dd></>);
  return (
    <Modal title={f.title} sub={[f.propertyType, [f.city, f.region].filter(Boolean).join('، ')].filter(Boolean).join(' · ')} onClose={onClose} dismissable
      footer={<>{dated(f) && <Btn onClick={() => run(() => api.renew(f.id).then(reload), 'فایل ۳۰ روز تمدید شد')} disabled={busy}>تمدید ۳۰ روز</Btn>}<Btn icon="clock" onClick={onReminder}>یادآور</Btn><Btn icon="verified" onClick={onContract}>ثبت قرارداد</Btn><Btn variant="primary" icon="upload" onClick={onSend}>ارسال به مشاوران</Btn></>}>
      <div className="stack">
        <div className="row tight wrap">
          <Badge tone={f.kind === 'فروش' ? 'info' : 'neutral'} icon={false}>{f.kind}</Badge>
          <Badge tone="neutral" icon="mobile">در برنامهٔ ایوان هم هست</Badge>
          {dated(f) ? (left <= 7 ? <Badge tone="warn">{left ? fa(left) + ' روز تا انقضا' : 'امروز منقضی می‌شود'}</Badge> : <Badge tone="neutral" icon={false}>{fa(left)} روز اعتبار</Badge>) : <Badge tone="neutral" icon={false}>بدون انقضا</Badge>}
        </div>
        <dl className="kv file-kv">
          {row('قیمت', f.kind === 'فروش' || f.kind === 'تهاتر' ? (f.price != null ? money(f.price) : null) : null)}
          {row('ودیعه', f.deposit != null ? money(f.deposit) : null)}
          {row('اجاره', f.rent != null ? money(f.rent) : null)}
          {row('متراژ', f.size != null ? fa(f.size) + ' متر' : null)}
          {row('اتاق', f.rooms != null ? fa(f.rooms) : null)}
          {row('آدرس', f.address)}
          {row('توضیح', f.description)}
          {row('مالک', f.ownerName || f.ownerPhone ? <span className="row tight">{f.ownerName}{f.ownerPhone && <a href={`tel:${f.ownerPhone}`} className="num" dir="ltr">{digits(f.ownerPhone)}</a>}</span> : null)}
          {row('ثبت', ago(f.createdAt))}
          {row('توکن هر ارسال', f.tokens != null ? fa(Math.round(f.tokens * 100) / 100) : null)}
        </dl>
        <Card title="فرستاده به" sub={holders.length ? `${fa(holders.length)} مورد` : undefined}
          end={holders.length ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm" onClick={onShares}>دیدن و لغو</button> : undefined}>
          {holders.length ? <ul className="plain stack sm">{holders.map((h, i) => <li key={i}>{h}</li>)}</ul> : <span className="faint">هنوز برای مشاوری فرستاده نشده است.</span>}
        </Card>
        {/* Amin #6333: the applicants this file fits, by the app's matching rules */}
        <FileMatches fileId={f.id} openApplicant={openApplicant} />
      </div>
    </Modal>
  );
}

/** Amin #6342 «اشتراک فایل‌ها» from the phone's bottom bar: pick files, then the usual send window */
function PickFilesModal({ o, onClose, onNext }: { o: Overview; onClose: () => void; onNext: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const rows = o.files.filter((f) => !q || [f.title, f.region, f.city].some((x) => x?.includes(q)));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Modal title="اشتراک فایل‌ها" sub="فایل‌هایی را که می‌خواهید برای مشاوران بفرستید انتخاب کنید" onClose={onClose}
      footer={<Btn variant="primary" icon="upload" disabled={!picked.size} onClick={() => onNext([...picked])}>{picked.size ? `ادامه با ${fa(picked.size)} فایل` : 'ادامه'}</Btn>}>
      {!o.files.length ? <Empty compact title="دفتر هنوز فایلی ندارد">اول یک فایل تازه ثبت کنید.</Empty> : (
        <div className="stack sm">
          <SearchBox value={q} onChange={setQ} placeholder="جست‌وجو در عنوان یا منطقه" />
          <ul className="plain pick-list">
            {rows.map((f) => (
              <li key={f.id}><label className="pick-row">
                <input type="checkbox" className="kss-check" checked={picked.has(f.id)} onChange={() => toggle(f.id)} />
                <span className="grow"><b>{f.title}</b><span className="faint xs block">{f.kind} · {f.region || f.city} · {priceOf(f)}</span></span>
              </label></li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

/**
 * Amin #6335 «دفترچه تلفن»: the manager's app contacts (one set of data, #6330) — search, add (it shows in the app too),
 * call, and «خروجی CSV» for Excel.
 */
function PhoneBook({ addKey }: { addKey: number }) {
  const [list, setList] = useState<{ contacts: Contact[]; roles: Record<string, string> } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const load = useCallback(() => api.contacts().then((x) => { setList(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (addKey) setAdding(true); }, [addKey]);
  const csv = async () => {
    try {
      const blob = await api.contactsCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'دفترچه-تلفن.csv';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };
  const rows = (list?.contacts ?? []).filter((c) => !q || [c.name, c.phone, c.notes].some((x) => x.includes(q) || toLatinDigits(x).includes(toLatinDigits(q))));
  return (
    <Card id="contacts" title="مخاطبان" sub={list ? `${fa(list.contacts.length)} مخاطب · همان مخاطبان برنامهٔ ایوان شما` : 'مخاطبان برنامهٔ ایوان شما'} flush
      end={<span className="row tight"><Btn size="sm" icon="download" onClick={() => void csv()} disabled={!list?.contacts.length}>خروجی CSV</Btn><Btn size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>مخاطب تازه</Btn></span>}>
      {err && !list ? <div className="pad"><ErrorBox what="دفترچه تلفن" error={err} retry={() => void load()} /></div> : !list ? <div className="pad"><Skeleton rows={3} /></div> : !list.contacts.length ? (
        <Empty title="دفترچه هنوز خالی است" action={<Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>مخاطب تازه</Btn>}>مخاطبانی که در برنامهٔ ایوان دارید این‌جا هم دیده می‌شوند؛ مخاطبی که این‌جا اضافه کنید در برنامه هم هست.</Empty>
      ) : (
        <>
          <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="جست‌وجو در نام، شماره، یادداشت" /></div>
          {!rows.length ? <Empty kind="filtered" title="مخاطبی با این جست‌وجو پیدا نشد">متن جست‌وجو را تغییر دهید.</Empty> : (
            <ul className="plain contact-list">
              {rows.map((c) => (
                <li key={c.id} className="contact-row">
                  <span className="contact-avatar" aria-hidden="true">{c.name.trim().charAt(0) || '؟'}</span>
                  <span className="grow">
                    <b>{c.name}</b>
                    <span className="faint xs block">{[c.roles.map((r) => list.roles[r] ?? r).join('، '), c.notes].filter(Boolean).join(' · ') || ' '}</span>
                  </span>
                  <a className="num contact-phone" dir="ltr" href={`tel:${c.phone}`} title="تماس">{digits(c.phone)}</a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {adding && <ContactModal roles={list?.roles ?? {}} onClose={() => setAdding(false)} onMade={(name) => { setAdding(false); toast(`«${name}» به دفترچه اضافه شد`); void load(); }} />}
    </Card>
  );
}
const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

function ContactModal({ roles, onClose, onMade }: { roles: Record<string, string>; onClose: () => void; onMade: (name: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const { busy, run, error } = useAction();
  const submit = () => run(async () => { await api.addContact({ name: name.trim(), phone: toLatinDigits(phone), role: role || undefined, notes: notes.trim() || undefined }); onMade(name.trim()); });
  return (
    <Modal title="مخاطب تازه" sub="در برنامهٔ ایوان شما هم اضافه می‌شود" onClose={onClose} size="sm" locked={busy}
      footer={<Btn variant="primary" busy={busy} disabled={!name.trim() || !phone.trim()} onClick={() => void submit()}>افزودن</Btn>}>
      <form className="stack sm" onSubmit={(e) => { e.preventDefault(); if (name.trim() && phone.trim()) void submit(); }}>
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="نام" required><input className="kss-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus /></Field>
        <Field label="شماره" required hint="همراه مثل ۰۹۱۲۱۲۳۴۵۶۷ یا ثابت با پیش‌شماره"><input className="kss-input num" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} /></Field>
        <Field label="نقش">
          <select className="kss-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">بدون نقش</option>
            {Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="یادداشت"><textarea className="kss-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></Field>
      </form>
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
    <Card id="tokens" title="توکن‌های مشترک برنامه و داشبورد" sub="برنامهٔ ایوان و این داشبورد یک موجودی دارند: هر فایل یک بار به اندازهٔ حجمش، و ارسال آن برای هر مشاوری که فایل را ندارد، از همین موجودی کم می‌شود">
      {err && !t ? <Alert tone="bad">{err}</Alert> : !t ? <Skeleton rows={3} /> : (
        <div className="stack">
          <div className="grid g4 card-grid">
            <Kpi icon="chart" k="موجودی مشترک" v={fa(Math.floor(t.balance))} tone={t.balance <= 0 ? 'warn' : undefined} d="همان موجودی برنامهٔ ایوان شما؛ مشاوران از آن خرج نمی‌کنند" />
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
      <p className="muted">با پس‌گرفتن درخواست، فایل‌ها ({fa(o.files.length)} فایل) که همان فایل‌های برنامهٔ ایوان شماست سر جایشان می‌مانند، همهٔ اشتراک‌ها لغو می‌شود، دسترسی همهٔ مشاوران ({fa(o.advisers.length)} نفر) قطع می‌شود و این داشبورد بسته می‌شود. برنامهٔ ایوان دوباره مثل قبل کار می‌کند. هر وقت بخواهید می‌توانید دوباره درخواست بدهید؛ توکن‌ها هم در برنامه می‌ماند.</p>
      <div><Btn variant="danger" icon="logout" onClick={() => confirm({
        title: 'پس‌گرفتن درخواست پنل دفتر', object: o.office.name,
        consequence: 'فایل‌ها به برنامهٔ ایوان شما برمی‌گردد؛ همهٔ اشتراک‌ها لغو و دسترسی همهٔ مشاوران قطع می‌شود؛ این داشبورد بسته می‌شود.',
        confirmLabel: 'پس‌گرفتن درخواست',
        onConfirm: () => api.withdraw().then((r) => setDone(`${fa(r.files)} فایل دفتر در برنامهٔ ایوان شماست. برنامه را یک بار ببندید و باز کنید تا فایل‌ها دیده شوند.`)),
      })}>پس‌گرفتن درخواست</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ pages ----
/**
 * Amin #6333: one page per section (hash routes «#/files», «#/applicants/<id>»…), a grouped sidebar, each page with its
 * own header and actions. The old one-page anchors («#files», «#tokens»…) still land on their page.
 */
const PAGES = ['overview', 'files', 'applicants', 'matching', 'contracts', 'reminders', 'contacts', 'advisers', 'tokens', 'settings'] as const;
type Page = (typeof PAGES)[number];
const LEGACY: Record<string, Page> = { top: 'overview', files: 'files', tokens: 'tokens', advisers: 'advisers', sharing: 'advisers', contacts: 'contacts', settings: 'settings' };
function readRoute(): { page: Page; id: string | null } {
  let h = '';
  try { h = decodeURIComponent(location.hash.replace(/^#\/?/, '')); } catch { h = ''; }
  const [p = '', id = ''] = h.split('/');
  const page = (PAGES as readonly string[]).includes(p) ? (p as Page) : LEGACY[p] ?? 'overview';
  return { page, id: id || null };
}
function useRoute() {
  const [r, setR] = useState(readRoute);
  useEffect(() => {
    const on = () => { setR(readRoute()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
const go = (path: string) => { location.hash = '#/' + path; };

type NavItem = { page: Page; label: string; icon: string; count?: number | null; alert?: boolean };
function SideNav({ page, groups }: { page: Page; groups: { title: string; items: NavItem[] }[] }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.title}>
          <div className="side-group">{g.title}</div>
          <nav>
            {g.items.map((i) => (
              <a key={i.page} href={'#/' + i.page} className={'item' + (page === i.page ? ' on' : '')} aria-current={page === i.page ? 'page' : undefined}>
                <Icon name={i.icon} size={20} /><span>{i.label}</span>
                {!!i.count && <span className={'count num' + (i.alert ? ' alert' : '')}>{fa(i.count)}</span>}
              </a>
            ))}
          </nav>
        </div>
      ))}
    </>
  );
}

/** Amin #6342: «＋» in the phone's bottom bar — what to add */
function AddSheet({ onClose, pick }: { onClose: () => void; pick: (t: 'file' | 'applicant' | 'reminder' | 'contract') => void }) {
  const items: { t: 'file' | 'applicant' | 'reminder' | 'contract'; icon: string; label: string; sub: string }[] = [
    { t: 'file', icon: 'file', label: 'فایل تازه', sub: 'ملک برای فروش، رهن و اجاره یا تهاتر' },
    { t: 'applicant', icon: 'users', label: 'متقاضی تازه', sub: 'خریدار، مستأجر یا متقاضی تهاتر' },
    { t: 'reminder', icon: 'clock', label: 'یادآور تازه', sub: 'تماس، بازدید یا هر کار دیگر' },
    { t: 'contract', icon: 'verified', label: 'ثبت قرارداد', sub: 'برای یک فایل و یک متقاضی' },
  ];
  return (
    <Modal title="افزودن" size="sm" onClose={onClose} dismissable>
      <ul className="plain add-sheet">
        {items.map((i) => (
          <li key={i.t}><button type="button" className="add-item" onClick={() => pick(i.t)}>
            <span className="add-ico"><Icon name={i.icon} size={20} /></span>
            <span className="grow"><b>{i.label}</b><span className="faint xs block">{i.sub}</span></span>
            <Icon name="chevron" size={18} />
          </button></li>
        ))}
      </ul>
    </Modal>
  );
}

type Layer = null | { t: 'new' } | { t: 'code' } | { t: 'send'; ids: string[] } | { t: 'shares'; id: string } | { t: 'file'; id: string } | { t: 'pick' }
  | { t: 'add' } | { t: 'newApplicant' } | { t: 'applicant'; id: string } | { t: 'contract'; preset: { applicantId?: string; fileId?: string } }
  | { t: 'reminder'; preset: { applicantId?: string; fileId?: string; title?: string } };

function Dashboard() {
  const [o, setO] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer>(null);
  const [nav, setNav] = useState(false);
  const [addContact, setAddContact] = useState(0); // Amin #6342: «مخاطبین» in the bottom bar opens the phone book
  const [work, setWork] = useState(0); // bumped after anything is added or changed: pages and the sidebar's numbers reload
  const { page, id: routeId } = useRoute();
  const toast = useToast();
  const load = useCallback(() => api.overview().then((x) => { setO(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); const t = window.setInterval(() => { void load(); setWork((w) => w + 1); }, 60000); return () => window.clearInterval(t); }, [load]);
  const desk = useDesk(work);
  const [divarOn, setDivarOn] = useState<boolean | null>(null);
  useEffect(() => { if (desk) setDivarOn(desk.divar.on); }, [desk]);
  const changed = () => { setWork((w) => w + 1); void load(); };
  // another page closes what was open; a deep link «#/applicants/<id>» opens that record
  useEffect(() => { setLayer(page === 'applicants' && routeId ? { t: 'applicant', id: routeId } : null); setNav(false); }, [page, routeId]);
  const sentAll = o?.files.filter((f) => f.sentTo.length).length ?? 0;
  const openFile = (id: string) => setLayer({ t: 'file', id });
  const openApplicant = (id: string) => setLayer({ t: 'applicant', id });
  const onContract = (preset: { applicantId?: string; fileId?: string }) => setLayer({ t: 'contract', preset });
  const onReminder = (preset: { applicantId?: string; fileId?: string; title?: string }) => setLayer({ t: 'reminder', preset });
  const closeLayer = () => { if (layer?.t === 'applicant' && page === 'applicants' && routeId) go('applicants'); setLayer(null); };
  const due = desk ? desk.reminders.overdue + desk.reminders.today : 0;

  const groups: { title: string; items: NavItem[] }[] = [
    { title: 'دفتر', items: [
      { page: 'overview', label: 'نمای کلی', icon: 'overview' },
      { page: 'files', label: 'فایل‌ها', icon: 'file', count: o?.files.length },
      { page: 'applicants', label: 'متقاضیان', icon: 'users', count: desk?.applicants },
      { page: 'matching', label: 'تطبیق', icon: 'insights' },
    ] },
    { title: 'کارها', items: [
      { page: 'contracts', label: 'قراردادها', icon: 'verified', count: desk?.contracts },
      { page: 'reminders', label: 'یادآورها', icon: 'clock', count: due, alert: !!desk?.reminders.overdue },
      { page: 'contacts', label: 'دفترچه تلفن', icon: 'calls' },
    ] },
    { title: 'مشاوران', items: [{ page: 'advisers', label: 'مشاوران و اتصال', icon: 'agent', count: o?.advisers.length }] },
    { title: 'حساب', items: [
      { page: 'tokens', label: 'توکن‌ها', icon: 'bolt', count: o?.tokens ? Math.floor(o.tokens.balance) : null },
      { page: 'settings', label: 'تنظیمات', icon: 'settings' },
    ] },
  ];

  /** the pages that read the office's overview (files, advisers, tokens) wait for it */
  const needO = (body: (o: Overview) => ReactNode) => (err && !o ? <ErrorBox what="داشبورد" error={err} retry={() => void load()} /> : !o ? <Skeleton rows={6} /> : body(o));
  const newFileBtn = <Btn variant="primary" icon="plus" onClick={() => setLayer({ t: 'new' })}>فایل تازه</Btn>;

  const pageBody = (): ReactNode => {
    switch (page) {
      case 'files':
        return (
          <>
            <PageHeader title="فایل‌ها" sub="همان فایل‌های برنامهٔ ایوان شما؛ برای ارسال به مشاوران یکی یا چندتا را انتخاب کنید"
              meta={o && <><span><Icon name="file" size={12} />{fa(o.files.length)} فایل فعال</span><span><Icon name="upload" size={12} />{fa(sentAll)} فایل برای مشاوران فرستاده شده</span></>}
              actions={<><Btn icon="upload" disabled={!o?.files.length} onClick={() => setLayer({ t: 'pick' })}>اشتراک فایل‌ها</Btn>{newFileBtn}</>} />
            {needO((o) => (
              <div className="stack">
                <Card id="files" flush>
                  <FilesTable o={o} onNew={() => setLayer({ t: 'new' })} onSend={(ids) => setLayer({ t: 'send', ids })} onShares={(id) => setLayer({ t: 'shares', id })} onOpen={openFile} />
                </Card>
                {/* Amin #6531: only files sent to advisers expire */}
                <Card id="expiring" title="رو به انقضا" sub="فایل‌های فرستاده برای مشاوران · ۷ روز آینده"><Expiring o={o} reload={() => void load()} /></Card>
              </div>
            ))}
          </>
        );
      case 'applicants':
        return <ApplicantsPage openApplicant={openApplicant} onNew={() => setLayer({ t: 'newApplicant' })} reloadKey={work} />;
      case 'matching':
        return <MatchingPage openFile={openFile} openApplicant={openApplicant} onContract={onContract} onReminder={onReminder} reloadKey={work} />;
      case 'contracts':
        return <ContractsPage openFile={openFile} openApplicant={openApplicant} onNew={() => onContract({})} reloadKey={work} />;
      case 'reminders':
        return <RemindersPage openFile={openFile} openApplicant={openApplicant} onNew={() => onReminder({})} reloadKey={work} />;
      case 'contacts':
        return (
          <>
            <PageHeader title="دفترچه تلفن" sub="مخاطبان برنامهٔ ایوان شما؛ مخاطب تازه در برنامه هم اضافه می‌شود" />
            <PhoneBook addKey={addContact} />
          </>
        );
      case 'advisers':
        return (
          <>
            <PageHeader title="مشاوران و اتصال" sub="فعالیت امروز مشاوران وصل، کدهای اتصال و قواعد ارسال فایل"
              meta={o && <span><Icon name="users" size={12} />{fa(o.advisers.length)} مشاور وصل</span>}
              actions={<Btn variant="primary" icon="key" onClick={() => setLayer({ t: 'code' })}>ساخت کد اتصال مشاور</Btn>} />
            {needO((o) => (
              <div className="grid g-main">
                <Card id="advisers" title="فعالیت مشاوران امروز" sub="از ساعت ۰۰:۰۰ تا الان · مرتب بر اساس معاملهٔ بسته و فایل تازه" flush><Advisers o={o} reload={() => void load()} onCode={() => setLayer({ t: 'code' })} /></Card>
                <Card id="sharing" title="قواعد ارسال به مشاوران" sub="پیش‌فرض هر ارسال؛ هنگام ارسال قابل تغییر است"><Sharing o={o} reload={() => void load()} /></Card>
              </div>
            ))}
          </>
        );
      case 'tokens':
        return (
          <>
            <PageHeader title="توکن‌ها" sub="یک موجودی برای برنامهٔ ایوان و این داشبورد" />
            {needO((o) => <TokensCard reloadKey={o.asOf} />)}
          </>
        );
      case 'settings':
        return (
          <>
            <PageHeader title="تنظیمات دفتر" sub="اتصال‌ها و پنل دفتر" />
            {needO((o) => (
              <div className="stack">
                <DivarCard onChange={(on) => { setDivarOn(on); setWork((w) => w + 1); }} />
                <Card id="settings" title="پنل دفتر"><Settings o={o} /></Card>
              </div>
            ))}
          </>
        );
      default:
        return (
          <>
            <PageHeader title="نمای کلی دفتر" sub={`${today()}؛ همهٔ عددها از فایل‌ها، متقاضیان و کارهای برنامهٔ ایوان شما و مشاوران وصل`}
              meta={o && <><span><Icon name="clock" size={12} />به‌روزرسانی: {ago(o.asOf)}</span><span><Icon name="users" size={12} />{fa(o.advisers.length)} مشاور وصل</span></>}
              actions={<><Btn icon="users" onClick={() => setLayer({ t: 'newApplicant' })}>متقاضی تازه</Btn>{newFileBtn}</>} />
            {needO((o) => (
              <div className="stack">
                <div className="grid g4 card-grid">
                  <Kpi icon="file" k="فایل‌های تازه امروز" v={fa(o.newToday)} d={`از ساعت ۰۰:۰۰ · ${fa(o.newWeek)} فایل در ۷ روز · ${fa(o.files.length)} فایل فعال`} href="#/files" />
                  <Kpi icon="users" k="متقاضیان فعال" v={desk ? fa(desk.applicants) : '—'} d={desk ? `${fa(desk.contracts)} قرارداد فعال` : 'از برنامهٔ ایوان شما'} href="#/applicants" />
                  <Kpi icon="clock" k="کارهای امروز" v={desk ? fa(due) : '—'} tone={desk?.reminders.overdue ? 'warn' : undefined}
                    d={desk ? (desk.reminders.overdue ? `${fa(desk.reminders.overdue)} یادآور عقب‌افتاده` : 'یادآور عقب‌افتاده‌ای نیست') : 'یادآورهای برنامهٔ ایوان'} href="#/reminders" />
                  <Kpi icon="bolt" k="توکن‌های مشترک" v={o.tokens ? fa(Math.floor(o.tokens.balance)) : '—'} d="یک موجودی برای برنامهٔ ایوان و این داشبورد" href="#/tokens" />
                </div>
                <div className="grid g-main">
                  <Card title="فایل‌های تازه در ۱۴ روز اخیر" sub="تعداد فایل ثبت‌شده در هر روز، به وقت تهران"><NewFilesChart days={o.perDay} /></Card>
                  <TodayCard openFile={openFile} openApplicant={openApplicant} onNew={() => onReminder({})} reloadKey={work} />
                </div>
                <div className="grid g-main">
                  <Card title="فعالیت مشاوران امروز" sub="از ساعت ۰۰:۰۰ تا الان" flush end={<a className="kss-btn kss-btn--ghost kss-btn--sm" href="#/advisers">همه</a>}>
                    <Advisers o={o} reload={() => void load()} onCode={() => setLayer({ t: 'code' })} />
                  </Card>
                  <Card title="معامله‌های باز مشاوران" sub={o.openDeals ? `${fa(o.openDeals)} معاملهٔ باز، بر اساس آخرین مرحله` : 'از برنامهٔ مشاوران وصل'}><Stages o={o} /></Card>
                </div>
              </div>
            ))}
          </>
        );
    }
  };

  const fileOf = (id: string) => o?.files.find((x) => x.id === id);
  return (
    <div className={'shell' + (nav ? ' nav-open' : '')}>
      {nav && <div className="scrim" onClick={() => setNav(false)} />}
      <aside className="side" aria-label="منوی اصلی" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setNav(false); }}>
        <div className="side-brand"><div className="logo"><Icon name="home" size={18} /></div><div><b>ایوان</b><small>داشبورد دفتر املاک</small></div></div>
        <SideNav page={page} groups={groups} />
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
        <main id="top"><div className="page" key={page}>{pageBody()}</div></main>
      </div>
      {layer?.t === 'new' && <NewFileModal divarOn={!!divarOn} onClose={() => setLayer(null)} onMade={(id, title) => { toast(`«${title}» ثبت شد`); changed(); setLayer({ t: 'send', ids: [id] }); }} />}
      {layer?.t === 'code' && <CodeModal onClose={() => { setLayer(null); void load(); }} />}
      {layer?.t === 'shares' && o && <SharesModal o={o} fileId={layer.id} onClose={() => setLayer(null)} reload={() => void load()} />}
      {layer?.t === 'file' && o && (() => {
        const f = fileOf(layer.id);
        return f ? <FileModal o={o} f={f} onClose={() => setLayer(null)} onSend={() => setLayer({ t: 'send', ids: [f.id] })} onShares={() => setLayer({ t: 'shares', id: f.id })} reload={() => void load()}
          onContract={() => onContract({ fileId: f.id })} onReminder={() => onReminder({ fileId: f.id, title: `پیگیری ${f.title}` })} openApplicant={openApplicant} /> : null;
      })()}
      {layer?.t === 'pick' && o && <PickFilesModal o={o} onClose={() => setLayer(null)} onNext={(ids) => setLayer({ t: 'send', ids })} />}
      {layer?.t === 'add' && <AddSheet onClose={() => setLayer(null)} pick={(t) => setLayer(t === 'file' ? { t: 'new' } : t === 'applicant' ? { t: 'newApplicant' } : t === 'reminder' ? { t: 'reminder', preset: {} } : { t: 'contract', preset: {} })} />}
      {layer?.t === 'newApplicant' && <ApplicantModal onClose={() => setLayer(null)} onMade={(a) => { toast(`«${a.name}» ثبت شد`); changed(); setLayer({ t: 'applicant', id: a.id }); }} />}
      {layer?.t === 'applicant' && <ApplicantRecord id={layer.id} onClose={closeLayer} openFile={openFile} onContract={onContract} onReminder={onReminder} onChanged={changed} reloadKey={work} />}
      {layer?.t === 'contract' && <ContractModal files={o?.files ?? []} preset={layer.preset} onClose={() => setLayer(null)} onMade={(c) => { toast('قرارداد ثبت شد'); changed(); setLayer(null); if (page !== 'contracts') toast(`«${c.fileTitle}» دیگر در پیشنهادها نمی‌آید`); }} />}
      {layer?.t === 'reminder' && <ReminderModal files={o?.files ?? []} preset={layer.preset} onClose={() => setLayer(null)} onMade={() => { toast('یادآور ثبت شد'); changed(); setLayer(null); }} />}
      {/* Amin #6342: the phone's bottom bar, quick ways in (Material icons) */}
      <nav className="bottom-bar" aria-label="میانبرها">
        <a href="#/files" className={page === 'files' ? 'on' : undefined}><Icon name="file" size={22} /><span>فایل‌ها</span></a>
        <a href="#/contacts" className={page === 'contacts' ? 'on' : undefined} onClick={() => setAddContact(0)}><Icon name="calls" size={22} /><span>مخاطبین</span></a>
        <button type="button" className="bb-main" onClick={() => setLayer({ t: 'add' })} aria-label="افزودن"><Icon name="plus" size={26} /></button>
        <button type="button" onClick={() => setLayer({ t: 'pick' })} disabled={!o}><Icon name="upload" size={22} /><span>اشتراک فایل‌ها</span></button>
        <button type="button" onClick={() => setLayer({ t: 'code' })}><Icon name="users" size={22} /><span>افزودن مشاور</span></button>
      </nav>
      {layer?.t === 'send' && o && <SendModal o={o} ids={layer.ids} onClose={() => setLayer(null)} onSent={() => { setLayer(null); void load(); }} />}
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
