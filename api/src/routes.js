import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

const router = Router()
const jwtSecret = process.env.JWT_SECRET

const productColumns = `
  id, name, description, price, image_url, image_alt, category, is_new,
  created_at, updated_at
`

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next)
  }
}

function requireAdmin(request, response, next) {
  const authorization = request.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ error: 'Sign in to continue.' })
  }

  try {
    const claims = jwt.verify(token, jwtSecret)
    if (claims.role !== 'admin' || typeof claims.sub !== 'string') {
      return response.status(401).json({ error: 'Your session is invalid. Sign in again.' })
    }
    request.adminEmail = claims.sub
    return next()
  } catch {
    return response.status(401).json({ error: 'Your session has expired. Sign in again.' })
  }
}

function validateProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Product details must be provided as a JSON object.' }
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  const imageAlt = typeof body.image_alt === 'string' ? body.image_alt.trim() : ''
  const price = Number(body.price)

  if (!name || name.length > 200) return { error: 'Product name is required and must be 200 characters or fewer.' }
  if (description.length > 5000) return { error: 'Description must be 5000 characters or fewer.' }
  if (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(String(body.price))) {
    return { error: 'Enter a valid price with no more than two decimal places.' }
  }
  if (category.length > 100) return { error: 'Collection must be 100 characters or fewer.' }
  if (imageAlt.length > 300) return { error: 'Image description must be 300 characters or fewer.' }
  if (imageUrl && imageUrl.length > 2048) return { error: 'Image URL must be 2048 characters or fewer.' }
  if (imageUrl) {
    try {
      const parsedUrl = new URL(imageUrl)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid image URL')
    } catch {
      return { error: 'Image URL must be a valid HTTP or HTTPS URL.' }
    }
  }
  if (typeof body.is_new !== 'boolean') return { error: 'New-arrival status must be true or false.' }

  return {
    value: {
      name,
      description,
      price: price.toFixed(2),
      image_url: imageUrl,
      image_alt: imageAlt,
      category,
      is_new: body.is_new,
    },
  }
}

router.post('/admin/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}), asyncHandler(async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = typeof request.body.password === 'string' ? request.body.password : ''
  const result = await pool.query('SELECT email, password_hash FROM admins WHERE email = $1', [email])
  const admin = result.rows[0]
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return response.status(401).json({ error: 'Email or password is incorrect.' })
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, { subject: admin.email, expiresIn: '8h' })
  return response.json({ token, email: admin.email })
}))

router.get('/products', asyncHandler(async (request, response) => {
  const result = await pool.query(`SELECT ${productColumns} FROM products ORDER BY created_at DESC, id DESC`)
  return response.json({ data: result.rows })
}))

router.get('/categories', asyncHandler(async (request, response) => {
  const result = await pool.query(
    "SELECT DISTINCT category AS name FROM products WHERE category <> '' ORDER BY category",
  )
  return response.json({ data: result.rows })
}))

router.get('/admin/products', requireAdmin, asyncHandler(async (request, response) => {
  const result = await pool.query(`SELECT ${productColumns} FROM products ORDER BY created_at DESC, id DESC`)
  return response.json({ data: result.rows })
}))

router.post('/admin/products', requireAdmin, asyncHandler(async (request, response) => {
  const parsed = validateProduct(request.body)
  if (parsed.error) return response.status(400).json({ error: parsed.error })
  const { name, description, price, image_url, image_alt, category, is_new } = parsed.value
  const result = await pool.query(
    `INSERT INTO products (name, description, price, image_url, image_alt, category, is_new)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${productColumns}`,
    [name, description, price, image_url, image_alt, category, is_new],
  )
  return response.status(201).json({ data: result.rows[0] })
}))

router.put('/admin/products/:id', requireAdmin, asyncHandler(async (request, response) => {
  if (!/^[1-9]\d*$/.test(request.params.id)) {
    return response.status(400).json({ error: 'Product ID is invalid.' })
  }
  const parsed = validateProduct(request.body)
  if (parsed.error) return response.status(400).json({ error: parsed.error })
  const { name, description, price, image_url, image_alt, category, is_new } = parsed.value
  const result = await pool.query(
    `UPDATE products
     SET name = $1, description = $2, price = $3, image_url = $4, image_alt = $5,
         category = $6, is_new = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING ${productColumns}`,
    [name, description, price, image_url, image_alt, category, is_new, request.params.id],
  )
  if (!result.rowCount) return response.status(404).json({ error: 'Product not found.' })
  return response.json({ data: result.rows[0] })
}))

router.delete('/admin/products/:id', requireAdmin, asyncHandler(async (request, response) => {
  if (!/^[1-9]\d*$/.test(request.params.id)) {
    return response.status(400).json({ error: 'Product ID is invalid.' })
  }
  const result = await pool.query('DELETE FROM products WHERE id = $1', [request.params.id])
  if (!result.rowCount) return response.status(404).json({ error: 'Product not found.' })
  return response.status(204).end()
}))

export default router
