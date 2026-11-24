import React from 'react'
import { useEffect, useState } from 'react'

function formatPrice(price) {
  if (price == null || price === '') return null
  const amount = Number(price)
  if (!Number.isFinite(amount)) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function ProductCard({ product }) {
  const name = product.name || product.title || 'Product'
  const image = [product.image_url, product.image, product.thumbnail]
    .find((candidate) => typeof candidate === 'string' && candidate.trim())
  const price = formatPrice(product.price)
  const category = typeof product.category === 'string' ? product.category : product.category?.name
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [image])

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {image && !imageError ? (
          <img
            className="product-image"
            src={image}
            alt={product.image_alt || name}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="product-image-placeholder" role="img" aria-label={`${name} image unavailable`}>
            <i className="bi bi-image" aria-hidden="true" />
          </div>
        )}
        {product.is_new && <span className="product-badge">Just in</span>}
      </div>
      <div className="product-meta">
        <div>
          {category && <p className="product-category">{category}</p>}
          <h3 className="product-name">{name}</h3>
          {product.description && <p className="product-description">{product.description}</p>}
        </div>
        {price && <span className="product-price">{price}</span>}
      </div>
    </article>
  )
}
