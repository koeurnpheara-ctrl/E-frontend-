import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
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
