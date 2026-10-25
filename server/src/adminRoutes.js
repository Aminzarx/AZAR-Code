const crypto = require('node:crypto')
const fs = require('node:fs')
const express = require('express')
const db = require('./db')
const tokens = require('./tokens')
const sync = require('./syncRoutes')
const { licenceOf } = require('./licenceRoutes')
const { buildExport } = require('./exportAccount')

/**
 * Amin #5197: the billing panel's «اپلیکیشن‌ها › ایوان» reads and manages EYVAN accounts here.
 * Spec: kss-system/specs/eyvan-admin-api.md. Only from the same machine (127.0.0.1, never through nginx: a request
 * that carries X-Forwarded-For is refused) and only with the admin key (systemd credential eyvan-admin.key, file
 * AZAR_ADMIN_KEY_FILE, or AZAR_ADMIN_KEY).
 * Every call, reads included, is written to admin_audit with the X-Admin-Actor it came with.
 */

const DAY = 24 * 60 * 60 * 1000
const DELETE_GRACE_DAYS = 30
const STATUSES = ['active', 'locked', 'deactivated']

function adminKey() {
  try {
    // on the VPS: systemd LoadCredential=eyvan-admin.key:/root/kss-secrets/eyvan-admin.key (the service user cannot read /root)
    const file =
      process.env.AZAR_ADMIN_KEY_FILE ||
      (process.env.CREDENTIALS_DIRECTORY ? `${process.env.CREDENTIALS_DIRECTORY}/eyvan-admin.key` : '')
    if (file) return fs.readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
  return (process.env.AZAR_ADMIN_KEY || '').trim()
}

function fail(res, status, code, message) {
  res.status(status).json({ error: code, message })
}

function sameSecret(a, b) {
  const x = crypto.createHash('sha256').update(a).digest()
  const y = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(x, y)
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function guard(req, res, next) {
  const key = adminKey()
  const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const local = LOOPBACK.has(req.socket.remoteAddress) && !req.get('x-forwarded-for')
  if (!key || key.length < 32 || !local || !given || !sameSecret(given, key)) {
    return fail(res, 401, 'unauthorized', 'Admin access only.')
  }
  const actor = String(req.get('x-admin-actor') || '').trim().slice(0, 80)
  if (!actor) return fail(res, 400, 'actor_required', 'Send X-Admin-Actor.')
  req.actor = actor
  next()
}

const auditInsert = db.prepare('INSERT INTO admin_audit (id, at, actor, action, user_id, detail) VALUES (?, ?, ?, ?, ?, ?)')
function audit(req, action, userId = null, detail = null) {
  auditInsert.run(crypto.randomUUID(), new Date().toISOString(), req.actor, action, userId, detail ? String(detail).slice(0, 500) : null)
}

/** the accounts the panel shows: not the bootstrap seed, not tombstones */
const LIVE = "id != 'bootstrap-seed-user' AND deleted_at IS NULL"

function settingsOf(accountId) {
  const rows = db
    .prepare("SELECT row_key FROM sync_rows WHERE account_id = ? AND tbl = 'application_settings'")
    .all(accountId)
  if (rows.length === 0) return {}
  const out = {}
  for (const r of sync.rowsOf(accountId)) {
    if (r.table === 'application_settings') out[r.key] = r.row?.value ?? null
  }
  return out
}

function countsOf(accountId) {
  const by = Object.fromEntries(
    db
      .prepare('SELECT tbl, COUNT(*) AS n FROM sync_rows WHERE account_id = ? GROUP BY tbl')
      .all(accountId)
      .map((r) => [r.tbl, r.n])
  )
  return {
    properties: by.properties ?? 0,
    applicants: by.applicants ?? 0,
    contracts: by.contracts ?? 0,
    deals: by.deals ?? 0,
    photos: by.photos ?? 0
  }
}

async function licenceView(user) {
  const licence = await licenceOf(user)
  const paidUntil = db.prepare('SELECT paid_until FROM licences WHERE user_id = ?').get(user.id)?.paid_until ?? null
  return { state: licence?.state ?? null, endsAt: licence?.endsAt ?? null, paidUntil }
}

function tokensView(accountId, s) {
  return s ? tokens.summaryOf(accountId, s) : null
}

async function summaryRow(user, s) {
  const profile = settingsOf(user.id)
  const t = tokensView(user.id, s)
  return {
    id: user.id,
    phone: shownPhone(user),
    name: profile.display_name ?? null,
    agency: profile.agency_name ?? null,
    referralCode: user.referral_code,
    status: user.admin_status,
    archivedAt: user.archived_at ?? null,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at ?? null,
    tokens: t ? { balance: t.balance, allowance: t.allowance, spent: t.spent } : null,
    licence: await licenceView(user),
    counts: countsOf(user.id)
  }
}

/** an archived account keeps its number aside (phone_number = archived:<id>) */
function shownPhone(user) {
  return user.admin_status === 'archived' ? user.archived_phone : user.phone_number
}

/** Amin #5216: the archived accounts on this account's number, for «حساب قبلی بایگانی‌شده» */
function archivesFor(user) {
  if (user.admin_status === 'archived') return []
  return db
    .prepare(
      `SELECT id, archived_at, created_at FROM users WHERE admin_status = 'archived' AND archived_phone = ? AND ${LIVE}
       ORDER BY archived_at DESC`
    )
    .all(user.phone_number)
    .map((a) => ({ id: a.id, archivedAt: a.archived_at, createdAt: a.created_at, counts: countsOf(a.id) }))
}

function findUser(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ? AND ${LIVE}`).get(id)
}

const router = express.Router()
router.use(guard)
router.use(express.json({ limit: '16kb' }))

// GET /admin/users?q=&status=&page=&pageSize=
router.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const status = String(req.query.status || '')
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50))
    const where = [LIVE]
    const args = []
    if (STATUSES.includes(status) || status === 'deleted' || status === 'archived') {
      where.push('admin_status = ?')
      args.push(status)
    } else if (status !== 'all') {
      where.push("admin_status != 'deleted'")
    }
    if (q) {
      const digits = q.replace(/\D/g, '').replace(/^(98|0098)/, '0')
      where.push('(phone_number LIKE ? OR archived_phone LIKE ? OR referral_code = ?)')
      args.push(`%${digits || q}%`, `%${digits || q}%`, q.toUpperCase())
    }
    const sql = `FROM users WHERE ${where.join(' AND ')}`
    const total = db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...args).n
    const users = db
      .prepare(`SELECT * ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...args, pageSize, (page - 1) * pageSize)
    const s = await tokens.settings()
    const rows = []
    for (const u of users) rows.push(await summaryRow(u, s))
    audit(req, 'read', null, `list q=${q} status=${status} page=${page}`)
    res.json({ total, page, pageSize, users: rows })
  } catch (error) {
    next(error)
  }
})

// GET /admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = findUser(req.params.id)
    if (!user) return fail(res, 404, 'not_found', 'No such account.')
    const s = await tokens.settings()
    const profile = settingsOf(user.id)
    const photoHash = typeof profile.profile_photo === 'string' ? profile.profile_photo.replace(/^blob:/, '') : ''
    const photo = photoHash ? sync.blobOf(user.id, photoHash) : null
    const person = (id) => {
      const u = db.prepare('SELECT id, phone_number, deleted_at, admin_status, created_at FROM users WHERE id = ?').get(id)
      if (!u) return null
      return {
        id: u.id,
        phone: u.deleted_at ? null : u.phone_number,
        name: u.deleted_at ? null : settingsOf(u.id).display_name ?? null,
        status: u.deleted_at ? 'removed' : u.admin_status
      }
    }
    const referrerId = db
      .prepare('SELECT referrer_user_id FROM referral_relationships WHERE referred_user_id = ?')
      .get(user.id)?.referrer_user_id
    const referees = db
      .prepare('SELECT referred_user_id, created_at FROM referral_relationships WHERE referrer_user_id = ? ORDER BY created_at DESC')
      .all(user.id)
      .map((r) => ({ ...person(r.referred_user_id), joinedAt: r.created_at }))
    const t = tokensView(user.id, s)
    audit(req, 'read', user.id, 'detail')
    res.json({
      id: user.id,
      phone: shownPhone(user),
      name: profile.display_name ?? null,
      agency: profile.agency_name ?? null,
      archivedAt: user.archived_at ?? null,
      archivedAccounts: archivesFor(user),
      photo: photo ? `data:image/webp;base64,${photo.toString('base64')}` : null,
      referralCode: user.referral_code,
      usedReferralCode: user.used_referral_code ?? null,
      referredBy: referrerId && referrerId !== 'bootstrap-seed-user' ? person(referrerId) : null,
      referees,
      status: user.admin_status,
      statusChangedAt: user.admin_status_at ?? null,
      deleteAfter: user.delete_after ?? null,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at ?? null,
      lastSeenAt: null,
      activeMinutes: null,
      tokens: t ? { ...t, granted: t.earnedBy.granted } : null,
      licence: await licenceView(user),
      wallet: null,
      counts: countsOf(user.id),
      storageBytes: sync.usageOf(user.id).bytes,
      phoneChanges: db
        .prepare('SELECT old_phone AS old, new_phone AS new, changed_at AS at FROM phone_changes WHERE user_id = ? ORDER BY changed_at DESC')
        .all(user.id)
    })
  } catch (error) {
    next(error)
  }
})

// GET /admin/users/:id/tokens?page=
router.get('/users/:id/tokens', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  const page = Math.max(1, Number(req.query.page) || 1)
  const total = db.prepare("SELECT COUNT(*) AS n FROM token_ledger WHERE account_id = ? AND amount != 0").get(user.id).n
  const lines = db
    .prepare('SELECT at, reason, amount, ref FROM token_ledger WHERE account_id = ? AND amount != 0 ORDER BY at DESC LIMIT 50 OFFSET ?')
    .all(user.id, (page - 1) * 50)
  audit(req, 'read', user.id, `tokens page=${page}`)
  res.json({ total, page, lines })
})

// POST /admin/users/:id/tokens/grant { amount, note }  (Idempotency-Key header)
router.post('/users/:id/tokens/grant', async (req, res, next) => {
  try {
    const user = findUser(req.params.id)
    if (!user) return fail(res, 404, 'not_found', 'No such account.')
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return fail(res, 422, 'invalid_amount', 'amount must be > 0 and <= 100000.')
    }
    const note = String(req.body?.note || '').slice(0, 300)
    const idem = String(req.get('idempotency-key') || crypto.randomUUID()).slice(0, 100)
    tokens.post(user.id, 'admin_grant', amount, `admin_grant:${user.id}:${idem}`, note || null)
    audit(req, 'grant', user.id, `${amount} ${note}`)
    const s = await tokens.settings()
    res.json({ tokens: tokensView(user.id, s) })
  } catch (error) {
    next(error)
  }
})

// POST /admin/users/:id/licence/extend { days, note }
router.post('/users/:id/licence/extend', async (req, res, next) => {
  try {
    const user = findUser(req.params.id)
    if (!user) return fail(res, 404, 'not_found', 'No such account.')
    const days = Number(req.body?.days)
    if (!Number.isInteger(days) || days < 1 || days > 3660) return fail(res, 422, 'invalid_days', 'days must be 1…3660.')
    const now = Date.now()
    const current = db.prepare('SELECT paid_until FROM licences WHERE user_id = ?').get(user.id)?.paid_until
    const from = Math.max(now, current ? Date.parse(current) : 0)
    const until = new Date(from + days * DAY).toISOString()
    db.prepare(
      `INSERT INTO licences (user_id, paid_until, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET paid_until = excluded.paid_until, updated_at = excluded.updated_at`
    ).run(user.id, until, new Date(now).toISOString())
    audit(req, 'extend', user.id, `${days}d ${String(req.body?.note || '').slice(0, 300)}`)
    res.json({ licence: await licenceView(findUser(user.id)) })
  } catch (error) {
    next(error)
  }
})

// POST /admin/users/:id/status { status: active|locked|deactivated, note }
router.post('/users/:id/status', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  const status = String(req.body?.status || '')
  if (!STATUSES.includes(status)) return fail(res, 422, 'invalid_status', 'status must be active, locked or deactivated.')
  if (user.admin_status === 'deleted') return fail(res, 409, 'deleted', 'Restore the account first.')
  if (user.admin_status === 'archived') return fail(res, 409, 'archived', 'Unarchive or attach the account first.')
  db.transaction(() => {
    db.prepare('UPDATE users SET admin_status = ?, admin_status_at = ?, delete_after = NULL WHERE id = ?').run(
      status,
      new Date().toISOString(),
      user.id
    )
    if (status === 'locked') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  })()
  audit(req, 'status', user.id, `${user.admin_status}→${status} ${String(req.body?.note || '').slice(0, 300)}`)
  res.json({ status })
})

// POST /admin/users/:id/delete { note }: soft delete, restorable for 30 days, then purged (see purgeDue)
router.post('/users/:id/delete', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  if (user.admin_status === 'archived') return fail(res, 409, 'archived', 'Unarchive the account first.')
  const now = Date.now()
  const deleteAfter = new Date(now + DELETE_GRACE_DAYS * DAY).toISOString()
  db.transaction(() => {
    db.prepare("UPDATE users SET admin_status = 'deleted', admin_status_at = ?, delete_after = ? WHERE id = ?").run(
      new Date(now).toISOString(),
      deleteAfter,
      user.id
    )
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  })()
  audit(req, 'delete', user.id, String(req.body?.note || '').slice(0, 300))
  res.json({ status: 'deleted', deleteAfter })
})

// POST /admin/users/:id/restore
router.post('/users/:id/restore', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  if (user.admin_status !== 'deleted') return fail(res, 409, 'not_deleted', 'The account is not deleted.')
  db.prepare("UPDATE users SET admin_status = 'active', admin_status_at = ?, delete_after = NULL WHERE id = ?").run(
    new Date().toISOString(),
    user.id
  )
  audit(req, 'restore', user.id, String(req.body?.note || '').slice(0, 300))
  res.json({ status: 'active' })
})

// GET /admin/users/:id/export → zip
router.get('/users/:id/export', (req, res, next) => {
  try {
    const user = findUser(req.params.id)
    if (!user) return fail(res, 404, 'not_found', 'No such account.')
    const { buffer, counts } = buildExport(user.id)
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    audit(req, 'export', user.id, JSON.stringify(counts))
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="eyvan-${user.phone_number}-${day}.zip"`)
    res.send(buffer)
  } catch (error) {
    next(error)
  }
})

// POST /admin/users/:id/archive { note }  — Amin #5216 «حذف موقت»
// The account and its files stay (never purged); its number is freed, so the next sign-in with that number is a new,
// empty account like any newcomer's. Later KSS decides: attach the old files to it, or unarchive.
router.post('/users/:id/archive', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  if (user.admin_status === 'archived' || user.admin_status === 'deleted') {
    return fail(res, 409, user.admin_status, `The account is ${user.admin_status}.`)
  }
  const at = new Date().toISOString()
  db.transaction(() => {
    db.prepare(
      `UPDATE users SET archived_phone = phone_number, phone_number = ?, admin_status = 'archived', admin_status_at = ?,
       archived_at = ?, delete_after = NULL WHERE id = ?`
    ).run(`archived:${user.id}`, at, at, user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
    db.prepare('DELETE FROM invites WHERE referrer_user_id = ?').run(user.id)
  })()
  audit(req, 'archive', user.id, String(req.body?.note || '').slice(0, 300))
  res.json({ status: 'archived', archivedAt: at })
})

// POST /admin/users/:id/unarchive { note }: back to active on its number, only while no other account uses that number
router.post('/users/:id/unarchive', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return fail(res, 404, 'not_found', 'No such account.')
  if (user.admin_status !== 'archived') return fail(res, 409, 'not_archived', 'The account is not archived.')
  if (db.prepare('SELECT 1 FROM users WHERE phone_number = ?').get(user.archived_phone)) {
    return fail(res, 409, 'phone_in_use', 'A new account uses this number; attach instead.')
  }
  db.prepare(
    `UPDATE users SET phone_number = archived_phone, archived_phone = NULL, archived_at = NULL, admin_status = 'active',
     admin_status_at = ? WHERE id = ?`
  ).run(new Date().toISOString(), user.id)
  audit(req, 'unarchive', user.id, String(req.body?.note || '').slice(0, 300))
  res.json({ status: 'active' })
})

// POST /admin/users/:id/attach { targetId, note }: the archived account :id joins the new account on the same number.
// Files, photos, token lines, the later paid licence and the people it invited move; where both hold the same record,
// the new account's copy stays. The archived account then becomes a tombstone, so the referral chain stays whole.
// The phone shows the attached files after its next sign-in.
router.post('/users/:id/attach', (req, res) => {
  const from = findUser(req.params.id)
  const to = findUser(String(req.body?.targetId || ''))
  if (!from || !to) return fail(res, 404, 'not_found', 'No such account.')
  if (from.admin_status !== 'archived') return fail(res, 409, 'not_archived', 'Only an archived account can be attached.')
  if (to.admin_status === 'archived' || to.admin_status === 'deleted') {
    return fail(res, 409, 'bad_target', 'The target must be a live account.')
  }
  if (to.phone_number !== from.archived_phone) return fail(res, 422, 'phone_mismatch', 'The target must use the archived number.')
  const now = new Date().toISOString()
  let result
  db.transaction(() => {
    result = sync.moveAccountData(from.id, to.id)
    // token lines: all but the model marker, under new keys so nothing collides
    const insertLine = db.prepare(
      'INSERT OR IGNORE INTO token_ledger (id, account_id, at, reason, amount, ref, idem_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (const l of db.prepare("SELECT * FROM token_ledger WHERE account_id = ? AND reason != 'allowance'").all(from.id)) {
      insertLine.run(crypto.randomUUID(), to.id, l.at, l.reason, l.amount, l.ref, `attached:${from.id}:${l.idem_key}`)
    }
    // licence: the later paid date wins
    const paid = (id) => db.prepare('SELECT paid_until FROM licences WHERE user_id = ?').get(id)?.paid_until ?? null
    const old = paid(from.id)
    const current = paid(to.id)
    if (old && (!current || Date.parse(old) > Date.parse(current))) {
      db.prepare(
        `INSERT INTO licences (user_id, paid_until, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET paid_until = excluded.paid_until, updated_at = excluded.updated_at`
      ).run(to.id, old, now)
    }
    // the people the old account invited now count for the new one
    db.prepare('UPDATE referral_relationships SET referrer_user_id = ? WHERE referrer_user_id = ? AND referred_user_id != ?').run(
      to.id,
      from.id,
      to.id
    )
    db.prepare("UPDATE users SET phone_number = ?, deleted_at = ?, admin_status = 'merged', admin_status_at = ? WHERE id = ?").run(
      `deleted:${from.id}`,
      now,
      now,
      from.id
    )
    db.prepare('DELETE FROM licences WHERE user_id = ?').run(from.id)
    db.prepare('DELETE FROM phone_changes WHERE user_id = ?').run(from.id)
    sync.deleteAccountData(from.id)
  })()
  audit(req, 'attach', to.id, `from ${from.id}: ${result.moved} moved, ${result.kept} kept. ${String(req.body?.note || '').slice(0, 200)}`)
  res.json({ targetId: to.id, moved: result.moved, kept: result.kept })
})

// GET /admin/backups
router.get('/backups', (req, res) => {
  const runs = db.prepare('SELECT date, users, bytes, drive, at FROM admin_backups ORDER BY date DESC LIMIT 60').all()
  audit(req, 'read', null, 'backups')
  res.json({ runs })
})

// GET /admin/audit?userId=&page=
router.get('/audit', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const userId = req.query.userId ? String(req.query.userId) : null
  const rows = db
    .prepare(
      `SELECT at, actor, action, user_id AS userId, detail FROM admin_audit ${userId ? 'WHERE user_id = ?' : ''}
       ORDER BY at DESC LIMIT 50 OFFSET ?`
    )
    .all(...(userId ? [userId] : []), (page - 1) * 50)
  res.json({ page, rows })
})

db.exec(`CREATE TABLE IF NOT EXISTS admin_backups (
  date TEXT PRIMARY KEY, users INTEGER NOT NULL, bytes INTEGER NOT NULL, drive TEXT NOT NULL, at TEXT NOT NULL
)`)

/**
 * The nightly job: accounts soft-deleted more than 30 days ago become tombstones, exactly as an in-app account delete
 * (number, sessions, invites, number history, licence and files go; the referral chain stays). Returns the ids.
 */
function purgeDue(now = Date.now()) {
  const due = db
    .prepare(`SELECT * FROM users WHERE admin_status = 'deleted' AND delete_after IS NOT NULL AND delete_after <= ? AND ${LIVE}`)
    .all(new Date(now).toISOString())
  for (const user of due) {
    db.transaction(() => {
      db.prepare('UPDATE users SET phone_number = ?, deleted_at = ? WHERE id = ?').run(
        `deleted:${user.id}`,
        new Date(now).toISOString(),
        user.id
      )
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
      db.prepare('DELETE FROM invites WHERE referrer_user_id = ?').run(user.id)
      db.prepare('DELETE FROM phone_changes WHERE user_id = ?').run(user.id)
      db.prepare('DELETE FROM licences WHERE user_id = ?').run(user.id)
      sync.deleteAccountData(user.id)
    })()
    auditInsert.run(crypto.randomUUID(), new Date(now).toISOString(), 'nightly', 'purge', user.id, null)
  }
  return due.map((u) => u.id)
}

module.exports = { router, purgeDue }
