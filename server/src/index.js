const express = require('express')
const cors = require('cors')
const authRoutes = require('./authRoutes')

const PORT = Number(process.env.PORT) || 8787

const app = express()
app.use(cors())
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/auth', authRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } })
})

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } })
})

app.listen(PORT, () => {
  console.log(`AZAR auth server listening on port ${PORT}`)
})
