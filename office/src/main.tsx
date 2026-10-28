import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/kss-kit.css';
import './styles/base.css';
import './office.css';
import { applyTheme } from './lib/theme';
import { ago } from './lib/fmt';
import { Alert, Badge, Btn, Card, Empty, ErrorBox, Field, Kpi, Modal, PageHeader, SearchBox, Segmented, Skeleton, ToastProvider, useAction, useConfirm, useToast } from './ui/kit';
import { Icon } from './ui/icons';
import { api, session, type Adviser, type NewFile, type OfficeFile, type Overview, type Rules } from './api';

/**
 * EYVAN office dashboard (Amin #5659/#5664/#5909/#5913/#5934): the real-estate office manager's own dashboard —
 * its own address and phone-code login, the IRIS panel's components and tokens. Every number comes from the
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
function Login({ onIn }: { onIn: () => void }) {
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { busy, run, error } = useAction();
  const p = toLatin(phone).replace(/\D/g, '');
  const finish = async (officeName?: string) => {
    try {
      const r = await api.login(p, officeName);
      session.set(r.token);
      onIn();
    } catch (e) {
      if ((e as { code?: string }).code === 'no_office') setStep('name');
      else throw e;
    }
  };
  const submit = () =>
    run(async () => {
      if (step === 'phone') { await api.sendCode(p); setStep('code'); }
      else if (step === 'code') { await api.verify(p, toLatin(code).trim()); await finish(); }
      else await finish(name.trim());
    });
  return (
    <main className="login">
      <form className="kss-card login-card" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="side-brand"><div className="logo"><Icon name="home" size={18} /></div><div><b>ایوان</b><small>داشبورد دفتر املاک</small></div></div>
        <h1 className="login-title">{step === 'name' ? 'دفتر تازه' : 'ورود مدیر دفتر'}</h1>
        <p className="muted">{step === 'phone' ? 'با همان شماره‌ای که در برنامهٔ ایوان دارید وارد شوید.' : step === 'code' ? `کد پیامک‌شده به ${phone} را وارد کنید.` : 'این شماره هنوز دفتری ندارد؛ نام دفتر را بنویسید تا ساخته شود.'}</p>
        {step === 'phone' && <Field label="شمارهٔ موبایل" required><input className="kss-input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus /></Field>}
        {step === 'code' && <Field label="کد تأیید" required><input className="kss-input" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus /></Field>}
        {step === 'name' && <Field label="نام دفتر" required><input className="kss-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً دفتر املاک پارسه" autoFocus /></Field>}
        {error && <Alert tone="bad">{error}</Alert>}
        <Btn type="submit" variant="primary" busy={busy} disabled={step === 'phone' ? !/^09\d{9}$/.test(p) : step === 'code' ? !code.trim() : !name.trim()}>
          {step === 'phone' ? 'گرفتن کد' : step === 'code' ? 'ورود' : 'ساخت دفتر و ورود'}
        </Btn>
        {step === 'code' && <button type="button" className="kss-btn kss-btn--ghost kss-btn--sm" onClick={() => { setStep('phone'); setCode(''); }}>تغییر شماره</button>}
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
        <div className="span2"><Field label="عنوان فایل" required hint="مثلاً آپارتمان ۱۲۰ متری ونک"><input className="kss-input" value={f.title ?? ''} onChange={set('title')} autoFocus /></Field></div>
        <Field label="نوع معامله" required>
          <Segmented label="نوع معامله" value={f.kind!} onChange={(v) => setF((x) => ({ ...x, kind: v }))} options={KINDS.map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="نوع ملک"><input className="kss-input" value={f.propertyType ?? ''} onChange={set('propertyType')} placeholder="آپارتمان، ویلایی، مغازه…" /></Field>
        <Field label="شهر"><input className="kss-input" value={f.city ?? ''} onChange={set('city')} /></Field>
        <Field label="منطقه" required><input className="kss-input" value={f.region ?? ''} onChange={set('region')} placeholder="مثلاً ونک" /></Field>
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
      {error && <Alert tone="bad">{error}</Alert>}
    </Modal>
  );
}

function SendModal({ o, ids, onClose, onSent }: { o: Overview; ids: string[]; onClose: () => void; onSent: () => void }) {
  const [all, setAll] = useState(true);
  const [who, setWho] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<Rules>(o.office.rules);
  const { busy, run, error } = useAction();
  const send = () => run(() => api.share(ids, all ? 'all' : [...who], rules).then(onSent), `${fa(ids.length)} فایل فرستاده شد`);
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
        </div>
      )}
      {error && <Alert tone="bad">{error}</Alert>}
    </Modal>
  );
}

function FilesTable({ o, onNew, onSend }: { o: Overview; onNew: () => void; onSend: (ids: string[]) => void }) {
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
                <td>{sentTo(f) ?? <span className="faint">فرستاده نشده</span>}</td>
                <td>{daysLeft(f.expiresAt) <= 7 ? <Badge tone="warn">{fa(daysLeft(f.expiresAt))} روز مانده</Badge> : <span className="faint">{fa(daysLeft(f.expiresAt))} روز</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
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
          <div className="code-big num" dir="ltr">{c.code}</div>
          <div className="word-big">{c.word}</div>
          <p className="muted">مشاور در برنامهٔ ایوان، «اتصال به دفتر املاک» را باز می‌کند و این کد و کلمه را وارد می‌کند.</p>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ page ----
function Dashboard() {
  const [o, setO] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [layer, setLayer] = useState<null | { t: 'new' } | { t: 'code' } | { t: 'send'; ids: string[] }>(null);
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
        </nav>
        <div className="side-group">مشاوران</div>
        <nav>
          <a href="#advisers" className="item"><Icon name="user" size={20} /><span>مشاوران و اتصال</span></a>
          <a href="#sharing" className="item"><Icon name="shield" size={20} /><span>قواعد ارسال</span></a>
        </nav>
        <div className="grow" />
        <button className="kss-btn kss-btn--ghost kss-btn--sm side-out" onClick={() => api.logout().finally(() => { session.clear(); location.reload(); })}><Icon name="logout" size={16} />خروج</button>
      </aside>
      <div className="main">
        <header className="top">
          <button className="kss-icon-btn menu-btn" aria-label="منو" aria-expanded={nav} onClick={() => setNav(true)}><Icon name="menu" size={20} /></button>
          <span className="ctx"><Icon name="store" />{o?.office.name ?? 'دفتر املاک'}</span>
          <div className="spacer" />
          <span className="ctx"><Icon name="user" />مدیر دفتر</span>
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
                <FilesTable o={o} onNew={() => setLayer({ t: 'new' })} onSend={(ids) => setLayer({ t: 'send', ids })} />
              </Card>
            </div>
          )}
        </div></main>
      </div>
      {layer?.t === 'new' && <NewFileModal onClose={() => setLayer(null)} onMade={(id, title) => { toast(`«${title}» ثبت شد`); void load(); setLayer({ t: 'send', ids: [id] }); }} />}
      {layer?.t === 'code' && <CodeModal onClose={() => { setLayer(null); void load(); }} />}
      {layer?.t === 'send' && o && <SendModal o={o} ids={layer.ids} onClose={() => setLayer(null)} onSent={() => { setLayer(null); void load(); }} />}
    </div>
  );
}

function App() {
  const [inside, setInside] = useState(!!session.get());
  return <ToastProvider>{inside ? <Dashboard /> : <Login onIn={() => setInside(true)} />}</ToastProvider>;
}

createRoot(document.getElementById('root')!).render(<App />);
