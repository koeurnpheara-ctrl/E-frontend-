import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CART_STORAGE_KEY = 'form-field-cart'
const CartContext = createContext(null)

function readStoredCart() {
  const savedCart = window.localStorage.getItem(CART_STORAGE_KEY)
  if (!savedCart) return []

  const parsedCart = JSON.parse(savedCart)
  if (!Array.isArray(parsedCart)) throw new Error('Saved cart data is invalid.')

  return parsedCart.filter((item) =>
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(Number(item.price)) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 20,
  )
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return readStoredCart()
    } catch {
      return []
    }
  })
  const [lastAddedId, setLastAddedId] = useState('')

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(product) {
    if (product.id == null || !product.name || !Number.isFinite(Number(product.price))) return
    const id = String(product.id)
    setItems((current) => {
      const existing = current.find((item) => item.id === id)
      if (existing) {
        return current.map((item) => (
          item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item
        ))
      }
      return [...current, {
        id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url || '',
        quantity: 1,
      }]
    })
    setLastAddedId(id)
  }

  function setQuantity(id, quantity) {
    const nextQuantity = Number(quantity)
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 20) return
    setItems((current) => current.map((item) => (
      item.id === String(id) ? { ...item, quantity: nextQuantity } : item
    )))
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== String(id)))
  }

  function clearCart() {
    setItems([])
    setLastAddedId('')
  }

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + Number(item.price) * item.quantity, 0),
    lastAddedId,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }), [items, lastAddedId])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider.')
  return context
}
