import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { initializeDatabase, pool } from './db.js'
import routes from './routes.js'

const requiredEnvironment = ['DB_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET']
for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`${name} must be configured.`)
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters long.')
}
if (process.env.DB_PASSWORD.length < 16) {
  throw new Error('DB_PASSWORD must be at least 16 characters long.')
}
if (['DB_PASSWORD', 'ADMIN_PASSWORD', 'JWT_SECRET'].some((name) =>
  process.env[name].toLowerCase().startsWith('replace-with-'))) {
  throw new Error('Replace the example secrets in .env before starting the API.')
}
if (Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes long.')
}
const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error('ADMIN_EMAIL must be a valid email address.')
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '100kb' }))
app.get('/api/healthz', (request, response) => response.json({ status: 'ok' }))
app.use('/api', routes)
app.use((error, request, response, next) => {
  console.error(error)
  if (response.headersSent) return next(error)
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'Request body must contain valid JSON.' })
  }
  return response.status(500).json({ error: 'An unexpected server error occurred.' })
})

async function start() {
  await initializeDatabase()
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
  await pool.query(
    `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [adminEmail, passwordHash],
  )

  const port = Number(process.env.PORT || 8000)
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on port ${port}`)
  })
}

start().catch(async (error) => {
  console.error('API startup failed:', error)
  await pool.end()
  process.exitCode = 1
})
