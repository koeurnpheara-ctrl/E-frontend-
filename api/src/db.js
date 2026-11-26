import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
export const pool = new Pool({
  host: process.env.DB_HOST || 'database',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'form_field',
  user: process.env.DB_USER || 'form_field',
  password: process.env.DB_PASSWORD,
})

export async function initializeDatabase() {
  const schemaPath = new URL('../schema.sql', import.meta.url)
  const schema = await readFile(fileURLToPath(schemaPath), 'utf8')
  await pool.query(schema)
}
