const express = require('express')
const cors = require('cors')
const authRoutes = require('./authRoutes')
const invites = require('./inviteRoutes')
const phone = require('./phoneRoutes')
const sync = require('./syncRoutes')

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
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/auth', authRoutes)
app.use('/auth', invites.api)
app.use('/auth', phone.router)
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
