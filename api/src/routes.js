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
const orderStatuses = new Set(['pending', 'confirmed', 'delivered', 'cancelled'])

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

function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Order details must be provided as a JSON object.' }
  }
  const customer = body.customer
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    return { error: 'Delivery details are required.' }
  }

  const name = typeof customer.name === 'string' ? customer.name.trim() : ''
  const phone = typeof customer.phone === 'string' ? customer.phone.trim() : ''
  const address = typeof customer.address === 'string' ? customer.address.trim() : ''
  const province = typeof customer.province === 'string' ? customer.province.trim() : ''
  const notes = typeof customer.notes === 'string' ? customer.notes.trim() : ''

  if (name.length < 2 || name.length > 150) return { error: 'Enter your name (up to 150 characters).' }
  if (!/^[+0-9()\-\s]+$/.test(phone) || phone.replace(/\D/g, '').length < 8 || phone.replace(/\D/g, '').length > 15) {
    return { error: 'Enter a valid phone number so we can confirm delivery.' }
  }
  if (!address || address.length > 500) return { error: 'Enter a delivery address (up to 500 characters).' }
  if (province.length < 2 || province.length > 100) return { error: 'Enter a province or city.' }
  if (notes.length > 1000) return { error: 'Delivery notes must be 1000 characters or fewer.' }
  if (body.payment_method !== 'cash_on_delivery') {
    return { error: 'Only cash on delivery is available right now.' }
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    return { error: 'Your order must contain between 1 and 50 different products.' }
  }

  const seenProductIds = new Set()
  const items = []
  for (const item of body.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: 'One or more order items are invalid.' }
    }
    const productId = String(item.product_id ?? '')
    const quantity = item.quantity
    const price = Number(item.unit_price)
    if (!/^[1-9]\d{0,17}$/.test(productId)) return { error: 'One or more product IDs are invalid.' }
    if (seenProductIds.has(productId)) return { error: 'Each product may only appear once in the order.' }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { error: 'Product quantity must be between 1 and 20.' }
    }
    if (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(String(item.unit_price))) {
      return { error: 'One or more product prices are invalid. Please refresh your cart.' }
    }
    seenProductIds.add(productId)
    items.push({ product_id: productId, quantity, unit_price: price })
  }

  return {
    value: {
      customer: { name, phone, address, province, notes },
      items,
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

router.post('/orders', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many order attempts. Please wait and try again.' },
}), asyncHandler(async (request, response) => {
  const parsed = validateOrder(request.body)
  if (parsed.error) return response.status(400).json({ error: parsed.error })

  const client = await pool.connect()
  let transactionStarted = false
  try {
    await client.query('BEGIN')
    transactionStarted = true
    const productIds = parsed.value.items.map((item) => item.product_id)
    const productResult = await client.query(
      'SELECT id, name, price FROM products WHERE id = ANY($1::bigint[])',
      [productIds],
    )
    const productsById = new Map(productResult.rows.map((product) => [String(product.id), product]))
    if (productsById.size !== parsed.value.items.length) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return response.status(409).json({ error: 'A product in your cart is no longer available. Please refresh the shop.' })
    }

    const orderItems = parsed.value.items.map((item) => {
      const product = productsById.get(item.product_id)
      const unitPriceCents = Math.round(Number(product.price) * 100)
      if (unitPriceCents !== Math.round(item.unit_price * 100)) {
        return { error: true }
      }
      return {
        product_id: item.product_id,
        product_name: product.name,
        unit_price_cents: unitPriceCents,
        quantity: item.quantity,
        line_total_cents: unitPriceCents * item.quantity,
      }
    })
    if (orderItems.some((item) => item.error)) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return response.status(409).json({ error: 'A product price changed. Refresh your cart before placing the order.' })
    }

    const subtotalCents = orderItems.reduce((sum, item) => sum + item.line_total_cents, 0)
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 9999999999) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return response.status(400).json({ error: 'The order total is too large.' })
    }

    const { name, phone, address, province, notes } = parsed.value.customer
    const orderResult = await client.query(
      `INSERT INTO orders
        (customer_name, customer_phone, shipping_address, shipping_province, customer_notes, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, payment_method, subtotal, shipping_fee, created_at`,
      [name, phone, address, province, notes, (subtotalCents / 100).toFixed(2)],
    )
    const order = orderResult.rows[0]
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.product_id,
          item.product_name,
          (item.unit_price_cents / 100).toFixed(2),
          item.quantity,
          (item.line_total_cents / 100).toFixed(2),
        ],
      )
    }
    await client.query('COMMIT')
    transactionStarted = false
    return response.status(201).json({ data: order })
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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

router.get('/admin/orders', requireAdmin, asyncHandler(async (request, response) => {
  const result = await pool.query(
    `SELECT
       orders.id, orders.customer_name, orders.customer_phone, orders.shipping_address,
       orders.shipping_province, orders.customer_notes, orders.payment_method, orders.status,
       orders.subtotal, orders.shipping_fee, orders.created_at,
       COALESCE(
         json_agg(json_build_object(
           'product_name', order_items.product_name,
           'unit_price', order_items.unit_price,
           'quantity', order_items.quantity,
           'line_total', order_items.line_total
         ) ORDER BY order_items.id) FILTER (WHERE order_items.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders
     LEFT JOIN order_items ON order_items.order_id = orders.id
     GROUP BY orders.id
     ORDER BY orders.created_at DESC
     LIMIT 100`,
  )
  return response.json({ data: result.rows })
}))

router.patch('/admin/orders/:id/status', requireAdmin, asyncHandler(async (request, response) => {
  if (!/^[1-9]\d{0,17}$/.test(request.params.id)) {
    return response.status(400).json({ error: 'Order ID is invalid.' })
  }
  if (!orderStatuses.has(request.body?.status)) {
    return response.status(400).json({ error: 'Choose a valid order status.' })
  }
  const result = await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
    [request.body.status, request.params.id],
  )
  if (!result.rowCount) return response.status(404).json({ error: 'Order not found.' })
  return response.json({ data: result.rows[0] })
}))

export default router
