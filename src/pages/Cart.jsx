import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useCart } from '../contexts/CartContext.jsx'
import { createOrder } from '../services/api.js'

const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  address: '',
  province: '',
  notes: '',
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price))
}

function errorMessage(error) {
  return error.response?.data?.error || 'We could not place your order. Please try again.'
}

export default function Cart() {
  const { items, itemCount, subtotal, setQuantity, removeItem, clearCart } = useCart()
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  function changeCustomer(event) {
    const { name, value } = event.target
    setCustomer((current) => ({ ...current, [name]: value }))
  }

  async function submitOrder(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const placedOrder = await createOrder({
        customer,
        payment_method: 'cash_on_delivery',
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      })
      setOrder(placedOrder)
      clearCart()
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="cart-page">
        <div className="container">
          {order ? (
            <section className="cart-confirmation">
              <span className="cart-confirmation-icon"><i className="bi bi-check2" /></span>
              <p className="eyebrow">Order received</p>
              <h1>Thank you for your order.</h1>
              <p>Your order number is <strong>#{order.id}</strong>. We’ll contact you to confirm delivery and the delivery fee.</p>
              <div className="cart-confirmation-total">
                <span>Items subtotal</span>
                <strong>{formatPrice(order.subtotal)}</strong>
              </div>
              <p className="cart-payment-note">Pay cash when your order arrives. Delivery fee is confirmed separately.</p>
              <Link className="button-primary" to="/">Continue shopping</Link>
            </section>
          ) : (
            <>
              <div className="cart-heading">
                <div>
                  <p className="eyebrow">Your selection</p>
                  <h1>Your shopping bag <span>{itemCount}</span></h1>
                </div>
                <Link className="text-link" to="/#shop">Continue shopping <i className="bi bi-arrow-right" /></Link>
              </div>
              {!items.length ? (
                <section className="cart-empty">
                  <i className="bi bi-bag" aria-hidden="true" />
                  <h2>Your bag is waiting.</h2>
                  <p>Discover something thoughtful for your everyday.</p>
                  <Link className="button-primary" to="/#shop">Shop products <i className="bi bi-arrow-right" /></Link>
                </section>
              ) : (
                <div className="cart-layout">
                  <section className="cart-items-panel" aria-label="Items in your shopping bag">
                    {items.map((item) => (
                      <article className="cart-item" key={item.id}>
                        {item.image_url ? (
                          <img className="cart-item-image" src={item.image_url} alt="" />
                        ) : (
                          <span className="cart-item-placeholder"><i className="bi bi-image" /></span>
                        )}
                        <div className="cart-item-details">
                          <h2>{item.name}</h2>
                          <p>{formatPrice(item.price)}</p>
                          <div className="cart-item-actions">
                            <div className="cart-quantity">
                              <button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button>
                              <span aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span>
                              <button type="button" aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= 20} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button>
                            </div>
                            <button className="cart-remove" type="button" onClick={() => removeItem(item.id)}>Remove</button>
                          </div>
                        </div>
                        <strong className="cart-line-total">{formatPrice(item.price * item.quantity)}</strong>
                      </article>
                    ))}
                    <div className="cart-subtotal-row">
                      <span>Items subtotal</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    <p className="cart-shipping-note">Delivery is available across Cambodia. We’ll confirm the delivery fee with you before dispatch.</p>
                  </section>

                  <form className="checkout-panel" onSubmit={submitOrder}>
                    <p className="eyebrow">Cash on delivery</p>
                    <h2>Delivery details</h2>
                    <p className="checkout-intro">We’ll contact you to confirm your order and delivery fee.</p>
                    {error && <p className="cart-error" role="alert">{error}</p>}
                    <label className="checkout-field">
                      <span>Full name <b aria-hidden="true">*</b></span>
                      <input name="name" autoComplete="name" maxLength="150" required value={customer.name} onChange={changeCustomer} />
                    </label>
                    <label className="checkout-field">
                      <span>Phone number <b aria-hidden="true">*</b></span>
                      <input name="phone" type="tel" autoComplete="tel" maxLength="30" required value={customer.phone} onChange={changeCustomer} />
                    </label>
                    <label className="checkout-field">
                      <span>Street address <b aria-hidden="true">*</b></span>
                      <textarea name="address" autoComplete="street-address" rows="2" maxLength="500" required value={customer.address} onChange={changeCustomer} />
                    </label>
                    <label className="checkout-field">
                      <span>Province / city <b aria-hidden="true">*</b></span>
                      <input name="province" autoComplete="address-level1" maxLength="100" required value={customer.province} onChange={changeCustomer} />
                    </label>
                    <label className="checkout-field">
                      <span>Delivery notes <small>(optional)</small></span>
                      <textarea name="notes" rows="2" maxLength="1000" value={customer.notes} onChange={changeCustomer} />
                    </label>
                    <div className="checkout-total">
                      <span>Items subtotal</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    <p className="checkout-payment-note">Shipping fee is not included and will be confirmed with you. Pay cash when your order arrives.</p>
                    <button className="button-primary checkout-submit" type="submit" disabled={submitting || !items.length}>
                      {submitting ? 'Placing order…' : 'Place order'} <i className="bi bi-arrow-right" />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
