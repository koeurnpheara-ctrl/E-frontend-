import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { Accept: 'application/json' },
})

const productsEndpoint = import.meta.env.VITE_PRODUCTS_ENDPOINT || '/products'
const categoriesEndpoint = import.meta.env.VITE_CATEGORIES_ENDPOINT || '/categories'

function getCollection(payload, key) {
  const collection = payload?.data ?? payload?.[key] ?? payload
  return Array.isArray(collection) ? collection : []
}

export async function getProducts() {
  const response = await api.get(productsEndpoint)
  return getCollection(response.data, 'products')
}

export async function getCategories() {
  const response = await api.get(categoriesEndpoint)
  return getCollection(response.data, 'categories')
}

function adminConfig(token) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

export async function loginAdmin(email, password) {
  const response = await api.post('/admin/login', { email, password })
  return response.data
}

export async function getAdminProducts(token) {
  const response = await api.get('/admin/products', adminConfig(token))
  return getCollection(response.data, 'products')
}

export async function createProduct(token, product) {
  const response = await api.post('/admin/products', product, adminConfig(token))
  return response.data.data
}

export async function updateProduct(token, id, product) {
  const response = await api.put(`/admin/products/${id}`, product, adminConfig(token))
  return response.data.data
}

export async function deleteProduct(token, id) {
  await api.delete(`/admin/products/${id}`, adminConfig(token))
}
