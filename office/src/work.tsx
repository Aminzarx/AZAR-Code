/**
 * Amin #6333/#6337/#6340/#6342: the app's own work in the office dashboard — applicants, matching, contracts,
 * reminders and the Divar import — on the manager's own app data (one set with the phone, #6330). Each page has its own
 * header and actions; wide tables become cards on a phone.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Badge, Btn, Card, Empty, ErrorBox, Field, Modal, PageHeader, SearchBox, Segmented, Skeleton, useAction, useToast } from './ui/kit';
import { Icon } from './ui/icons';
import { ago, digits } from './lib/fmt';
import { api, ApiError, type Applicant, type Contract, type Divar, type MatchFile, type MatchList, type NewFile, type OfficeFile, type Reminder } from './api';

const fa = (n: number) => n.toLocaleString('fa-IR');
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const persian = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)));
/** typed money («۱٬۲۰۰٬۰۰۰», «1,200,000») → a number, or null */
const amount = (s: string | undefined) => {
  const v = latin(s ?? '').replace(/[^\d.]/g, '');
  return v ? Number(v) : null;
};

/** Toman, short: ۲۸ میلیارد / ۹٫۵ میلیارد / ۸۰۰ میلیون */
export function money(t: number | null | undefined): string {
  if (t == null) return '—';
  const [n, unit] = t >= 1e9 ? [t / 1e9, 'میلیارد'] : t >= 1e6 ? [t / 1e6, 'میلیون'] : [t, 'تومان'];
  return `${(Math.round(n * 10) / 10).toLocaleString('fa-IR')} ${unit}`;
}
const range = (a: number | null, b: number | null, show: (n: number) => string) =>
  a != null && b != null ? `${show(a)} تا ${show(b)}` : a != null ? `از ${show(a)}` : b != null ? `تا ${show(b)}` : null;

/** a stored Gregorian day (YYYY-MM-DD) or ISO time → «۹ آبان ۱۴۰۵» */
const jDate = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric', timeZone: d.length === 10 ? 'UTC' : 'Asia/Tehran' })
    .format(new Date(d.length === 10 ? d + 'T12:00:00Z' : d)) : '—';
const jTime = (iso: string) => new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' }).format(new Date(iso));
/** today in Tehran as «۱۴۰۵/۰۸/۰۹» (the form's own shape; the server takes Persian digits) */
export function jalaliToday(addDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran' })
    .formatToParts(new Date(Date.now() + addDays * 86400000));
  const p = (t: string) => (parts.find((x) => x.type === t)?.value ?? '').replace(/\D/g, '');
  return persian(`${p('year')}/${p('month')}/${p('day')}`);
}
const daysUntil = (d: string) => Math.ceil((Date.parse(d + 'T00:00:00Z') - Date.now()) / 86400000);

/** the error of a form: the message, and field → message when the server named the fields */
function useForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const submit = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null); setFields({});
    try { await fn(); return true; }
    catch (e) { setError((e as Error).message); setFields((e as ApiError).fields ?? {}); return false; }
    finally { setBusy(false); }
  };
  return { busy, error, fields, submit };
}

/** chips: one or several of a few choices (the app's ChoiceChips / MultiChoiceChips) */
function Chips({ options, value, onChange, label }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className={'chip-toggle' + (on ? ' on' : '')} aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {on && <Icon name="check" size={14} />}{o}
          </button>
        );
      })}
    </div>
  );
}

function MoneyField({ label, value, onChange, error, required, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean; hint?: string }) {
  const n = amount(value);
  return (
    <Field label={label} required={required} error={error} hint={n ? (n >= 1e6 ? `${money(n)} تومان` : `${fa(n)} تومان`) : hint}>
      <input className="kss-input num" dir="ltr" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="۰" />
    </Field>
  );
}

const kindTone = (k: string) => (k === 'خرید' || k === 'فروش' || k === 'خرید و فروش' ? 'info' : k === 'تهاتر' ? 'accent' : 'neutral') as 'info' | 'accent' | 'neutral';
const wants = (a: Applicant) => [a.kinds.join('، ') || 'نوع معامله نامشخص', a.propertyType].filter(Boolean).join(' · ');
const budgetOf = (a: Applicant) =>
  [a.kinds.includes('رهن و اجاره') || (!a.kinds.length && (a.deposit != null || a.rent != null))
    ? [a.deposit != null && (a.deposit ? `رهن ${money(a.deposit)}` : 'بدون رهن'), a.rent != null && `اجاره ${money(a.rent)}`].filter(Boolean).join(' · ')
    : '', range(a.minBudget, a.maxBudget, money)].filter(Boolean).join(' · ') || '—';
const fileSub = (f: MatchFile) => [f.kind, [f.city, f.region].filter(Boolean).join('، '), f.size != null ? `${fa(f.size)} متر` : ''].filter(Boolean).join(' · ');
const filePrice = (f: MatchFile) =>
  f.kinds.includes('رهن و اجاره') && f.price == null
    ? [f.deposit != null && 'ودیعه ' + money(f.deposit), f.rent != null && 'اجاره ' + money(f.rent)].filter(Boolean).join(' · ') || '—'
    : money(f.price);

function ScoreBadge({ score }: { score: number }) {
  return <Badge tone={score >= 80 ? 'ok' : score >= 50 ? 'info' : 'neutral'} icon={false}>{fa(score)}٪ تطبیق</Badge>;
}

// ================================================================== applicants ====
type ApplicantData = Awaited<ReturnType<typeof api.applicants>>;

/** Amin #6333: «متقاضی تازه» — the app's create-applicant form, the same fields and rules */
export function ApplicantModal({ onClose, onMade }: { onClose: () => void; onMade: (a: Applicant) => void }) {
  const [meta, setMeta] = useState<ApplicantData | null>(null);
  const [v, setV] = useState<Record<string, string>>({ city: 'تهران' });
  const [kinds, setKinds] = useState<string[]>([]);
  const [type, setType] = useState<string[]>([]);
  const [barter, setBarter] = useState<string[]>([]);
  const [convertible, setConvertible] = useState(false);
  const { busy, error, fields, submit } = useForm();
  useEffect(() => { api.applicants().then(setMeta, () => undefined); }, []);
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const val = (k: string) => v[k] ?? '';
  const rent = kinds.includes('رهن و اجاره');
  const priceMode = kinds.includes('خرید') || kinds.includes('تهاتر');
  const showBudget = priceMode || !kinds.length;
  const propertyTypes = meta?.propertyTypes ?? ['آپارتمان', 'ویلایی', 'زمین', 'مغازه', 'دفتر'];
  const save = () => submit(async () => {
    const r = await api.addApplicant({
      name: val('name').trim(), phone: latin(val('phone')), kinds, propertyType: type[0] === 'سایر' ? val('otherType').trim() : type[0] ?? '',
      city: val('city').trim(), region: val('region').trim(), barterItems: barter, barterOther: val('barterOther').trim(),
      minBudget: showBudget ? latin(val('minBudget')) : '', maxBudget: showBudget ? latin(val('maxBudget')) : '',
      deposit: rent ? latin(val('deposit')) : '', rent: rent ? latin(val('rent')) : '', convertible: rent && convertible,
      minArea: latin(val('minArea')), maxArea: latin(val('maxArea')), rooms: latin(val('rooms')), description: val('description').trim(),
    });
    onMade(r.applicant);
  });
  return (
    <Modal title="متقاضی تازه" sub="مثل برنامهٔ ایوان؛ در برنامهٔ شما هم ثبت می‌شود و فایل‌های مناسب خودکار پیشنهاد می‌شوند" onClose={onClose} size="wide" locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!val('name').trim() || !val('phone').trim() || !val('city').trim()} onClick={() => void save()}>ثبت متقاضی</Btn></>}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="نام و نام خانوادگی" required error={fields.name}><input className="kss-input" value={val('name')} onChange={set('name')} placeholder="مثلاً علی رضایی" maxLength={80} autoFocus /></Field>
        <Field label="شماره تماس" required error={fields.phone}><input className="kss-input num" dir="ltr" inputMode="tel" value={val('phone')} onChange={set('phone')} placeholder="09121234567" maxLength={20} /></Field>
        <div className="span2">
          <Field label="نوع معامله" hint="می‌توانید چند مورد را با هم انتخاب کنید"><Chips label="نوع معامله" options={meta?.kinds ?? ['خرید', 'رهن و اجاره', 'تهاتر']} value={kinds} onChange={setKinds} /></Field>
        </div>
        <div className="span2">
          <Field label="نوع ملک"><Chips label="نوع ملک" options={[...propertyTypes, 'سایر']} value={type} onChange={(x) => setType(x.slice(-1))} /></Field>
          {type[0] === 'سایر' && <Field label="نوع ملک دیگر"><input className="kss-input" value={val('otherType')} onChange={set('otherType')} maxLength={40} /></Field>}
        </div>
        <Field label="شهر" required error={fields.city}><input className="kss-input" value={val('city')} onChange={set('city')} placeholder="تهران" maxLength={60} /></Field>
        <Field label="منطقه"><input className="kss-input" value={val('region')} onChange={set('region')} placeholder="مثلاً ونک" maxLength={60} /></Field>
        {kinds.includes('تهاتر') && (
          <div className="span2">
            <Field label="مورد تهاتر" required error={fields.barterItems}><Chips label="مورد تهاتر" options={meta?.barterItems ?? ['طلا', 'خودرو', 'زمین', 'ملک', 'سایر']} value={barter} onChange={setBarter} /></Field>
            {barter.includes('سایر') && <Field label="توضیح مورد تهاتر" required error={fields.barterOther}><input className="kss-input" value={val('barterOther')} onChange={set('barterOther')} maxLength={300} /></Field>}
          </div>
        )}
        {rent && (
          <>
            <MoneyField label="رهن موردنظر (تومان)" required value={val('deposit')} onChange={(x) => setV((s) => ({ ...s, deposit: x }))} error={fields.deposit} hint="صفر یعنی فقط اجاره" />
            <MoneyField label="اجارهٔ موردنظر (تومان)" value={val('rent')} onChange={(x) => setV((s) => ({ ...s, rent: x }))} error={fields.rent} />
            <label className="span2 row nowrap check-row"><input type="checkbox" className="kss-check" checked={convertible} onChange={(e) => setConvertible(e.target.checked)} /><span>رهن و اجارهٔ قابل تبدیل هم مدنظر است</span></label>
          </>
        )}
        {showBudget && (
          <>
            <MoneyField label={priceMode && rent ? 'بودجهٔ خرید از (تومان)' : 'بودجه از (تومان)'} required={priceMode} value={val('minBudget')} onChange={(x) => setV((s) => ({ ...s, minBudget: x }))} error={fields.minBudget} />
            <MoneyField label="تا (تومان)" value={val('maxBudget')} onChange={(x) => setV((s) => ({ ...s, maxBudget: x }))} error={fields.maxBudget} />
          </>
        )}
        <div className="span2 one-row three-eq">
          <Field label="متراژ از" error={fields.minArea}><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('minArea')} onChange={set('minArea')} /></Field>
          <Field label="تا (متر)" error={fields.maxArea}><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('maxArea')} onChange={set('maxArea')} /></Field>
          <Field label="تعداد اتاق" error={fields.rooms}><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('rooms')} onChange={set('rooms')} /></Field>
        </div>
        <div className="span2"><Field label="توضیحات"><textarea className="kss-input" rows={3} value={val('description')} onChange={set('description')} placeholder="مثلاً محله‌های دلخواه، طبقه، پارکینگ" maxLength={2000} /></Field></div>
      </form>
      <p className="muted small">ثبت متقاضی مثل برنامه، یک بار به اندازهٔ حجمش از توکن‌های مشترک کم می‌کند.</p>
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#/tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
    </Modal>
  );
}

/** an applicant's record: what they want, the files that fit, their contracts and reminders, and what to do next */
export function ApplicantRecord({ id, onClose, openFile, onContract, onReminder, onChanged, reloadKey }: {
  id: string; onClose: () => void; openFile: (id: string) => void; onContract: (p: { applicantId: string; fileId?: string }) => void;
  onReminder: (p: { applicantId?: string; fileId?: string; title?: string }) => void; onChanged: () => void; reloadKey: number;
}) {
  const [d, setD] = useState<Awaited<ReturnType<typeof api.applicant>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { busy, run } = useAction();
  const load = useCallback(() => api.applicant(id).then(setD, (e: Error) => setErr(e.message)), [id]);
  useEffect(() => { void load(); }, [load, reloadKey]);
  const a = d?.applicant;
  const row = (k: string, v: ReactNode) => (v === null || v === '' || v === undefined ? null : <><dt>{k}</dt><dd>{v}</dd></>);
  return (
    <Modal title={a?.name ?? 'پروندهٔ متقاضی'} sub={a ? wants(a) : undefined} onClose={onClose} size="wide" dismissable
      footer={a && <>
        <Btn variant="ghost" busy={busy} onClick={() => void run(() => api.applicantStatus(a.id, a.status === 'archived' ? 'active' : 'archived').then(() => { void load(); onChanged(); }),
          a.status === 'archived' ? 'متقاضی دوباره فعال شد' : 'متقاضی بایگانی شد')}>{a.status === 'archived' ? 'فعال کردن دوباره' : 'بایگانی'}</Btn>
        <Btn icon="clock" onClick={() => onReminder({ applicantId: a.id, title: `پیگیری ${a.name}` })}>یادآور</Btn>
        <Btn variant="primary" icon="verified" onClick={() => onContract({ applicantId: a.id })}>ثبت قرارداد</Btn>
      </>}>
      {err && !d ? <ErrorBox what="پرونده" error={err} retry={() => void load()} /> : !d || !a ? <Skeleton rows={5} /> : (
        <div className="stack">
          <div className="row tight wrap">
            {a.kinds.map((k) => <Badge key={k} tone={kindTone(k)} icon={false}>{k}</Badge>)}
            {a.status === 'archived' && <Badge tone="warn">بایگانی</Badge>}
            <Badge tone="neutral" icon="mobile">در برنامهٔ ایوان هم هست</Badge>
          </div>
          <dl className="kv file-kv">
            {row('تماس', a.phone ? <a href={`tel:${a.phone}`} className="num" dir="ltr">{digits(a.phone)}</a> : null)}
            {row('محل', [a.city, a.region].filter(Boolean).join('، '))}
            {row('بودجه', budgetOf(a) === '—' ? null : budgetOf(a))}
            {row('رهن و اجارهٔ قابل تبدیل', a.convertible ? 'بله' : null)}
            {row('متراژ', range(a.minArea, a.maxArea, (n) => fa(n) + ' متر'))}
            {row('اتاق', a.rooms != null ? fa(a.rooms) : null)}
            {row('مورد تهاتر', a.barterItems.length ? [a.barterItems.filter((x) => x !== 'سایر').join('، '), a.barterOther].filter(Boolean).join('، ') : null)}
            {row('توضیح', a.description)}
            {row('ثبت', a.createdAt ? ago(a.createdAt) : null)}
          </dl>
          <Card title="فایل‌های مناسب" sub={d.matches.length ? `${fa(d.matches.length)} فایل، بهترین اول` : 'با قاعده‌های تطبیق برنامهٔ ایوان'} flush>
            {!d.matches.length ? <Empty compact title="فعلاً فایل مناسبی نیست">با ثبت فایل تازه یا تغییر بودجه و متراژ، پیشنهادها اینجا می‌آیند.</Empty> : (
              <ul className="plain match-list">{d.matches.slice(0, 20).map((m) => (
                <li key={m.file.id} className="match-row">
                  <button type="button" className="grow match-open" onClick={() => openFile(m.file.id)}>
                    <b>{m.file.title}</b><span className="faint xs block">{fileSub(m.file)} · {filePrice(m.file)}</span>
                    <span className="criteria">{m.criteria.map((c) => <span key={c} className="crit">{c}</span>)}</span>
                  </button>
                  <span className="match-end"><ScoreBadge score={m.score} /><Btn size="sm" variant="ghost" onClick={() => onContract({ applicantId: a.id, fileId: m.file.id })}>قرارداد</Btn></span>
                </li>
              ))}</ul>
            )}
          </Card>
          {(d.contracts.length > 0 || d.reminders.length > 0) && (
            <div className="grid g2">
              <Card title="قراردادها" sub={d.contracts.length ? `${fa(d.contracts.length)} قرارداد` : undefined}>
                {d.contracts.length ? <ul className="plain stack sm">{d.contracts.map((c) => <li key={c.id} className="row" style={{ justifyContent: 'space-between' }}><span>{c.type || 'قرارداد'} · {c.fileTitle}</span><ContractBadge c={c} /></li>)}</ul> : <span className="faint">قراردادی ثبت نشده است.</span>}
              </Card>
              <Card title="یادآورها" sub={d.reminders.length ? `${fa(d.reminders.filter((r) => !r.done).length)} باز` : undefined}>
                {d.reminders.length ? <ul className="plain stack sm">{d.reminders.map((r) => <li key={r.id} className={r.done ? 'faint' : ''}>{r.title} <span className="faint xs">· {jDate(r.remindAt)} {jTime(r.remindAt)}</span></li>)}</ul> : <span className="faint">یادآوری ندارد.</span>}
              </Card>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ApplicantsPage({ openApplicant, onNew, reloadKey }: { openApplicant: (id: string) => void; onNew: () => void; reloadKey: number }) {
  const [d, setD] = useState<ApplicantData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const load = useCallback(() => api.applicants().then((x) => { setD(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load, reloadKey]);
  const needle = latin(q.trim());
  const rows = (d?.applicants ?? []).filter((a) => a.status === status && (kind === 'all' || a.kinds.includes(kind))
    && (!needle || [a.name, a.phone, a.city, a.region, a.description, a.propertyType].some((x) => latin(x).includes(needle))));
  const archived = (d?.applicants ?? []).filter((a) => a.status === 'archived').length;
  return (
    <>
      <PageHeader title="متقاضیان" sub="همان متقاضیان برنامهٔ ایوان شما؛ متقاضی تازه در برنامه هم ثبت می‌شود"
        meta={d && <span><Icon name="users" size={12} />{fa(d.applicants.length - archived)} متقاضی فعال</span>}
        actions={<Btn variant="primary" icon="plus" onClick={onNew}>متقاضی تازه</Btn>} />
      <Card flush>
        {err && !d ? <div className="pad"><ErrorBox what="متقاضیان" error={err} retry={() => void load()} /></div> : !d ? <Skeleton rows={5} /> : !d.applicants.length ? (
          <Empty title="هنوز متقاضی‌ای ثبت نشده" action={<Btn variant="primary" icon="plus" onClick={onNew}>متقاضی تازه</Btn>}>متقاضیان برنامهٔ ایوان این‌جا دیده می‌شوند و برای هر کدام فایل‌های مناسب پیشنهاد می‌شود.</Empty>
        ) : (
          <>
            <div className="toolbar">
              <SearchBox value={q} onChange={setQ} placeholder="جست‌وجو در نام، شماره، منطقه" />
              <Segmented label="نوع معامله" value={kind} onChange={setKind} options={[{ value: 'all', label: 'همه' }, ...d.kinds.map((k) => ({ value: k, label: k }))]} />
              <div className="spacer" />
              <Segmented label="وضعیت" value={status} onChange={setStatus} options={[{ value: 'active', label: 'فعال' }, { value: 'archived', label: `بایگانی${archived ? ` (${fa(archived)})` : ''}` }]} />
            </div>
            {!rows.length ? <Empty kind="filtered" title="متقاضی‌ای با این جست‌وجو پیدا نشد">نوع معامله، وضعیت یا متن جست‌وجو را تغییر دهید.</Empty> : (
              <>
                <ul className="plain m-cards">
                  {rows.map((a) => (
                    <li key={a.id} className="m-card" onClick={() => openApplicant(a.id)}>
                      <span className="contact-avatar" aria-hidden="true">{a.name.trim().charAt(0) || '؟'}</span>
                      <div className="grow">
                        <b>{a.name}</b>
                        <div className="faint xs">{wants(a)} · {[a.city, a.region].filter(Boolean).join('، ')}</div>
                        <div className="row tight wrap mt-xs"><span className="num small">{budgetOf(a)}</span>{a.matches ? <Badge tone="ok" icon={false}>{fa(a.matches)} فایل مناسب</Badge> : null}</div>
                      </div>
                      <Icon name="chevron" size={18} />
                    </li>
                  ))}
                </ul>
                <div className="tbl-wrap m-tbl"><table className="tbl">
                  <thead><tr><th>متقاضی</th><th>دنبال</th><th>محل</th><th className="num">بودجه</th><th>فایل مناسب</th><th>ثبت</th></tr></thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="clickable" onClick={() => openApplicant(a.id)} title="باز کردن پرونده">
                        <td><b style={{ fontWeight: 500 }}>{a.name}</b><div className="faint xs num" dir="ltr" style={{ textAlign: 'end' }}>{digits(a.phone)}</div></td>
                        <td><span className="row tight nowrap">{a.kinds.map((k) => <Badge key={k} tone={kindTone(k)} icon={false}>{k}</Badge>)}{a.propertyType && <span className="faint xs">{a.propertyType}</span>}</span></td>
                        <td>{[a.city, a.region].filter(Boolean).join('، ')}</td>
                        <td className="num nowrap">{budgetOf(a)}</td>
                        <td>{a.matches ? <Badge tone="ok" icon={false}>{fa(a.matches)} فایل</Badge> : <span className="faint">—</span>}</td>
                        <td className="muted nowrap">{a.createdAt ? ago(a.createdAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}

// ================================================================== matching ====
/** Amin #6333 «تطبیق»: pick an applicant (or a file) and see what fits, by the app's own rules */
export function MatchingPage({ openFile, openApplicant, onContract, onReminder, reloadKey }: {
  openFile: (id: string) => void; openApplicant: (id: string) => void; onContract: (p: { applicantId?: string; fileId?: string }) => void;
  onReminder: (p: { applicantId?: string; fileId?: string; title?: string }) => void; reloadKey: number;
}) {
  const [side, setSide] = useState<'applicant' | 'file'>('applicant');
  const [list, setList] = useState<MatchList | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ title: string; sub: string; rows: { id: string; title: string; sub: string; extra: string; score: number; criteria: string[]; phone?: string }[] } | null>(null);
  const load = useCallback(() => api.matches().then((x) => { setList(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load, reloadKey]);
  useEffect(() => { setPick(null); setRes(null); setQ(''); }, [side]);
  useEffect(() => {
    if (!pick) { setRes(null); return; }
    let alive = true;
    setRes(null);
    if (side === 'applicant') api.matchesForApplicant(pick).then((r) => alive && setRes({
      title: r.applicant.name, sub: wants(r.applicant),
      rows: r.files.map((m) => ({ id: m.file.id, title: m.file.title, sub: fileSub(m.file), extra: filePrice(m.file), score: m.score, criteria: m.criteria })),
    }), () => alive && setRes({ title: '', sub: '', rows: [] }));
    else api.matchesForFile(pick).then((r) => alive && setRes({
      title: r.file.title, sub: fileSub(r.file),
      rows: r.applicants.map((m) => ({ id: m.applicant.id, title: m.applicant.name, sub: wants(m.applicant), extra: budgetOf(m.applicant), score: m.score, criteria: m.criteria, phone: m.applicant.phone })),
    }), () => alive && setRes({ title: '', sub: '', rows: [] }));
    return () => { alive = false; };
  }, [pick, side, reloadKey]);
  const needle = latin(q.trim());
  const items = side === 'applicant'
    ? (list?.applicants ?? []).map((a) => ({ id: a.id, title: a.name, sub: [a.kinds.join('، '), [a.city, a.region].filter(Boolean).join('، ')].filter(Boolean).join(' · '), count: a.count, best: a.best }))
    : (list?.files ?? []).map((f) => ({ id: f.id, title: f.title, sub: fileSub(f), count: f.count, best: f.best }));
  const shown = items.filter((x) => !needle || latin(x.title + ' ' + x.sub).includes(needle));
  const withAny = items.filter((x) => x.count > 0).length;
  return (
    <>
      <PageHeader title="تطبیق فایل و متقاضی" sub="پیشنهادها با همان قاعده‌های برنامهٔ ایوان: شهر، نوع معامله و ملک، بودجه، متراژ و اتاق. فایل دارای قرارداد پیشنهاد نمی‌شود."
        meta={list && <span><Icon name="insights" size={12} />{fa(withAny)} {side === 'applicant' ? 'متقاضی' : 'فایل'} با پیشنهاد</span>}
        actions={<Segmented label="تطبیق برای" value={side} onChange={setSide} options={[{ value: 'applicant', label: 'برای متقاضی' }, { value: 'file', label: 'برای فایل' }]} />} />
      {err && !list ? <ErrorBox what="تطبیق" error={err} retry={() => void load()} /> : !list ? <Skeleton rows={6} /> : !items.length ? (
        <Card><Empty title={side === 'applicant' ? 'متقاضی فعالی نیست' : 'فایل فعالی نیست'}>{side === 'applicant' ? 'با «متقاضی تازه» یک متقاضی ثبت کنید تا فایل‌های مناسب پیشنهاد شود.' : 'با «فایل تازه» یک فایل ثبت کنید تا متقاضیان مناسب پیشنهاد شوند.'}</Empty></Card>
      ) : (
        <div className={'match-grid' + (pick ? ' picked' : '')}>
          <Card flush className="match-pick" title={side === 'applicant' ? 'متقاضیان' : 'فایل‌ها'} sub="یکی را انتخاب کنید">
            <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder={side === 'applicant' ? 'جست‌وجوی متقاضی' : 'جست‌وجوی فایل'} /></div>
            <ul className="plain pick-side">
              {shown.map((x) => (
                <li key={x.id}><button type="button" className={'pick-item' + (pick === x.id ? ' on' : '')} aria-pressed={pick === x.id} onClick={() => setPick(x.id)}>
                  <span className="grow"><b>{x.title}</b><span className="faint xs block">{x.sub}</span></span>
                  {x.count ? <Badge tone={x.best >= 80 ? 'ok' : 'info'} icon={false}>{fa(x.count)}</Badge> : <span className="faint xs">بدون پیشنهاد</span>}
                </button></li>
              ))}
              {!shown.length && <li><Empty compact kind="filtered" title="پیدا نشد" /></li>}
            </ul>
          </Card>
          <Card className="match-res" title={res?.title || 'پیشنهادها'} sub={res?.sub || (pick ? undefined : 'از فهرست یکی را انتخاب کنید')}
            end={pick ? <Btn size="sm" variant="ghost" className="match-back" onClick={() => setPick(null)}>بازگشت به فهرست</Btn> : undefined} flush>
            {!pick ? <Empty compact icon="insights" title="یک مورد را انتخاب کنید">{side === 'applicant' ? 'فایل‌های مناسب هر متقاضی، بهترین اول، این‌جا دیده می‌شود.' : 'متقاضیان مناسب هر فایل، بهترین اول، این‌جا دیده می‌شوند.'}</Empty>
              : !res ? <Skeleton rows={4} /> : !res.rows.length ? <Empty compact title="فعلاً موردی مناسب نیست">{side === 'applicant' ? 'فایلی با این شهر، نوع معامله و بودجه نیست.' : 'متقاضی‌ای با این شهر، نوع معامله و بودجه نیست.'}</Empty> : (
                <ul className="plain match-list">{res.rows.map((m) => (
                  <li key={m.id} className="match-row">
                    <button type="button" className="grow match-open" onClick={() => (side === 'applicant' ? openFile(m.id) : openApplicant(m.id))}>
                      <b>{m.title}</b><span className="faint xs block">{m.sub} · {m.extra}</span>
                      <span className="criteria">{m.criteria.map((c) => <span key={c} className="crit">{c}</span>)}</span>
                    </button>
                    <span className="match-end">
                      <ScoreBadge score={m.score} />
                      <span className="row tight nowrap">
                        {m.phone && <a className="kss-btn kss-btn--ghost kss-btn--sm" href={`tel:${m.phone}`} aria-label={'تماس با ' + m.title}><Icon name="phone" size={14} /></a>}
                        <Btn size="sm" variant="ghost" icon="clock" aria-label="یادآور" title="یادآور" onClick={() => onReminder(side === 'applicant' ? { applicantId: pick, fileId: m.id, title: `بازدید ${m.title}` } : { applicantId: m.id, fileId: pick, title: `تماس با ${m.title}` })} />
                        <Btn size="sm" onClick={() => onContract(side === 'applicant' ? { applicantId: pick, fileId: m.id } : { applicantId: m.id, fileId: pick })}>قرارداد</Btn>
                      </span>
                    </span>
                  </li>
                ))}</ul>
              )}
          </Card>
        </div>
      )}
    </>
  );
}

/** for a file's record: the applicants who fit it */
export function FileMatches({ fileId, openApplicant }: { fileId: string; openApplicant: (id: string) => void }) {
  const [rows, setRows] = useState<{ applicant: Applicant; score: number; criteria: string[] }[] | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => { api.matchesForFile(fileId).then((r) => { setRows(r.applicants); setClosed(r.file.closed); }, () => setRows([])); }, [fileId]);
  return (
    <Card title="متقاضیان مناسب" sub={rows?.length ? `${fa(rows.length)} متقاضی، بهترین اول` : 'با قاعده‌های تطبیق برنامهٔ ایوان'} flush>
      {!rows ? <Skeleton rows={2} /> : !rows.length ? (closed ? <Empty compact icon="verified" title="این فایل قرارداد دارد">فایل دارای قرارداد دیگر به متقاضیان پیشنهاد نمی‌شود.</Empty> : <Empty compact title="فعلاً متقاضی مناسبی نیست" />) : (
        <ul className="plain match-list">{rows.slice(0, 10).map((m) => (
          <li key={m.applicant.id} className="match-row">
            <button type="button" className="grow match-open" onClick={() => openApplicant(m.applicant.id)}>
              <b>{m.applicant.name}</b><span className="faint xs block">{wants(m.applicant)} · {budgetOf(m.applicant)}</span>
            </button>
            <span className="match-end"><ScoreBadge score={m.score} />{m.applicant.phone && <a className="num small" dir="ltr" href={`tel:${m.applicant.phone}`}>{digits(m.applicant.phone)}</a>}</span>
          </li>
        ))}</ul>
      )}
    </Card>
  );
}

// ================================================================== contracts ====
function ContractBadge({ c }: { c: Contract }) {
  const left = c.status === 'active' && c.endDate ? daysUntil(c.endDate) : null;
  if (left !== null && left >= 0 && left <= 30) return <Badge tone="warn">{left ? `${fa(left)} روز تا پایان` : 'امروز تمام می‌شود'}</Badge>;
  if (left !== null && left < 0) return <Badge tone="warn">پایان رسیده</Badge>;
  return <Badge tone={c.status === 'active' ? 'ok' : c.status === 'completed' ? 'accent' : 'neutral'} icon={false}>{c.statusLabel}</Badge>;
}

/** Amin #6333 «ثبت قرارداد»: the app's contract form — the file, the other party (an applicant), kind, amount, dates, tracking code */
export function ContractModal({ files, preset, onClose, onMade }: {
  files: OfficeFile[]; preset: { applicantId?: string; fileId?: string }; onClose: () => void; onMade: (c: Contract) => void;
}) {
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [v, setV] = useState<Record<string, string>>({ fileId: preset.fileId ?? '', applicantId: preset.applicantId ?? '', type: 'خرید و فروش', startDate: jalaliToday() });
  const { busy, error, fields, submit } = useForm();
  useEffect(() => { api.applicants().then((r) => setApplicants(r.applicants.filter((a) => a.status === 'active' || a.id === preset.applicantId)), () => setApplicants([])); }, [preset.applicantId]);
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const val = (k: string) => v[k] ?? '';
  const save = () => submit(async () => {
    const r = await api.addContract({ fileId: val('fileId'), applicantId: val('applicantId'), type: val('type'), amount: latin(val('amount')), startDate: val('startDate'), endDate: val('endDate'), trackingCode: val('trackingCode').trim(), notes: val('notes').trim() });
    onMade(r.contract);
  });
  return (
    <Modal title="ثبت قرارداد" sub="مثل برنامهٔ ایوان؛ در برنامهٔ شما هم ثبت می‌شود و فایل از پیشنهادها بیرون می‌رود" onClose={onClose} size="wide" locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!val('fileId') || !val('applicantId') || !val('startDate') || !val('endDate')} onClick={() => void save()}>ذخیرهٔ قرارداد</Btn></>}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="فایل ملک" required error={fields.fileId}>
          <select className="kss-input" value={val('fileId')} onChange={set('fileId')}>
            <option value="">انتخاب فایل…</option>
            {files.map((f) => <option key={f.id} value={f.id}>{f.title}{f.region ? ` — ${f.region}` : ''}</option>)}
          </select>
        </Field>
        <Field label="طرف قرارداد (متقاضی)" required error={fields.applicantId}>
          <select className="kss-input" value={val('applicantId')} onChange={set('applicantId')} disabled={!applicants}>
            <option value="">{applicants ? (applicants.length ? 'انتخاب متقاضی…' : 'اول یک متقاضی ثبت کنید') : 'در حال خواندن…'}</option>
            {(applicants ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}{a.phone ? ` — ${digits(a.phone)}` : ''}</option>)}
          </select>
        </Field>
        <div className="span2"><Field label="نوع قرارداد" required error={fields.type}>
          <Segmented label="نوع قرارداد" value={val('type')} onChange={(t) => setV((x) => ({ ...x, type: t }))} options={['خرید و فروش', 'رهن و اجاره', 'تهاتر'].map((k) => ({ value: k, label: k }))} />
        </Field></div>
        <MoneyField label="مبلغ (تومان)" value={val('amount')} onChange={(x) => setV((s) => ({ ...s, amount: x }))} error={fields.amount} />
        <Field label="کد رهگیری" hint="کد ثبت‌شده در سامانهٔ ثبت معاملات املاک" error={fields.trackingCode}><input className="kss-input num" dir="ltr" value={val('trackingCode')} onChange={set('trackingCode')} placeholder="اختیاری" maxLength={40} /></Field>
        <Field label="تاریخ شروع" required error={fields.startDate} hint="شمسی، مثل ۱۴۰۵/۰۵/۱۲"><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('startDate')} onChange={set('startDate')} placeholder="۱۴۰۵/۰۵/۱۲" /></Field>
        <Field label="تاریخ پایان" required error={fields.endDate} hint={val('type') === 'رهن و اجاره' ? 'معمولاً یک سال بعد' : 'شمسی، مثل ۱۴۰۵/۰۵/۱۲'}><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('endDate')} onChange={set('endDate')} placeholder="۱۴۰۶/۰۵/۱۲" /></Field>
        <div className="span2"><Field label="یادداشت"><textarea className="kss-input" rows={2} value={val('notes')} onChange={set('notes')} placeholder="توضیحات تکمیلی (اختیاری)" maxLength={2000} /></Field></div>
      </form>
      <p className="muted small">ثبت قرارداد مثل برنامه، یک بار به اندازهٔ حجمش از توکن‌های مشترک کم می‌کند.</p>
      {error && <Alert tone="bad" action={/توکن/.test(error) ? <a className="kss-btn kss-btn--sm" href="#/tokens" onClick={onClose}>خرید توکن</a> : undefined}>{error}</Alert>}
    </Modal>
  );
}

export function ContractsPage({ openFile, openApplicant, onNew, reloadKey }: {
  openFile: (id: string) => void; openApplicant: (id: string) => void; onNew: () => void; reloadKey: number;
}) {
  const [d, setD] = useState<Awaited<ReturnType<typeof api.contracts>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled' | 'all'>('active');
  const { run } = useAction();
  const load = useCallback(() => api.contracts().then((x) => { setD(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load, reloadKey]);
  const needle = latin(q.trim());
  const all = d?.contracts ?? [];
  const rows = all.filter((c) => (status === 'all' || c.status === status) && (!needle || latin([c.fileTitle, c.applicantName, c.trackingCode, c.type, c.notes].join(' ')).includes(needle)));
  const ending = all.filter((c) => c.status === 'active' && c.endDate && daysUntil(c.endDate) >= 0 && daysUntil(c.endDate) <= 30).length;
  const count = (s: string) => all.filter((c) => c.status === s).length;
  const setTo = (c: Contract, s: Contract['status']) => void run(() => api.contractStatus(c.id, s).then(load), `قرارداد ${d?.statuses[s] ?? ''} شد`);
  const statusPick = (c: Contract) => (
    <select className="kss-input kss-input--sm status-pick" value={c.status} aria-label={'وضعیت قرارداد ' + c.fileTitle} onClick={(e) => e.stopPropagation()} onChange={(e) => setTo(c, e.target.value as Contract['status'])}>
      {Object.entries(d?.statuses ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
  const party = (c: Contract) => (c.applicantId ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm" onClick={(e) => { e.stopPropagation(); openApplicant(c.applicantId!); }}>{c.applicantName}</button> : <span>{c.applicantName}</span>);
  const fileLink = (c: Contract) => (c.fileId ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm link-strong" onClick={(e) => { e.stopPropagation(); openFile(c.fileId!); }}>{c.fileTitle}</button> : <b style={{ fontWeight: 500 }}>{c.fileTitle}</b>);
  return (
    <>
      <PageHeader title="قراردادها" sub="همان قراردادهای برنامهٔ ایوان شما؛ قرارداد تازه در برنامه هم ثبت می‌شود"
        meta={d && <><span><Icon name="verified" size={12} />{fa(count('active'))} قرارداد فعال</span>{ending > 0 && <span><Icon name="warn" size={12} />{fa(ending)} قرارداد تا ۳۰ روز دیگر تمام می‌شود</span>}</>}
        actions={<Btn variant="primary" icon="plus" onClick={onNew}>ثبت قرارداد</Btn>} />
      <Card flush>
        {err && !d ? <div className="pad"><ErrorBox what="قراردادها" error={err} retry={() => void load()} /></div> : !d ? <Skeleton rows={5} /> : !all.length ? (
          <Empty title="هنوز قراردادی ثبت نشده" action={<Btn variant="primary" icon="plus" onClick={onNew}>ثبت قرارداد</Btn>}>قرارداد را برای یک فایل و یک متقاضی ثبت کنید؛ در برنامهٔ ایوان هم دیده می‌شود.</Empty>
        ) : (
          <>
            <div className="toolbar">
              <SearchBox value={q} onChange={setQ} placeholder="جست‌وجو در فایل، طرف قرارداد، کد رهگیری" />
              <div className="spacer" />
              <Segmented label="وضعیت" value={status} onChange={setStatus} options={[
                { value: 'active', label: `فعال (${fa(count('active'))})` }, { value: 'completed', label: 'تکمیل‌شده' }, { value: 'cancelled', label: 'لغوشده' }, { value: 'all', label: 'همه' }]} />
            </div>
            {!rows.length ? <Empty kind="filtered" title="قراردادی با این جست‌وجو پیدا نشد">وضعیت یا متن جست‌وجو را تغییر دهید.</Empty> : (
              <>
                <ul className="plain m-cards">
                  {rows.map((c) => (
                    <li key={c.id} className="m-card static">
                      <div className="grow">
                        <div className="row" style={{ justifyContent: 'space-between' }}>{fileLink(c)}<ContractBadge c={c} /></div>
                        <div className="faint xs">{c.type || 'قرارداد'} · {party(c)}</div>
                        <div className="row tight wrap mt-xs small"><span>{jDate(c.startDate)} تا {jDate(c.endDate)}</span>{c.amount != null && <span className="num">· {money(c.amount)}</span>}</div>
                        <div className="row mt-xs" style={{ justifyContent: 'space-between' }}>{c.trackingCode ? <span className="faint xs">کد رهگیری <span className="num" dir="ltr">{digits(c.trackingCode)}</span></span> : <span />}{statusPick(c)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="tbl-wrap m-tbl"><table className="tbl">
                  <thead><tr><th>فایل</th><th>طرف قرارداد</th><th>نوع</th><th className="num">مبلغ</th><th>مدت</th><th>کد رهگیری</th><th>وضعیت</th><th><span className="sr-only">تغییر وضعیت</span></th></tr></thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>{fileLink(c)}</td>
                        <td>{party(c)}</td>
                        <td><Badge tone={kindTone(c.type)} icon={false}>{c.type || 'قرارداد'}</Badge></td>
                        <td className="num nowrap">{money(c.amount)}</td>
                        <td className="nowrap small">{jDate(c.startDate)} <span className="faint">تا</span> {jDate(c.endDate)}</td>
                        <td className="num" dir="ltr" style={{ textAlign: 'end' }}>{c.trackingCode ? digits(c.trackingCode) : <span className="faint">—</span>}</td>
                        <td><ContractBadge c={c} /></td>
                        <td>{statusPick(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}

// ================================================================== reminders ====
const BUCKETS: { key: Reminder['bucket']; title: string; tone: 'bad' | 'warn' | 'info' | 'neutral' }[] = [
  { key: 'overdue', title: 'عقب‌افتاده', tone: 'bad' }, { key: 'today', title: 'امروز', tone: 'warn' },
  { key: 'upcoming', title: 'پیش رو', tone: 'info' }, { key: 'done', title: 'انجام‌شده', tone: 'neutral' },
];
const TYPE_ICON: Record<string, string> = { call: 'calls', visit: 'home', general: 'clock' };

function ReminderRow({ r, onToggle, openFile, openApplicant }: { r: Reminder; onToggle: (r: Reminder) => void; openFile: (id: string) => void; openApplicant: (id: string) => void }) {
  return (
    <li className={'rem-row' + (r.done ? ' done' : '') + (r.bucket === 'overdue' ? ' late' : '')}>
      <input type="checkbox" className="kss-check" checked={r.done} onChange={() => onToggle(r)} aria-label={(r.done ? 'برگرداندن ' : 'انجام شد: ') + r.title} />
      <span className="rem-ico" aria-hidden="true"><Icon name={TYPE_ICON[r.type] ?? 'clock'} size={16} /></span>
      <span className="grow">
        <b>{r.title}</b>
        <span className="faint xs block">
          {r.typeLabel} · {jDate(r.remindAt)} ساعت {jTime(r.remindAt)}
          {r.fileTitle && <> · {r.fileId ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm inline-link" onClick={() => openFile(r.fileId!)}>{r.fileTitle}</button> : r.fileTitle}</>}
          {r.applicantName && <> · {r.applicantId ? <button type="button" className="kss-btn kss-btn--link kss-btn--sm inline-link" onClick={() => openApplicant(r.applicantId!)}>{r.applicantName}</button> : r.applicantName}</>}
        </span>
        {r.description && <span className="small block muted">{r.description}</span>}
      </span>
    </li>
  );
}

function useReminders(reloadKey: number) {
  const [d, setD] = useState<Reminder[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const load = useCallback(() => api.reminders().then((x) => { setD(x.reminders); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load, reloadKey]);
  const toggle = (r: Reminder) => {
    setD((list) => list?.map((x) => (x.id === r.id ? { ...x, done: !r.done } : x)) ?? null);
    api.reminderDone(r.id, !r.done).then(() => { toast(r.done ? 'یادآور دوباره باز شد' : 'انجام شد'); void load(); }, (e: Error) => { toast(e.message, 'bad'); void load(); });
  };
  return { d, err, load, toggle };
}

/** Amin #6333 «یادآور تازه»: the app's reminder form — title, kind, Jalali day and time, linked to a file or an applicant */
export function ReminderModal({ files, preset, onClose, onMade }: {
  files: OfficeFile[]; preset: { applicantId?: string; fileId?: string; title?: string }; onClose: () => void; onMade: (r: Reminder) => void;
}) {
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const hour = Math.min(23, Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Tehran' }).format(new Date())) + 1);
  const [v, setV] = useState<Record<string, string>>({ title: preset.title ?? '', type: 'general', date: jalaliToday(), time: persian(`${String(hour).padStart(2, '0')}:00`), fileId: preset.fileId ?? '', applicantId: preset.applicantId ?? '' });
  const { busy, error, fields, submit } = useForm();
  useEffect(() => { api.applicants().then((r) => setApplicants(r.applicants.filter((a) => a.status === 'active' || a.id === preset.applicantId)), () => setApplicants([])); }, [preset.applicantId]);
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const val = (k: string) => v[k] ?? '';
  const save = () => submit(async () => {
    const r = await api.addReminder({ title: val('title').trim(), description: val('description').trim(), date: val('date'), time: latin(val('time')), type: val('type'), fileId: val('fileId') || undefined, applicantId: val('applicantId') || undefined });
    onMade(r.reminder);
  });
  return (
    <Modal title="یادآور تازه" sub="در برنامهٔ ایوان شما هم دیده می‌شود" onClose={onClose} locked={busy}
      footer={<><Btn onClick={onClose} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!val('title').trim()} onClick={() => void save()}>ذخیرهٔ یادآور</Btn></>}>
      <form className="stack sm" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="عنوان" required error={fields.title}><input className="kss-input" value={val('title')} onChange={set('title')} maxLength={120} placeholder="مثلاً تماس با آقای رضایی" autoFocus /></Field>
        <Field label="نوع"><Segmented label="نوع یادآور" value={val('type')} onChange={(t) => setV((x) => ({ ...x, type: t }))} options={[{ value: 'general', label: 'عمومی' }, { value: 'call', label: 'تماس' }, { value: 'visit', label: 'بازدید' }]} /></Field>
        <div className="two-col">
          <Field label="تاریخ" required error={fields.date} hint="شمسی، مثل ۱۴۰۵/۰۵/۱۲"><input className="kss-input num" dir="ltr" inputMode="numeric" value={val('date')} onChange={set('date')} /></Field>
          <Field label="ساعت" required error={fields.time} hint="مثل ۱۴:۳۰"><input className="kss-input num" dir="ltr" inputMode="text" value={val('time')} onChange={set('time')} maxLength={5} /></Field>
        </div>
        <div className="row tight wrap">
          {[['امروز', 0], ['فردا', 1], ['هفتهٔ بعد', 7]].map(([l, n]) => <button key={l} type="button" className="chip-toggle" onClick={() => setV((x) => ({ ...x, date: jalaliToday(n as number) }))}>{l}</button>)}
        </div>
        <Field label="مربوط به فایل" error={fields.fileId}>
          <select className="kss-input" value={val('fileId')} onChange={set('fileId')}>
            <option value="">بدون فایل</option>
            {files.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </Field>
        <Field label="مربوط به متقاضی" error={fields.applicantId}>
          <select className="kss-input" value={val('applicantId')} onChange={set('applicantId')}>
            <option value="">بدون متقاضی</option>
            {(applicants ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="توضیح"><textarea className="kss-input" rows={2} value={val('description')} onChange={set('description')} maxLength={1000} /></Field>
      </form>
      {error && <Alert tone="bad">{error}</Alert>}
    </Modal>
  );
}

export function RemindersPage({ openFile, openApplicant, onNew, reloadKey }: { openFile: (id: string) => void; openApplicant: (id: string) => void; onNew: () => void; reloadKey: number }) {
  const { d, err, load, toggle } = useReminders(reloadKey);
  const [view, setView] = useState<'now' | 'upcoming' | 'done' | 'all'>('now');
  const show: Record<string, Reminder['bucket'][]> = { now: ['overdue', 'today'], upcoming: ['upcoming'], done: ['done'], all: ['overdue', 'today', 'upcoming', 'done'] };
  const n = (b: Reminder['bucket']) => (d ?? []).filter((r) => r.bucket === b).length;
  const groups = BUCKETS.filter((b) => show[view]!.includes(b.key)).map((b) => ({ ...b, rows: (d ?? []).filter((r) => r.bucket === b.key) })).filter((g) => g.rows.length);
  return (
    <>
      <PageHeader title="یادآورها" sub="همان یادآورهای برنامهٔ ایوان شما؛ تیک بزنید تا در برنامه هم انجام‌شده شود"
        meta={d && <>{n('overdue') > 0 && <span><Icon name="warn" size={12} />{fa(n('overdue'))} عقب‌افتاده</span>}<span><Icon name="clock" size={12} />{fa(n('today'))} برای امروز</span></>}
        actions={<Btn variant="primary" icon="plus" onClick={onNew}>یادآور تازه</Btn>} />
      <Card flush>
        {err && !d ? <div className="pad"><ErrorBox what="یادآورها" error={err} retry={() => void load()} /></div> : !d ? <Skeleton rows={5} /> : !d.length ? (
          <Empty title="یادآوری ثبت نشده" action={<Btn variant="primary" icon="plus" onClick={onNew}>یادآور تازه</Btn>}>برای تماس، بازدید یا هر کار دیگری یادآور بگذارید؛ در برنامهٔ ایوان هم به شما یادآوری می‌شود.</Empty>
        ) : (
          <>
            <div className="toolbar">
              <Segmented label="کدام یادآورها" value={view} onChange={setView} options={[
                { value: 'now', label: `امروز و عقب‌افتاده (${fa(n('overdue') + n('today'))})` }, { value: 'upcoming', label: `پیش رو (${fa(n('upcoming'))})` },
                { value: 'done', label: 'انجام‌شده' }, { value: 'all', label: 'همه' }]} />
            </div>
            {!groups.length ? <Empty compact kind="filtered" title={view === 'now' ? 'برای امروز کاری نمانده' : 'یادآوری در این بخش نیست'}>{view === 'now' ? 'یادآورهای روزهای بعد در «پیش رو» است.' : undefined}</Empty> : groups.map((g) => (
              <section key={g.key} className="rem-group">
                <h3 className="rem-head"><Badge tone={g.tone} icon={false}>{g.title}</Badge><span className="faint xs">{fa(g.rows.length)} مورد</span></h3>
                <ul className="plain">{g.rows.map((r) => <ReminderRow key={r.id} r={r} onToggle={toggle} openFile={openFile} openApplicant={openApplicant} />)}</ul>
              </section>
            ))}
          </>
        )}
      </Card>
    </>
  );
}

/** the overview's «کارهای امروز»: overdue and today's reminders, ticked off in place */
export function TodayCard({ openFile, openApplicant, onNew, reloadKey }: { openFile: (id: string) => void; openApplicant: (id: string) => void; onNew: () => void; reloadKey: number }) {
  const { d, err, load, toggle } = useReminders(reloadKey);
  const rows = (d ?? []).filter((r) => r.bucket === 'overdue' || r.bucket === 'today');
  return (
    <Card title="کارهای امروز" sub={d ? (rows.length ? `${fa(rows.length)} یادآور برای امروز و عقب‌افتاده` : 'برای امروز کاری نمانده') : 'یادآورهای برنامهٔ ایوان'} flush
      end={<span className="row tight"><a className="kss-btn kss-btn--ghost kss-btn--sm" href="#/reminders">همه</a><Btn size="sm" icon="plus" onClick={onNew}>یادآور</Btn></span>}>
      {err && !d ? <div className="pad"><ErrorBox what="یادآورها" error={err} retry={() => void load()} /></div> : !d ? <Skeleton rows={3} /> : !rows.length
        ? <Empty compact icon="check" title="کاری برای امروز نمانده">یادآورهای روزهای بعد در «یادآورها» است.</Empty>
        : <ul className="plain">{rows.slice(0, 6).map((r) => <ReminderRow key={r.id} r={r} onToggle={toggle} openFile={openFile} openApplicant={openApplicant} />)}</ul>}
    </Card>
  );
}

// ================================================================== Divar (Amin #6337) ====
/** Settings: «ورود آگهی از دیوار» — the same switch as the app, turned on only with the same words agreed */
export function DivarCard({ onChange }: { onChange: (on: boolean) => void }) {
  const [d, setD] = useState<Divar | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [agree, setAgree] = useState(false);
  const { busy, run, error } = useAction();
  const load = useCallback(() => api.divar().then((x) => { setD(x); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  const turn = (on: boolean, agreed?: boolean) => run(async () => {
    const r = await api.divarConsent(on, agreed);
    setD((x) => (x ? { ...x, on: r.on, at: r.at } : x));
    setAsking(false); setAgree(false);
    onChange(r.on);
  }, on ? 'ورود آگهی از دیوار روشن شد' : 'ورود آگهی از دیوار خاموش شد');
  return (
    <Card title="اتصال به دیوار" sub="آگهی خودتان در دیوار را با یک لینک به فایل تازه تبدیل کنید؛ همان کلید برنامهٔ ایوان">
      {err && !d ? <ErrorBox what="تنظیم دیوار" error={err} retry={() => void load()} /> : !d ? <Skeleton rows={2} /> : (
        <div className="stack sm">
          <label className="row nowrap rule">
            <span><span>ورود آگهی از دیوار</span><div className="faint xs">{d.on ? `روشن${d.at ? ' از ' + ago(d.at) : ''}؛ در «فایل تازه» لینک آگهی را بچسبانید` : 'خاموش'}{d.cost != null ? ` · هر آگهی ${fa(d.cost)} توکن` : ''}</div></span>
            <input type="checkbox" role="switch" className="switch" checked={d.on} disabled={busy} onChange={(e) => (e.target.checked ? setAsking(true) : void turn(false))} />
          </label>
          <p className="muted small">روشن یا خاموش کردن این‌جا، در برنامهٔ ایوان شما هم همان‌طور می‌شود.</p>
          {error && <Alert tone="bad">{error}</Alert>}
        </div>
      )}
      {asking && d && (
        <Modal title="روشن کردن ورود آگهی از دیوار" size="sm" onClose={() => { setAsking(false); setAgree(false); }} locked={busy}
          footer={<><Btn onClick={() => { setAsking(false); setAgree(false); }} disabled={busy}>انصراف</Btn><Btn variant="primary" busy={busy} disabled={!agree} onClick={() => void turn(true, true)}>روشن کردن</Btn></>}>
          <Alert tone="warn" title="تعهد">{d.consent}</Alert>
          <label className="row nowrap check-row"><input type="checkbox" className="kss-check" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>متن بالا را خواندم و می‌پذیرم.</span></label>
        </Modal>
      )}
    </Card>
  );
}

/** the new-file window's «از لینک دیوار»: reads the manager's own post and fills the form for checking */
export function DivarImport({ onFill }: { onFill: (f: NewFile) => void }) {
  const [link, setLink] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const { busy, run, error } = useAction();
  const go = () => run(async () => {
    const r = await api.divarImport(link.trim());
    onFill(r.file);
    setNote(`اطلاعات آگهی وارد شد${r.charged ? ` (${fa(r.charged)} توکن)` : ''}؛ بررسی کنید و «ثبت فایل» را بزنید.${r.photos ? ' عکس‌ها را از برنامهٔ ایوان اضافه کنید.' : ''}`);
  });
  return (
    <div className="divar-box">
      <div className="divar-row">
        <Field label="از لینک آگهی دیوار" hint="فقط آگهی‌های خودتان"><input className="kss-input" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://divar.ir/v/…" onKeyDown={(e) => { if (e.key === 'Enter' && link.trim()) { e.preventDefault(); void go(); } }} /></Field>
        <Btn icon="download" busy={busy} disabled={!link.trim()} onClick={() => void go()}>خواندن آگهی</Btn>
      </div>
      {note && !error && <Alert tone="ok">{note}</Alert>}
      {error && <Alert tone="bad">{error}</Alert>}
    </div>
  );
}

/** the sidebar's numbers, and the overview's: applicants, active contracts, today's and overdue reminders */
export function useDesk(reloadKey: number) {
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof api.desk>> | null>(null);
  useEffect(() => { api.desk().then(setDesk, () => undefined); }, [reloadKey]);
  return desk;
}
