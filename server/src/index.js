const express = require('express')
const cors = require('cors')
const authRoutes = require('./authRoutes')
const invites = require('./inviteRoutes')
const phone = require('./phoneRoutes')
const sync = require('./syncRoutes')
const licence = require('./licenceRoutes')
const tokens = require('./tokens')
const admin = require('./adminRoutes')
const purchases = require('./purchaseRoutes')
const announcements = require('./announcements')
const presence = require('./presence')
const divar = require('./divar')
const office = require('./officeRoutes')

const PORT = Number(process.env.PORT) || 8787
// Explicit, not left to Node's default — nginx on the VPS host proxies to
// this port *inside* the container's own network namespace, which only
// reaches a process bound to all interfaces, not just loopback.
const HOST = process.env.HOST || '0.0.0.0'

const app = express()
// KSS (Amin #4113): served by the VPS host's nginx on 127.0.0.1, so the client address comes from X-Forwarded-For
// and each phone gets its own rate limit (otherwise every request shares nginx's address).
app.set('trust proxy', 'loopback')
app.use(cors())
// AZAR-SYNC-001: mounted before the small global body limit; it parses its own larger bodies
app.use('/sync', sync.router)
// Amin #5245: token purchases (before the JSON parser: billing's paid notice is checked on its raw, signed body)
app.use('/tokens', purchases.router)
app.use(purchases.bankReturn)
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/auth', authRoutes)
app.use('/auth', invites.api)
app.use('/auth', phone.router)
app.use('/licence', licence.router)
app.use('/tokens', tokens.router)
// Navid 2026-10-27: «ورود آگهی از دیوار» (one shared post → a new file to check and save)
app.use('/divar', divar.router)
// Amin #5197: the billing panel's admin API — same machine + admin key only (adminRoutes.js); nginx never forwards /admin
app.use('/admin', admin.router)
// Amin #5370: KSS announcements in the app's «اعلان‌ها»
app.use('/announcements', announcements.router)
// Amin #5454: the app's «I am open» every 2 minutes (who is online, in billing)
app.use('/presence', presence.router)
// Amin #5659/#5913/#5934: the real-estate office dashboard (manager on the web, advisers in the app)
app.use('/office', office.router)
app.use(invites.page)

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } })
})

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } })
})

app.listen(PORT, HOST, () => {
  console.log(`AZAR auth server listening on ${HOST}:${PORT}`)
})
