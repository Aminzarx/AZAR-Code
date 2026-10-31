// KSS (Amin #6333/#6337): the app's own work in the office dashboard — applicants, matching, contracts, reminders and the
// Divar import, all on the manager's OWN app data (one set of data, #6330). Reads come from the manager's copy on the
// server (sync_rows), writes go back into it as rows the app loads as they are (same tables, columns and rules as the
// app's forms), so a thing made here shows in the phone and the other way round. Applicants and contracts cost tokens
// the way the app charges a record; reminders cost nothing, as in the app.
//
// mount(manager, deps) is called once from officeRoutes.js, before its «/rules» route; every route here runs behind
// the dashboard's session (req.office = { id, owner_user_id, name }).

// ---------------------------------------------------------------- the app's vocabularies ----
const APPLICANT_KINDS = ['خرید', 'رهن و اجاره', 'تهاتر'] // src/shared/utils/dealKinds.ts
const DEAL_KINDS = ['فروش', 'رهن و اجاره', 'تهاتر']
const PROPERTY_TYPES = ['آپارتمان', 'ویلایی', 'زمین', 'مغازه', 'دفتر'] // src/shared/data/realEstateOptions.ts
const BARTER_ITEMS = ['طلا', 'خودرو', 'زمین', 'ملک', 'سایر']
const CONTRACT_KINDS = ['خرید و فروش', 'رهن و اجاره', 'تهاتر'] // src/features/contract/types.ts (Amin #5295)
const CONTRACT_STATUS = { active: 'فعال', completed: 'تکمیل‌شده', cancelled: 'لغوشده' }
const REMINDER_TYPES = { general: 'عمومی', call: 'تماس', visit: 'بازدید' } // src/features/reminder/components/ReminderForm.tsx
// src/features/matching/services/matchingService.ts
const WEIGHTS = { city: 25, propertyType: 20, transactionType: 15, budget: 20, area: 10, rooms: 10 }
const CRITERIA = {
  city: 'شهر یکسان',
  propertyType: 'نوع ملک مطابق با ترجیح متقاضی',
  transactionType: 'نوع معامله مطابق با ترجیح متقاضی',
  budget: 'قیمت در محدوده بودجه',
  area: 'متراژ در محدوده موردنظر',
  rooms: 'تعداد اتاق مطابق'
}
// the kinds the server itself wrote into a copy before the app's Persian vocabulary (officeRoutes' propertyRowOf)
const SERVER_KIND = { sale: 'فروش', rent: 'رهن و اجاره', barter: 'تهاتر' }

const toLatin = (v) => String(v ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
/** src/shared/utils/persianText.ts normalizePersianText */
const norm = (v) =>
  String(v ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ْ]/g, '').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const SEPARATOR = /[،,|]/

/** a stored file transaction type → its kinds in DEAL_KINDS order (parseDealKinds) */
function dealKinds(value) {
  const found = new Set()
  for (const raw of String(value ?? '').split(SEPARATOR)) {
    const p = norm(SERVER_KIND[raw.trim()] ?? raw)
    if (!p) continue
    if (p === norm('فروش')) found.add('فروش')
    else if (p === norm('تهاتر')) found.add('تهاتر')
    else if (p.includes(norm('رهن')) || p.includes(norm('اجاره'))) found.add('رهن و اجاره')
  }
  return DEAL_KINDS.filter((k) => found.has(k))
}
/** an applicant's wanted value → the file kinds that serve it (kindsForApplicant) */
function wantedKinds(value) {
  const found = new Set()
  for (const raw of String(value ?? '').split(SEPARATOR)) {
    const a = norm(raw)
    if (!a) continue
    if (a === norm('خرید')) found.add('فروش')
    else if (a === norm('تهاتر')) found.add('تهاتر')
    else if (a.includes(norm('رهن')) || a.includes(norm('اجاره')) || a === norm('استیجاری')) found.add('رهن و اجاره')
  }
  return DEAL_KINDS.filter((k) => found.has(k))
}
const APPLICANT_KIND_FOR = { فروش: 'خرید', 'رهن و اجاره': 'رهن و اجاره', تهاتر: 'تهاتر' }
const applicantKinds = (value) => wantedKinds(value).map((k) => APPLICANT_KIND_FOR[k])

// ---------------------------------------------------------------- matching (the app's rules) ----
function inRange(value, min, max) {
  if (value == null || (min == null && max == null)) return false
  if (min != null && value < min) return false
  if (max != null && value > max) return false
  return true
}
function budgetFits(p, a) {
  const wanted = wantedKinds(a.preferred_transaction_type)
  if (!wanted.length) return inRange(p.price, a.min_budget, a.max_budget)
  const offered = dealKinds(p.transaction_type)
  const shared = wanted.filter((k) => !offered.length || offered.includes(k))
  return shared.some((kind) => {
    if (kind !== 'رهن و اجاره') return inRange(p.price, a.min_budget, a.max_budget)
    if (a.deposit_amount != null && a.deposit_amount > 0) return p.deposit_amount != null && p.deposit_amount <= a.deposit_amount
    return wanted.length === 1 && inRange(p.deposit_amount, a.min_budget, a.max_budget)
  })
}
/** scoreMatch: null = never a match (closed or archived file, kinds that clash, other city); else { score, criteria } */
function scoreMatch(p, a, closed) {
  if (p.status !== 'active' || closed) return null
  const kinds = dealKinds(p.transaction_type)
  const wanted = wantedKinds(a.preferred_transaction_type)
  if (kinds.length && wanted.length && !kinds.some((k) => wanted.includes(k))) return null
  const pc = String(p.city ?? ''), ac = String(a.city ?? '')
  const bothCities = Boolean(pc.trim() && ac.trim())
  const sameCity = norm(pc) === norm(ac)
  if (bothCities && !sameCity) return null
  const hit = []
  if (bothCities && sameCity) hit.push('city')
  if (a.preferred_property_type && p.property_type && norm(a.preferred_property_type) === norm(p.property_type)) hit.push('propertyType')
  const compatible = (() => {
    if (!String(p.transaction_type ?? '').trim() || !String(a.preferred_transaction_type ?? '').trim()) return false
    if (kinds.length && wanted.length) return kinds.some((k) => wanted.includes(k))
    if (kinds.length || wanted.length) return false
    return norm(p.transaction_type) === norm(a.preferred_transaction_type)
  })()
  if (compatible) hit.push('transactionType')
  if (budgetFits(p, a)) hit.push('budget')
  if (inRange(p.area, a.min_area, a.max_area)) hit.push('area')
  if (a.rooms != null && p.rooms != null && a.rooms === p.rooms) hit.push('rooms')
  return { score: hit.reduce((s, c) => s + WEIGHTS[c], 0), criteria: hit }
}

// ---------------------------------------------------------------- Jalali dates (jalaali-js, as the app uses) ----
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
const div = (a, b) => ~~(a / b)
const mod = (a, b) => a - ~~(a / b) * b
function jalCal(jy) {
  const gy = jy + 621
  let leapJ = -14, jp = BREAKS[0], jump = 0
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}
function g2d(gy, gm, gd) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}
/** «۱۴۰۵/۵/۱۲», «1405-05-12»… → Gregorian «YYYY-MM-DD», or null when it is not a real Jalali day (parseJalaliDate) */
function jalaliToIso(input) {
  const m = toLatin(input).trim().match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (!m) return null
  const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1) return null
  const length = jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 0 ? 30 : 29
  if (jd > length) return null
  const r = jalCal(jy)
  const { gy, gm, gd } = d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1)
  const pad = (v) => String(v).padStart(2, '0')
  return `${gy}-${pad(gm)}-${pad(gd)}`
}
/** Tehran's calendar day (UTC+3:30, no daylight saving since 2022) of an ISO time */
const tehranDay = (iso) => new Date(Date.parse(iso) + 3.5 * 3600 * 1000).toISOString().slice(0, 10)

// ---------------------------------------------------------------- the routes ----
function mount(manager, deps) {
  const { db, rowsOf, putRow, tokens, fail, text, generateId, now, tokensShort, officeBalance, keyOfFile, fileOfKey, shownPhone } = deps
  const roundT = (n) => Math.round(n * 1000) / 1000

  /** the manager's copy, by table: Map key → row (deleted rows left out) */
  function copyOf(office) {
    const t = { properties: new Map(), applicants: new Map(), contracts: new Map(), reminders: new Map(), deals: new Map(), contacts: new Map() }
    for (const r of rowsOf(office.owner_user_id)) if (r.row && t[r.table]) t[r.table].set(r.key, r.row)
    return t
  }
  /** a file is no longer on offer once it has a live contract or a deal at «قرارداد»/«موفق» (Amin #5241) */
  function closedFiles(c) {
    const out = new Set()
    for (const k of c.contracts.values()) if (['active', 'completed'].includes(k.status)) out.add(k.property_id)
    for (const d of c.deals.values()) if (['contract', 'won'].includes(d.current_stage)) out.add(d.property_id)
    return out
  }
  /** an office file id (or a copy key) → the copy's key, when that file is in the copy */
  function fileKey(office, c, id) {
    const raw = String(id ?? '')
    if (!raw) return null
    if (c.properties.has(raw)) return raw
    const key = keyOfFile(office.owner_user_id, raw)
    return c.properties.has(key) ? key : null
  }
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(toLatin(v).replace(/[,٬،\s]/g, ''))
    return Number.isFinite(n) ? n : NaN
  }

  const fileView = (office, key, p, closed) => {
    const kinds = dealKinds(p.transaction_type)
    return {
      id: fileOfKey(office.owner_user_id, key), title: String(p.title || 'فایل'), kinds, kind: kinds.join('، '),
      propertyType: p.property_type || '', city: p.city || '', region: p.region || '', price: p.price ?? null,
      deposit: p.deposit_amount ?? null, rent: p.rent_amount ?? null, size: p.area ?? null, rooms: p.rooms ?? null,
      archived: p.status === 'archived', closed: !!closed
    }
  }
  const applicantView = (key, a) => {
    let barter = []
    try { barter = a.barter_items ? JSON.parse(a.barter_items) : [] } catch { barter = [] }
    return {
      id: key, name: a.full_name || '', phone: shownPhone(a.phone_number), kinds: applicantKinds(a.preferred_transaction_type),
      propertyType: a.preferred_property_type || '', city: a.city || '', region: a.region || '',
      barterItems: Array.isArray(barter) ? barter : [], barterOther: a.barter_other_description || '',
      minBudget: a.min_budget ?? null, maxBudget: a.max_budget ?? null, minArea: a.min_area ?? null, maxArea: a.max_area ?? null,
      rooms: a.rooms ?? null, deposit: a.deposit_amount ?? null, rent: a.rent_amount ?? null, convertible: !!a.is_convertible,
      description: a.description || '', status: a.status === 'archived' ? 'archived' : 'active', createdAt: a.created_at || null, updatedAt: a.updated_at || null
    }
  }
  const label = (c, office) => ({
    file: (key) => (c.properties.get(key)?.title ? String(c.properties.get(key).title) : null),
    applicant: (key) => c.applicants.get(key)?.full_name || null
  })
  const contractView = (office, c, key, k) => ({
    id: key, type: k.type || '', status: k.status || 'active', statusLabel: CONTRACT_STATUS[k.status] || 'فعال', amount: k.amount ?? null,
    startDate: k.start_date || null, endDate: k.end_date || null, trackingCode: k.tracking_code || '', notes: k.notes || '',
    fileId: c.properties.has(k.property_id) ? fileOfKey(office.owner_user_id, k.property_id) : null,
    fileTitle: label(c, office).file(k.property_id) || k.property_label || 'فایل حذف‌شده',
    applicantId: c.applicants.has(k.applicant_id) ? k.applicant_id : null,
    applicantName: label(c, office).applicant(k.applicant_id) || k.applicant_label || 'متقاضی حذف‌شده',
    archived: !!k.archived_at, createdAt: k.created_at || null
  })
  function reminderView(office, c, key, r, at = now()) {
    const due = r.remind_at || at
    const bucket = r.is_done ? 'done' : due < at ? 'overdue' : tehranDay(due) === tehranDay(at) ? 'today' : 'upcoming'
    return {
      id: key, title: r.title || '', description: r.description || '', remindAt: due, type: r.reminder_type || 'general',
      typeLabel: REMINDER_TYPES[r.reminder_type] || 'عمومی', done: !!r.is_done, bucket,
      fileId: r.property_id && c.properties.has(r.property_id) ? fileOfKey(office.owner_user_id, r.property_id) : null,
      fileTitle: r.property_id ? label(c, office).file(r.property_id) : null,
      applicantId: r.applicant_id && c.applicants.has(r.applicant_id) ? r.applicant_id : null,
      applicantName: r.applicant_id ? label(c, office).applicant(r.applicant_id) : null
    }
  }

  /**
   * Writes rows and charges the records among them the way the app charges a save (one transaction: short = nothing
   * stored). → { spent, balance }, or null after answering 402/503.
   */
  async function charged(req, res, write, subjects) {
    const s = await tokens.settings()
    if (!s) {
      fail(res, 503, 'tokens_unavailable', 'الان توکن‌ها خوانده نمی‌شوند؛ کمی بعد دوباره امتحان کنید.')
      return null
    }
    const owner = req.office.owner_user_id
    let spent = 0
    try {
      db.transaction(() => {
        write()
        spent = -tokens.chargeRecords(owner, subjects, s, tokens.storeOf(owner)).reduce((t, r) => t + r.amount, 0)
      })()
    } catch (e) {
      if (!(e instanceof tokens.TokensShortError)) throw e
      tokensShort(res, e.balance, e.needed)
      return null
    }
    return { spent: roundT(spent), balance: officeBalance(req.office.id) }
  }
  const invalid = (res, code, errors) => fail(res, 422, code, Object.values(errors)[0], { fields: errors })

  // ---------------------------------------------------------- the dashboard's desk (sidebar counts) ----
  // GET /office/desk → { applicants, contracts, reminders: { overdue, today }, divar: { on } }
  manager.get('/desk', (req, res) => {
    const c = copyOf(req.office)
    const at = now()
    const open = [...c.reminders.entries()].map(([k, r]) => reminderView(req.office, c, k, r, at))
    res.json({
      applicants: [...c.applicants.values()].filter((a) => a.status !== 'archived').length,
      contracts: [...c.contracts.values()].filter((k) => k.status === 'active' && !k.archived_at).length,
      reminders: { overdue: open.filter((r) => r.bucket === 'overdue').length, today: open.filter((r) => r.bucket === 'today').length },
      divar: { on: require('./divar').consentOf(req.office.owner_user_id).on }
    })
  })

  // ---------------------------------------------------------- applicants (Amin #6333) ----
  /** the app's create-applicant form (validateApplicantForm) → { row fields } or { errors } */
  function applicantFrom(b) {
    const errors = {}
    const fullName = text(b.name, 80)
    const phone = toLatin(text(b.phone, 24)).replace(/[\s\-()]/g, '')
    const city = text(b.city, 60)
    if (!fullName) errors.name = 'نام الزامی است.'
    if (!phone) errors.phone = 'شماره تماس الزامی است.'
    else if (!/^\+?\d{5,15}$/.test(phone)) errors.phone = 'شماره تماس را با رقم بنویسید.'
    if (!city) errors.city = 'شهر الزامی است.'
    const kinds = APPLICANT_KINDS.filter((k) => Array.isArray(b.kinds) && b.kinds.includes(k))
    const positive = (field) => {
      const v = num(b[field])
      if (v === null) return null
      if (Number.isNaN(v) || v <= 0) { errors[field] = 'عدد معتبر و بزرگ‌تر از صفر وارد کنید.'; return null }
      return v
    }
    const nonNegative = (field) => {
      const v = num(b[field])
      if (v === null) return null
      if (Number.isNaN(v) || v < 0) { errors[field] = 'عدد معتبر و بزرگ‌تر یا مساوی صفر وارد کنید.'; return null }
      return v
    }
    const minBudget = positive('minBudget'), maxBudget = positive('maxBudget')
    const minArea = positive('minArea'), maxArea = positive('maxArea'), rooms = positive('rooms')
    const deposit = nonNegative('deposit'), rent = nonNegative('rent')
    if (minBudget !== null && maxBudget !== null && maxBudget < minBudget) errors.maxBudget = 'سقف بودجه باید بزرگ‌تر یا مساوی حداقل بودجه باشد.'
    if (minArea !== null && maxArea !== null && maxArea < minArea) errors.maxArea = 'حداکثر متراژ باید بزرگ‌تر یا مساوی حداقل متراژ باشد.'
    // Amin #5327: buy/barter need a budget, رهن و اجاره a رهن or اجاره
    if ((kinds.includes('خرید') || kinds.includes('تهاتر')) && !errors.minBudget && !errors.maxBudget && minBudget === null && maxBudget === null) errors.minBudget = 'بودجه را وارد کنید.'
    if (kinds.includes('رهن و اجاره') && !errors.deposit && !errors.rent && deposit === null && rent === null) errors.deposit = 'رهن یا اجارهٔ موردنظر را وارد کنید.'
    // Amin #5408: a barter applicant names what they offer
    const barterItems = kinds.includes('تهاتر') ? BARTER_ITEMS.filter((x) => Array.isArray(b.barterItems) && b.barterItems.includes(x)) : []
    if (kinds.includes('تهاتر') && !barterItems.length) errors.barterItems = 'دست‌کم یک مورد تهاتر را انتخاب کنید.'
    const barterOther = text(b.barterOther, 300)
    if (barterItems.includes('سایر') && !barterOther) errors.barterOther = 'برای گزینه «سایر» توضیح مورد تهاتر را وارد کنید.'
    if (Object.keys(errors).length) return { errors }
    const rentMode = kinds.includes('رهن و اجاره')
    return {
      fields: {
        full_name: fullName, phone_number: phone, email: null, applicant_type: null,
        preferred_transaction_type: kinds.join('، ') || null, preferred_property_type: text(b.propertyType, 40) || null,
        city, region: text(b.region, 60) || null,
        barter_items: barterItems.length ? JSON.stringify(barterItems) : null,
        barter_other_description: barterItems.includes('سایر') ? barterOther : null,
        min_budget: minBudget, max_budget: maxBudget, min_area: minArea, max_area: maxArea, rooms,
        deposit_amount: deposit, rent_amount: rent, is_convertible: rentMode && b.convertible === true ? 1 : 0,
        description: text(b.description, 2000) || null
      }
    }
  }

  // GET /office/applicants → { applicants, kinds, propertyTypes, barterItems }
  manager.get('/applicants', (req, res) => {
    const c = copyOf(req.office)
    const closed = closedFiles(c)
    const files = [...c.properties.entries()]
    const applicants = [...c.applicants.entries()]
      .map(([k, a]) => ({
        ...applicantView(k, a),
        matches: a.status === 'archived' ? 0 : files.filter(([pk, p]) => (scoreMatch(p, a, closed.has(pk))?.score ?? 0) > 0).length
      }))
      .sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)))
    res.json({ applicants, kinds: APPLICANT_KINDS, propertyTypes: PROPERTY_TYPES, barterItems: BARTER_ITEMS })
  })

  // POST /office/applicants { name, phone, kinds[], propertyType, city, region, barterItems[], barterOther, minBudget, maxBudget,
  //   minArea, maxArea, rooms, deposit, rent, convertible, description } → 201 { applicant, tokens, balance }
  manager.post('/applicants', async (req, res, next) => {
    try {
      const { fields, errors } = applicantFrom(req.body || {})
      if (errors) return invalid(res, 'invalid_applicant', errors)
      const owner = req.office.owner_user_id
      const id = generateId()
      const at = now()
      const row = { id, user_id: owner, ...fields, status: 'active', created_at: at, updated_at: at }
      const done = await charged(req, res, () => putRow(owner, 'applicants', id, row, at), [{ table: 'applicants', key: id }])
      if (!done) return
      res.status(201).json({ applicant: applicantView(id, row), tokens: done.spent, balance: done.balance })
    } catch (e) {
      next(e)
    }
  })

  // GET /office/applicants/:id → { applicant, matches, contracts, reminders }
  manager.get('/applicants/:id', (req, res) => {
    const c = copyOf(req.office)
    const a = c.applicants.get(req.params.id)
    if (!a) return fail(res, 404, 'not_found', 'متقاضی پیدا نشد.')
    res.json({
      applicant: applicantView(req.params.id, a),
      matches: matchesForApplicant(req.office, c, a),
      contracts: [...c.contracts.entries()].filter(([, k]) => k.applicant_id === req.params.id).map(([k, v]) => contractView(req.office, c, k, v)),
      reminders: [...c.reminders.entries()].filter(([, r]) => r.applicant_id === req.params.id).map(([k, r]) => reminderView(req.office, c, k, r))
        .sort((x, y) => x.remindAt.localeCompare(y.remindAt))
    })
  })

  // POST /office/applicants/:id/status { status: 'active' | 'archived' } → { applicant }
  manager.post('/applicants/:id/status', async (req, res, next) => {
    try {
      const status = req.body?.status
      if (!['active', 'archived'].includes(status)) return fail(res, 422, 'invalid_status', 'وضعیت را انتخاب کنید.')
      const c = copyOf(req.office)
      const a = c.applicants.get(req.params.id)
      if (!a) return fail(res, 404, 'not_found', 'متقاضی پیدا نشد.')
      const owner = req.office.owner_user_id
      const at = now()
      const row = { ...a, status, updated_at: at }
      const done = await charged(req, res, () => putRow(owner, 'applicants', req.params.id, row, at), [{ table: 'applicants', key: req.params.id }])
      if (!done) return
      res.json({ applicant: applicantView(req.params.id, row), balance: done.balance })
    } catch (e) {
      next(e)
    }
  })

  // ---------------------------------------------------------- matching (Amin #6333) ----
  function matchesForApplicant(office, c, a) {
    const closed = closedFiles(c)
    return [...c.properties.entries()]
      .map(([k, p]) => {
        const m = scoreMatch(p, a, closed.has(k))
        return m && m.score > 0 ? { file: fileView(office, k, p, false), score: m.score, criteria: m.criteria.map((x) => CRITERIA[x]) } : null
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score)
  }
  function matchesForFile(c, key) {
    const p = c.properties.get(key)
    const closed = closedFiles(c).has(key)
    return [...c.applicants.entries()]
      .filter(([, a]) => a.status !== 'archived')
      .map(([k, a]) => {
        const m = scoreMatch(p, a, closed)
        return m && m.score > 0 ? { applicant: applicantView(k, a), score: m.score, criteria: m.criteria.map((x) => CRITERIA[x]) } : null
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score)
  }

  // GET /office/matches → { applicants: [{ id, name, kinds, city, count, best }], files: [{ id, title, kind, city, region, count, best }] }
  manager.get('/matches', (req, res) => {
    const c = copyOf(req.office)
    const closed = closedFiles(c)
    const live = [...c.applicants.entries()].filter(([, a]) => a.status !== 'archived')
    const files = [...c.properties.entries()].filter(([k, p]) => p.status === 'active' && !closed.has(k))
    const pairs = files.flatMap(([pk, p]) => live.map(([ak, a]) => ({ pk, ak, m: scoreMatch(p, a, false) }))).filter((x) => x.m && x.m.score > 0)
    const sum = (list) => ({ count: list.length, best: list.reduce((b, x) => Math.max(b, x.m.score), 0) })
    res.json({
      applicants: live.map(([k, a]) => ({ id: k, name: a.full_name || '', kinds: applicantKinds(a.preferred_transaction_type), city: a.city || '', region: a.region || '', ...sum(pairs.filter((x) => x.ak === k)) }))
        .sort((x, y) => y.best - x.best || y.count - x.count),
      files: files.map(([k, p]) => ({ ...fileView(req.office, k, p, false), ...sum(pairs.filter((x) => x.pk === k)) }))
        .sort((x, y) => y.best - x.best || y.count - x.count)
    })
  })

  // GET /office/matches/applicant/:id → { applicant, files: [{ file, score, criteria }] }
  manager.get('/matches/applicant/:id', (req, res) => {
    const c = copyOf(req.office)
    const a = c.applicants.get(req.params.id)
    if (!a) return fail(res, 404, 'not_found', 'متقاضی پیدا نشد.')
    res.json({ applicant: applicantView(req.params.id, a), files: a.status === 'archived' ? [] : matchesForApplicant(req.office, c, a) })
  })

  // GET /office/matches/file/:id (an office file id) → { file, applicants: [{ applicant, score, criteria }] }
  manager.get('/matches/file/:id', (req, res) => {
    const c = copyOf(req.office)
    const key = fileKey(req.office, c, req.params.id)
    if (!key) return fail(res, 404, 'not_found', 'فایل پیدا نشد.')
    const closed = closedFiles(c).has(key)
    res.json({ file: fileView(req.office, key, c.properties.get(key), closed), applicants: matchesForFile(c, key) })
  })

  // ---------------------------------------------------------- contracts (Amin #6333) ----
  // GET /office/contracts → { contracts, kinds, statuses }
  manager.get('/contracts', (req, res) => {
    const c = copyOf(req.office)
    const contracts = [...c.contracts.entries()].map(([k, v]) => contractView(req.office, c, k, v))
      .sort((x, y) => String(y.startDate).localeCompare(String(x.startDate)) || String(y.createdAt).localeCompare(String(x.createdAt)))
    res.json({ contracts, kinds: CONTRACT_KINDS, statuses: CONTRACT_STATUS })
  })

  // POST /office/contracts { fileId, applicantId, type, amount, startDate, endDate (Jalali), trackingCode, notes } → 201 { contract, tokens, balance }
  manager.post('/contracts', async (req, res, next) => {
    try {
      const b = req.body || {}
      const c = copyOf(req.office)
      const errors = {}
      const key = fileKey(req.office, c, b.fileId)
      if (!key) errors.fileId = 'فایل ملک را انتخاب کنید.'
      const applicantId = c.applicants.has(String(b.applicantId ?? '')) ? String(b.applicantId) : null
      if (!applicantId) errors.applicantId = 'طرف قرارداد (متقاضی) را انتخاب کنید.'
      const type = CONTRACT_KINDS.includes(b.type) ? b.type : null
      if (!type) errors.type = 'نوع قرارداد را انتخاب کنید.'
      const start = jalaliToIso(b.startDate)
      const end = jalaliToIso(b.endDate)
      if (!start) errors.startDate = 'مثل ۱۴۰۵/۰۵/۱۲ وارد کنید.'
      if (!end) errors.endDate = 'مثل ۱۴۰۵/۰۵/۱۲ وارد کنید.'
      if (start && end && end < start) errors.endDate = 'تاریخ پایان باید بعد از تاریخ شروع باشد.'
      const amount = num(b.amount)
      if (amount !== null && (Number.isNaN(amount) || amount <= 0)) errors.amount = 'مبلغ باید عدد معتبر و بزرگ‌تر از صفر باشد.'
      if (Object.keys(errors).length) return invalid(res, 'invalid_contract', errors)
      const owner = req.office.owner_user_id
      const id = generateId()
      const at = now()
      const row = {
        id, user_id: owner, property_id: key, applicant_id: applicantId, deal_id: null, type, status: 'active', amount,
        start_date: start, end_date: end, notes: text(b.notes, 2000) || null, created_at: at, updated_at: at,
        buyer_contact_id: null, seller_contact_id: null, transaction_type: null, total_price: null, deposit: null, monthly_rent: null,
        archived_at: null, tracking_code: text(b.trackingCode, 40) || null, calendar_event_id: null, property_label: null, applicant_label: null
      }
      const done = await charged(req, res, () => putRow(owner, 'contracts', id, row, at), [{ table: 'contracts', key: id }])
      if (!done) return
      c.contracts.set(id, row)
      res.status(201).json({ contract: contractView(req.office, c, id, row), tokens: done.spent, balance: done.balance })
    } catch (e) {
      next(e)
    }
  })

  // POST /office/contracts/:id/status { status: active | completed | cancelled } → { contract }
  manager.post('/contracts/:id/status', async (req, res, next) => {
    try {
      const status = req.body?.status
      if (!CONTRACT_STATUS[status]) return fail(res, 422, 'invalid_status', 'وضعیت قرارداد را انتخاب کنید.')
      const c = copyOf(req.office)
      const k = c.contracts.get(req.params.id)
      if (!k) return fail(res, 404, 'not_found', 'قرارداد پیدا نشد.')
      const owner = req.office.owner_user_id
      const at = now()
      const row = { ...k, status, updated_at: at }
      const done = await charged(req, res, () => putRow(owner, 'contracts', req.params.id, row, at), [{ table: 'contracts', key: req.params.id }])
      if (!done) return
      c.contracts.set(req.params.id, row)
      res.json({ contract: contractView(req.office, c, req.params.id, row), balance: done.balance })
    } catch (e) {
      next(e)
    }
  })

  // ---------------------------------------------------------- reminders (Amin #6333) ----
  // GET /office/reminders → { reminders (soonest first; done ones last), types }
  manager.get('/reminders', (req, res) => {
    const c = copyOf(req.office)
    const at = now()
    const list = [...c.reminders.entries()].map(([k, r]) => reminderView(req.office, c, k, r, at))
    const open = list.filter((r) => !r.done).sort((x, y) => x.remindAt.localeCompare(y.remindAt))
    const done = list.filter((r) => r.done).sort((x, y) => y.remindAt.localeCompare(x.remindAt)).slice(0, 100)
    res.json({ reminders: [...open, ...done], types: REMINDER_TYPES })
  })

  // POST /office/reminders { title, description, date (Jalali), time (HH:mm), type, fileId?, applicantId? } → 201 { reminder }
  manager.post('/reminders', (req, res) => {
    const b = req.body || {}
    const c = copyOf(req.office)
    const errors = {}
    const title = text(b.title, 120)
    if (!title) errors.title = 'عنوان الزامی است.'
    const day = jalaliToIso(b.date)
    if (!day) errors.date = 'تاریخ را به‌صورت ۱۴۰۵/۰۵/۱۲ (سال/ماه/روز شمسی) وارد کنید.'
    const time = toLatin(text(b.time, 5))
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) errors.time = 'زمان را به‌صورت ۱۴:۳۰ (ساعت:دقیقه) وارد کنید.'
    const type = REMINDER_TYPES[b.type] ? b.type : 'general'
    const key = b.fileId ? fileKey(req.office, c, b.fileId) : null
    if (b.fileId && !key) errors.fileId = 'فایل پیدا نشد.'
    const applicantId = b.applicantId ? (c.applicants.has(String(b.applicantId)) ? String(b.applicantId) : null) : null
    if (b.applicantId && !applicantId) errors.applicantId = 'متقاضی پیدا نشد.'
    if (Object.keys(errors).length) return invalid(res, 'invalid_reminder', errors)
    // the phone keeps the time of day as typed in Tehran
    const remindAt = new Date(Date.parse(`${day}T${time}:00+03:30`)).toISOString()
    const owner = req.office.owner_user_id
    const id = generateId()
    const at = now()
    const row = {
      id, user_id: owner, property_id: key, applicant_id: applicantId, deal_id: null, title, description: text(b.description, 1000) || null,
      remind_at: remindAt, is_done: 0, created_at: at, updated_at: at, contact_id: null, contract_id: null, reminder_type: type
    }
    putRow(owner, 'reminders', id, row, at)
    res.status(201).json({ reminder: reminderView(req.office, c, id, row) })
  })

  // POST /office/reminders/:id/done { done: boolean } → { reminder }
  manager.post('/reminders/:id/done', (req, res) => {
    if (typeof req.body?.done !== 'boolean') return fail(res, 422, 'invalid_request', 'انجام شد یا نشد را بفرستید.')
    const c = copyOf(req.office)
    const r = c.reminders.get(req.params.id)
    if (!r) return fail(res, 404, 'not_found', 'یادآور پیدا نشد.')
    const at = now()
    const row = { ...r, is_done: req.body.done ? 1 : 0, updated_at: at }
    putRow(req.office.owner_user_id, 'reminders', req.params.id, row, at)
    res.json({ reminder: reminderView(req.office, c, req.params.id, row) })
  })

  // ---------------------------------------------------------- Divar (Amin #6337) ----
  // The same per-account switch as the app (Settings › «اتصال‌ها و API‌ها»), with the same words agreed to; turning it on
  // here turns it on in the app too, and the other way round.
  // GET /office/divar → { on, at, consent, cost }
  manager.get('/divar', async (req, res, next) => {
    try {
      const divar = require('./divar')
      const s = await tokens.settings()
      res.json({ ...divar.consentOf(req.office.owner_user_id), consent: divar.CONSENT_TEXT, cost: s?.divarImportTokens ?? null })
    } catch (e) {
      next(e)
    }
  })

  // POST /office/divar/consent { on, agree } → { on, at }  (turning on needs agree: true — the manager ticked the words)
  manager.post('/divar/consent', (req, res) => {
    if (typeof req.body?.on !== 'boolean') return fail(res, 422, 'invalid_request', 'روشن یا خاموش را بفرستید.')
    if (req.body.on && req.body.agree !== true) return fail(res, 422, 'consent_required', 'برای روشن کردن، متن تعهد را بپذیرید.')
    res.json(require('./divar').setConsent(req.office.owner_user_id, req.body.on))
  })

  // POST /office/divar/import { link } → { file (the new-file form's fields), charged, balance }
  manager.post('/divar/import', async (req, res, next) => {
    try {
      const r = await require('./divar').importFor(req.office.owner_user_id, req.body?.link)
      if (r.status) {
        if (r.code === 'consent_required') return fail(res, 403, r.code, 'ورود آگهی از دیوار خاموش است؛ از «تنظیمات» داشبورد روشنش کنید.')
        if (r.code === 'tokens_short') {
          const s = await tokens.settings()
          return tokensShort(res, officeBalance(req.office.id), s?.divarImportTokens ?? 0)
        }
        return fail(res, r.status, r.code, r.message)
      }
      const p = r.post
      const kind = p.transactionTypes?.[0] === 'رهن و اجاره' ? 'رهن و اجاره' : p.transactionTypes?.[0] === 'تهاتر' ? 'تهاتر' : 'فروش'
      const extra = [p.yearBuilt ? `سال ساخت: ${p.yearBuilt}` : '', p.floor ? `طبقه: ${p.floor}` : '', p.features?.length ? `امکانات: ${p.features.join('، ')}` : '']
        .filter(Boolean).join('\n')
      res.json({
        file: {
          title: String(p.title || '').slice(0, 120), kind, propertyType: p.propertyType || '', city: p.city || 'تهران', region: p.region || '',
          size: p.area ?? null, rooms: p.rooms ?? null, price: p.price ?? null, deposit: p.deposit ?? null, rent: p.rent ?? null,
          description: [p.description, extra].filter(Boolean).join('\n\n').slice(0, 2000)
        },
        photos: (p.photos || []).length,
        charged: r.charged,
        balance: officeBalance(req.office.id)
      })
    } catch (e) {
      next(e)
    }
  })
}

module.exports = { mount, jalaliToIso, scoreMatch, dealKinds, wantedKinds }
