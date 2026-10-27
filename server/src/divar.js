// Navid's order (2026-10-27, «ورود آگهی از دیوار»): the user shares ONE Divar post (or pastes its link); we read only that
// post from the public JSON Divar's own web page loads, and hand back the fields of a new file for the user to check and
// save. No lists, no crawling, no login.

const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC = '٠١٢٣٤٥٦٧٨٩'

function toAscii(text) {
  return String(text ?? '').replace(/[۰-۹٠-٩]/g, (d) => String(PERSIAN.includes(d) ? PERSIAN.indexOf(d) : ARABIC.indexOf(d)))
}

/** The first whole number in a Divar value («‏۳,۹۷۶,۰۰۰,۰۰۰ تومان» → 3976000000, «۲۶ از ۳۰» → 26), or null. */
function number(text) {
  const match = toAscii(text).replace(/[,٬،]/g, '').match(/\d+/)
  return match ? Number(match[0]) : null
}

/** A post token from a Divar link («https://divar.ir/v/gaffwOpk», «…/v/some-title/gaffwOpk») or a bare token. */
function postToken(input) {
  const text = String(input ?? '').trim()
  const link = text.match(/divar\.ir\/v\/(?:[^\s/?#]+\/)?([A-Za-z0-9_-]{6,12})(?=$|[/?#\s])/)
  if (link) return link[1]
  return /^[A-Za-z0-9_-]{6,12}$/.test(text) ? text : null
}

function propertyType(category) {
  if (/apartment/.test(category)) return 'آپارتمان'
  if (/villa|house/.test(category)) return 'ویلایی'
  if (/plot|land/.test(category)) return 'زمین'
  if (/office/.test(category)) return 'دفتر'
  if (/shop|store|commercial/.test(category)) return 'مغازه'
  return ''
}

/** Turns Divar's post JSON into the fields of a new file. Missing parts come back empty, never invented. */
function parsePost(json) {
  const sections = Array.isArray(json?.sections) ? json.sections : []
  const widgets = (name) => sections.filter((s) => s.section_name === name).flatMap((s) => s.widgets ?? [])
  const rows = {}
  const facts = {}
  for (const w of widgets('LIST_DATA')) {
    if (w.widget_type === 'UNEXPANDABLE_ROW' && w.data?.title) rows[w.data.title] = w.data.value
    if (w.widget_type === 'GROUP_INFO_ROW') for (const item of w.data?.items ?? []) facts[item.title] = item.value
  }
  const features = widgets('LIST_DATA')
    .filter((w) => w.widget_type === 'GROUP_FEATURE_ROW')
    .flatMap((w) => (w.data?.items ?? []).map((i) => i.title))
    .filter(Boolean)
  const row = (...names) => names.map((n) => rows[n]).find((v) => v != null)
  const title = widgets('TITLE').find((w) => w.widget_type === 'LEGEND_TITLE_ROW')?.data?.title ?? json?.seo?.web_info?.title ?? ''
  const description = widgets('DESCRIPTION').find((w) => w.widget_type === 'DESCRIPTION_ROW')?.data?.text ?? ''
  const photos = widgets('IMAGE')
    .flatMap((w) => w.data?.items ?? [])
    .map((i) => i.image?.url)
    // the first picture of a post with a video is the video's still frame
    .filter((url) => typeof url === 'string' && /^https:\/\/[a-z0-9.]*divarcdn\.com\//.test(url) && !/\/videos\//.test(url))
  const category = String(json?.webengage?.category ?? json?.webengage?.cat_3 ?? '')
  const rent = /rent/.test(category)
  const deposit = number(row('ودیعه', 'رهن', 'ودیعه و اجاره'))
  const monthly = number(row('اجارهٔ ماهانه', 'اجاره ماهانه', 'اجاره'))
  const total = rent ? null : number(row('قیمت کل', 'قیمت')) ?? (json?.webengage?.price || null)
  const barter = /تهاتر|معاوضه/.test(title + ' ' + description)
  const transactionTypes = [rent ? 'رهن و اجاره' : 'فروش', ...(barter ? ['تهاتر'] : [])]
  return {
    token: json?.webengage?.token ?? null,
    title,
    propertyType: propertyType(category),
    transactionTypes,
    city: json?.seo?.web_info?.city_persian ?? json?.city?.name ?? '',
    region: json?.seo?.web_info?.district_persian ?? '',
    price: total,
    deposit: rent ? deposit : null,
    rent: rent ? monthly : null,
    area: number(facts['متراژ']),
    rooms: number(facts['اتاق']),
    yearBuilt: number(facts['ساخت']),
    floor: row('طبقه') ?? null,
    features,
    description,
    photos
  }
}

const POST_URL = process.env.DIVAR_POST_URL || 'https://api.divar.ir/v8/posts-v2/web'
const CACHE_MS = 60 * 60 * 1000
const PER_HOUR = 30
const cache = new Map() // post token → { at, post }
const recent = new Map() // account → [times]

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/** One post, read once an hour at most; null when Divar says it is gone. Throws on a timeout or another answer. */
async function fetchPost(token, now = Date.now()) {
  const kept = cache.get(token)
  if (kept && now - kept.at < CACHE_MS) return kept.post
  const res = await fetch(`${POST_URL}/${encodeURIComponent(token)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  })
  if (res.status === 404 || res.status === 410) return null
  if (!res.ok) throw new Error(`divar ${res.status}`)
  const post = parsePost(await res.json())
  for (const [key, value] of cache) if (now - value.at >= CACHE_MS) cache.delete(key)
  cache.set(token, { at: now, post })
  return post
}

function tooMany(accountId, now = Date.now()) {
  const times = (recent.get(accountId) ?? []).filter((t) => now - t < 60 * 60 * 1000)
  recent.set(accountId, times)
  if (times.length >= PER_HOUR) return true
  times.push(now)
  return false
}

const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
router.use(rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }))
router.use(express.json({ limit: '4kb' }))

// POST /divar/import { sessionToken, link } → { post, charged }  (the user's own share or pasted link; one post only)
router.post('/import', async (req, res, next) => {
  try {
    const tokens = require('./tokens')
    const accountId = tokens.accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const token = postToken(req.body?.link)
    if (!token) return fail(res, 400, 'not_divar', 'این لینکِ یک آگهیِ دیوار نیست.')
    const s = await tokens.settings()
    // Amin #4302: no price set in kss-pricing = the import is off (no fallback price)
    if (!s || s.divarImportTokens == null) return fail(res, 403, 'import_off', 'ورود آگهی از دیوار هنوز فعال نشده است.')
    if (tooMany(accountId)) return fail(res, 429, 'too_many', 'در این یک ساعت آگهیِ زیادی وارد کرده‌اید؛ کمی بعد دوباره تلاش کنید.')
    const cost = s.divarImportTokens
    tokens.ensureOpening(accountId, s, tokens.storeOf(accountId))
    if (cost > 0 && tokens.balanceOf(accountId, s) < cost) {
      return fail(res, 402, 'tokens_short', 'توکنِ کافی برای ورود این آگهی ندارید.')
    }
    let post
    try {
      post = await fetchPost(token)
    } catch {
      return fail(res, 502, 'divar_unreachable', 'دیوار الان جواب نمی‌دهد؛ چند دقیقهٔ دیگر دوباره تلاش کنید.')
    }
    if (!post || !post.title) return fail(res, 404, 'post_gone', 'این آگهی در دیوار پیدا نشد؛ شاید حذف یا منقضی شده است.')
    // the same post again on the same day is not charged twice
    const day = new Date().toISOString().slice(0, 10)
    const charged = cost > 0 && tokens.post(accountId, 'divar_import', -cost, `divar:${token}:${day}`, token)
    res.json({ post, charged: charged ? cost : 0 })
  } catch (error) {
    next(error)
  }
})

module.exports = { postToken, parsePost, number, fetchPost, router }
