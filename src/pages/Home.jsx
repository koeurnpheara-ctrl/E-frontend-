import React from 'react'
import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getCategories, getProducts } from '../services/api.js'

const categoryImages = [
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=720&q=85',
  'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=720&q=85',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=720&q=85',
  'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=720&q=85',
]

function CategorySection({ categories, loading, error }) {
  return (
    <section className="section-space category-section" id="categories">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Find your new favorite</p>
            <h2>Shop by collection</h2>
          </div>
          <a className="text-link" href="#shop">Explore everything <i className="bi bi-arrow-right" /></a>
        </div>
        {loading ? (
          <div className="loading-state"><span className="spinner-border spinner-border-sm" role="status" /> Loading collections…</div>
        ) : error ? (
          <p className="inline-error" role="alert">{error}</p>
        ) : categories.length ? (
          <div className="row g-3 g-lg-4">
            {categories.slice(0, 4).map((category, index) => {
              const name = category.name || category.title || 'Collection'
              const image = category.image_url || category.image || category.thumbnail || categoryImages[index % categoryImages.length]
              return (
                <div className="col-6 col-lg-3" key={category.id ?? name}>
                  <a className="category-card" href="#shop">
                    <img src={image} alt="" loading="lazy" />
                    <span className="category-overlay" />
                    <span className="category-name">{name}<i className="bi bi-arrow-up-right" /></span>
                  </a>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">No collections are available right now.</p>
        )}
      </div>
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [categoriesError, setCategoriesError] = useState('')

  useEffect(() => {
    let active = true

    getProducts()
      .then((items) => { if (active) setProducts(items) })
      .catch(() => { if (active) setProductsError('We couldn’t load products. Please check your connection and try again.') })
      .finally(() => { if (active) setProductsLoading(false) })

    getCategories()
      .then((items) => { if (active) setCategories(items) })
      .catch(() => { if (active) setCategoriesError('We couldn’t load collections. Please check your connection and try again.') })
      .finally(() => { if (active) setCategoriesLoading(false) })

    return () => { active = false }
  }, [])

  async function retryProducts() {
    setProductsLoading(true)
    setProductsError('')
    try {
      setProducts(await getProducts())
    } catch {
      setProductsError('We couldn’t load products. Please check your connection and try again.')
    } finally {
      setProductsLoading(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-section" id="story">
          <div className="container hero-content">
            <p className="eyebrow hero-eyebrow">Live a little more intentionally</p>
            <h1>Make room for<br /><em>the good things.</em></h1>
            <p className="hero-copy">Everyday pieces, thoughtfully made.<br className="d-none d-md-block" /> Designed to bring a little more meaning to the everyday.</p>
            <a className="button-primary" href="#shop">Discover the collection <i className="bi bi-arrow-right" /></a>
          </div>
          <span className="hero-caption">Objects for the everyday ritual</span>
        </section>

        <CategorySection categories={categories} loading={categoriesLoading} error={categoriesError} />

        <section className="section-space featured-section" id="shop">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">A few things we love</p>
                <h2>Considered favorites</h2>
              </div>
              <a className="text-link" href="#shop">Shop all products <i className="bi bi-arrow-right" /></a>
            </div>
            {productsLoading ? (
              <div className="loading-state"><span className="spinner-border spinner-border-sm" role="status" /> Finding your favorites…</div>
            ) : productsError ? (
              <div className="error-state" role="alert">
                <p>{productsError}</p>
                <button className="button-outline" type="button" onClick={retryProducts}>Try again</button>
              </div>
            ) : products.length ? (
              <div className="row g-3 g-md-4">
                {products.slice(0, 4).map((product, index) => (
                  <div className="col-6 col-lg-3" key={product.id ?? `${product.name ?? 'product'}-${index}`}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">There are no products to show right now.</p>
            )}
          </div>
        </section>

        <section className="story-banner">
          <div className="container story-banner-inner">
            <p className="eyebrow">Less, but better</p>
            <h2>Made to be kept.<br /><em>Made to be lived with.</em></h2>
            <a className="text-link" href="#categories">Get to know our collections <i className="bi bi-arrow-right" /></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
