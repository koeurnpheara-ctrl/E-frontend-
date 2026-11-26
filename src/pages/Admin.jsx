import React, { useCallback, useEffect, useState } from 'react'
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  loginAdmin,
  updateProduct,
} from '../services/api.js'
import './Admin.css'

const TOKEN_KEY = 'form-field-admin-token'
const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  image_url: '',
  image_alt: '',
  category: '',
  is_new: false,
}

function getErrorMessage(error) {
  return error.response?.data?.error || error.message || 'Something went wrong. Please try again.'
}

function AdminLogin({ onLogin, message }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(getErrorMessage(loginError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <a className="brand admin-brand" href="/" aria-label="Form and Field home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          <span>form <span className="brand-amp">&</span> field</span>
        </a>
        <p className="eyebrow">Store administration</p>
        <h1>Welcome back</h1>
        <p className="admin-login-copy">Sign in with your configured administrator account.</p>
        {(error || message) && <p className="admin-alert" role="alert">{error || message}</p>}
        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="admin-button admin-button-primary admin-login-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="admin-back-link" href="/">Back to storefront</a>
      </form>
    </main>
  )
}

function ProductForm({ product, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(product)

  useEffect(() => {
    setForm(product)
  }, [product])

  function changeField(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit({ ...form, price: Number(form.price) })
  }

  return (
    <form className="admin-product-form" onSubmit={submit}>
      <div className="admin-form-heading">
        <div>
          <p className="eyebrow">{product.id ? 'Product details' : 'New listing'}</p>
          <h2>{product.id ? 'Edit product' : 'Add a product'}</h2>
        </div>
        {product.id && <button className="admin-icon-button" type="button" onClick={onCancel} aria-label="Close editor"><i className="bi bi-x-lg" /></button>}
      </div>
      <label className="admin-field">
        <span>Name <b aria-hidden="true">*</b></span>
        <input name="name" required maxLength="200" value={form.name} onChange={changeField} />
      </label>
      <label className="admin-field">
        <span>Description</span>
        <textarea name="description" rows="3" maxLength="5000" value={form.description} onChange={changeField} />
      </label>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Price (USD) <b aria-hidden="true">*</b></span>
          <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={changeField} />
        </label>
        <label className="admin-field">
          <span>Collection</span>
          <input name="category" maxLength="100" value={form.category} onChange={changeField} />
        </label>
      </div>
      <label className="admin-field">
        <span>Image URL</span>
        <input name="image_url" type="url" maxLength="2048" value={form.image_url} onChange={changeField} />
      </label>
      <label className="admin-field">
        <span>Image description</span>
        <input name="image_alt" maxLength="300" value={form.image_alt} onChange={changeField} />
      </label>
      <label className="admin-checkbox">
        <input name="is_new" type="checkbox" checked={form.is_new} onChange={changeField} />
        <span>Show “Just in” badge</span>
      </label>
      <div className="admin-form-actions">
        {product.id && <button className="admin-button admin-button-quiet" type="button" onClick={onCancel}>Cancel</button>}
        <button className="admin-button admin-button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : product.id ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  )
}

export default function Admin() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(Boolean(token))
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProducts(await getAdminProducts(token))
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY)
        setToken('')
      }
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) loadProducts()
  }, [loadProducts, token])

  async function handleLogin(email, password) {
    const result = await loginAdmin(email, password)
    window.localStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setProducts([])
    setEditingProduct(null)
    setError('')
  }

  async function handleSave(product) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (editingProduct?.id) {
        await updateProduct(token, editingProduct.id, product)
        setNotice('Product updated.')
      } else {
        await createProduct(token, product)
        setNotice('Product created.')
      }
      setEditingProduct(null)
      await loadProducts()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return
    setDeletingId(product.id)
    setError('')
    setNotice('')
    try {
      await deleteProduct(token, product.id)
      setProducts((current) => current.filter((item) => item.id !== product.id))
      if (editingProduct?.id === product.id) setEditingProduct(null)
      setNotice('Product deleted.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setDeletingId(null)
    }
  }

  if (!token) return <AdminLogin onLogin={handleLogin} message={error} />

  const normalizedSearch = search.trim().toLowerCase()
  const filteredProducts = products.filter((product) =>
    [product.name, product.category, product.description]
      .some((value) => String(value || '').toLowerCase().includes(normalizedSearch)),
  )

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="brand admin-brand" href="/" aria-label="Form and Field storefront">
          <span className="brand-mark" aria-hidden="true">f.</span>
          <span>form <span className="brand-amp">&</span> field</span>
          <span className="admin-brand-label">ADMIN</span>
        </a>
        <div className="admin-topbar-actions">
          <a className="admin-store-link" href="/"><i className="bi bi-arrow-up-right" /> View storefront</a>
          <button className="admin-button admin-button-quiet" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>
      <div className="admin-content">
        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">Your store</p>
            <h1>Product dashboard</h1>
            <p>Manage the products shown in your storefront.</p>
          </div>
          <button className="admin-button admin-button-primary" type="button" onClick={() => setEditingProduct({ ...EMPTY_PRODUCT })}>
            <i className="bi bi-plus-lg" /> Add product
          </button>
        </div>
        <section className="admin-stats" aria-label="Store overview">
          <div className="admin-stat-card"><span>Products</span><strong>{loading ? '—' : products.length}</strong></div>
          <div className="admin-stat-card"><span>Collections</span><strong>{loading ? '—' : new Set(products.map((product) => product.category).filter(Boolean)).size}</strong></div>
          <div className="admin-stat-card"><span>New arrivals</span><strong>{loading ? '—' : products.filter((product) => product.is_new).length}</strong></div>
        </section>
        {error && <div className="admin-alert admin-alert-row" role="alert"><span>{error}</span><button type="button" onClick={loadProducts}>Try again</button></div>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="admin-layout">
          <section className="admin-products-panel">
            <div className="admin-products-heading">
              <div>
                <p className="eyebrow">Catalog</p>
                <h2>All products <span>{products.length}</span></h2>
              </div>
              <label className="admin-search">
                <i className="bi bi-search" aria-hidden="true" />
                <input aria-label="Search products" placeholder="Search products…" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            {loading ? (
              <div className="admin-loading"><span className="spinner-border spinner-border-sm" role="status" /> Loading products…</div>
            ) : filteredProducts.length ? (
              <div className="admin-table-scroll">
                <table className="admin-product-table">
                  <thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="admin-table-product">
                            {product.image_url ? <img src={product.image_url} alt="" /> : <span className="admin-table-image-placeholder"><i className="bi bi-image" /></span>}
                            <span><strong>{product.name}</strong><small>{product.description || 'No description'}</small></span>
                          </div>
                        </td>
                        <td>{product.category || '—'}</td>
                        <td>${Number(product.price).toFixed(2)}</td>
                        <td><span className={`admin-status ${product.is_new ? 'is-new' : ''}`}>{product.is_new ? 'New' : 'Active'}</span></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="admin-icon-button" type="button" aria-label={`Edit ${product.name}`} onClick={() => setEditingProduct({ ...product, price: String(product.price) })}><i className="bi bi-pencil" /></button>
                            <button className="admin-icon-button admin-delete-button" type="button" aria-label={`Delete ${product.name}`} disabled={deletingId === product.id} onClick={() => handleDelete(product)}><i className="bi bi-trash3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <i className="bi bi-box-seam" aria-hidden="true" />
                <h3>{normalizedSearch ? 'No matching products' : 'Your catalog is empty'}</h3>
                <p>{normalizedSearch ? 'Try another search term.' : 'Add your first product to get started.'}</p>
              </div>
            )}
          </section>
          {editingProduct && (
            <ProductForm
              key={editingProduct.id || 'new-product'}
              product={editingProduct}
              saving={saving}
              onCancel={() => setEditingProduct(null)}
              onSubmit={handleSave}
            />
          )}
        </div>
      </div>
    </main>
  )
}
