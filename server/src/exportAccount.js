const { Zip } = require('./zip')
const sync = require('./syncRoutes')

/**
 * Amin #5197: one account's files as a zip, for the admin «دریافت فایل‌ها» and the nightly backup.
 *   فایل‌های ملک/<عنوان>/مشخصات.txt + عکس‌ها/01.webp …
 *   متقاضیان/<نام>/مشخصات.txt
 *   قراردادها/<ملک> - <متقاضی>/مشخصات.txt + عکس‌ها/…
 *   فهرست فایل‌ها.csv, فهرست متقاضیان.csv, فهرست قراردادها.csv   (UTF-8 with BOM: Excel opens them in Persian)
 *   data.json   (every stored row as the phone sent it)
 */

const PROPERTY_FIELDS = [
  ['title', 'عنوان'],
  ['property_type', 'نوع ملک'],
  ['transaction_type', 'نوع معامله'],
  ['city', 'شهر'],
  ['region', 'منطقه'],
  ['address', 'نشانی'],
  ['price', 'قیمت (تومان)'],
  ['deposit_amount', 'ودیعه (تومان)'],
  ['rent_amount', 'اجاره (تومان)'],
  ['area', 'متراژ'],
  ['rooms', 'اتاق'],
  ['status', 'وضعیت'],
  ['description', 'توضیحات'],
  ['created_at', 'ثبت'],
  ['updated_at', 'آخرین تغییر']
]
const APPLICANT_FIELDS = [
  ['full_name', 'نام'],
  ['phone_number', 'تلفن'],
  ['applicant_type', 'نوع'],
  ['preferred_transaction_type', 'نوع معامله'],
  ['preferred_property_type', 'نوع ملک'],
  ['city', 'شهر'],
  ['region', 'منطقه'],
  ['min_budget', 'بودجه از'],
  ['max_budget', 'بودجه تا'],
  ['deposit_amount', 'ودیعه'],
  ['rent_amount', 'اجاره'],
  ['min_area', 'متراژ از'],
  ['max_area', 'متراژ تا'],
  ['rooms', 'اتاق'],
  ['status', 'وضعیت'],
  ['description', 'توضیحات'],
  ['created_at', 'ثبت']
]
const CONTRACT_FIELDS = [
  ['property', 'ملک'],
  ['applicant', 'متقاضی'],
  ['type', 'نوع'],
  ['status', 'وضعیت'],
  ['amount', 'مبلغ'],
  ['start_date', 'شروع'],
  ['end_date', 'پایان'],
  ['notes', 'یادداشت'],
  ['created_at', 'ثبت']
]

/** a name that is safe as a folder/file name on Windows, macOS and Android; never empty */
function safeName(text, fallback) {
  const cleaned = String(text ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || fallback
}

/** unique names inside one folder: «x», «x (2)», «x (3)» … */
function namer() {
  const used = new Map()
  return (name) => {
    const n = (used.get(name) ?? 0) + 1
    used.set(name, n)
    return n === 1 ? name : `${name} (${n})`
  }
}

function text(fields, row) {
  return fields
    .filter(([key]) => row[key] !== null && row[key] !== undefined && row[key] !== '')
    .map(([key, label]) => `${label}: ${row[key]}`)
    .join('\n')
}

function csv(fields, rows) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [fields.map(([, label]) => cell(label)).join(',')]
  for (const row of rows) lines.push(fields.map(([key]) => cell(row[key])).join(','))
  return '﻿' + lines.join('\r\n')
}

function photosFor(accountId, photos, subjectType, subjectId) {
  return photos
    .filter((p) => p.subject_type === subjectType && p.subject_id === subjectId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((p) => (p.blob_hash ? sync.blobOf(accountId, p.blob_hash) : p.data ? Buffer.from(p.data, 'base64') : null))
    .filter(Boolean)
}

function buildExport(accountId) {
  const stored = sync.rowsOf(accountId)
  const of = (table) => stored.filter((r) => r.table === table).map((r) => r.row)
  const properties = of('properties')
  const applicants = of('applicants')
  const photos = of('photos')
  const byId = (list) => new Map(list.map((r) => [r.id, r]))
  const propertyById = byId(properties)
  const applicantById = byId(applicants)
  const contracts = of('contracts').map((c) => ({
    ...c,
    property: propertyById.get(c.property_id)?.title ?? '',
    applicant: applicantById.get(c.applicant_id)?.full_name ?? ''
  }))

  const zip = new Zip()
  const addPhotos = (folder, list) =>
    list.forEach((data, i) => zip.add(`${folder}/عکس‌ها/${String(i + 1).padStart(2, '0')}.webp`, data))

  const propertyName = namer()
  for (const p of properties) {
    const folder = `فایل‌های ملک/${propertyName(safeName(p.title, 'فایل بی‌نام'))}`
    zip.add(`${folder}/مشخصات.txt`, text(PROPERTY_FIELDS, p))
    addPhotos(folder, photosFor(accountId, photos, 'property', p.id))
  }
  const applicantName = namer()
  for (const a of applicants) {
    zip.add(`متقاضیان/${applicantName(safeName(a.full_name, 'متقاضی بی‌نام'))}/مشخصات.txt`, text(APPLICANT_FIELDS, a))
  }
  const contractName = namer()
  for (const c of contracts) {
    const folder = `قراردادها/${contractName(safeName(`${c.property || 'ملک'} - ${c.applicant || 'متقاضی'}`, 'قرارداد'))}`
    zip.add(`${folder}/مشخصات.txt`, text(CONTRACT_FIELDS, c))
    addPhotos(folder, photosFor(accountId, photos, 'contract', c.id))
  }
  zip.add('فهرست فایل‌ها.csv', csv(PROPERTY_FIELDS, properties))
  zip.add('فهرست متقاضیان.csv', csv(APPLICANT_FIELDS, applicants))
  zip.add('فهرست قراردادها.csv', csv(CONTRACT_FIELDS, contracts))
  zip.add(
    'data.json',
    JSON.stringify(
      stored.filter((r) => r.table !== 'photos').map(({ table, key, row }) => ({ table, key, row })),
      null,
      1
    )
  )
  return {
    buffer: zip.toBuffer(),
    counts: { properties: properties.length, applicants: applicants.length, contracts: contracts.length }
  }
}

module.exports = { buildExport, safeName }
