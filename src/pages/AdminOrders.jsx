import React, { useCallback, useEffect, useState } from 'react'
import { getAdminOrders, updateOrderStatus } from '../services/api.js'

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price))
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export default function AdminOrders({ token }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await getAdminOrders(token))
    } catch (loadError) {
      setError(loadError.response?.data?.error || loadError.message || 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  async function changeStatus(orderId, status) {
    setUpdatingId(orderId)
    setError('')
    try {
      await updateOrderStatus(token, orderId, status)
      setOrders((current) => current.map((order) => (
        order.id === orderId ? { ...order, status } : order
      )))
    } catch (updateError) {
      setError(updateError.response?.data?.error || updateError.message || 'Could not update order status.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <section className="admin-orders-panel">
      <div className="admin-orders-heading">
        <div>
          <p className="eyebrow">Fulfilment</p>
          <h2>Customer orders <span>{orders.length}</span></h2>
        </div>
        <button className="admin-button admin-button-quiet" type="button" onClick={loadOrders} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>
      {error && <p className="admin-alert admin-orders-error" role="alert">{error}</p>}
      {loading ? (
        <div className="admin-loading"><span className="spinner-border spinner-border-sm" role="status" /> Loading orders…</div>
      ) : orders.length ? (
        <div className="admin-orders-list">
          {orders.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <div className="admin-order-top">
                <div>
                  <strong>Order #{order.id}</strong>
                  <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                </div>
                <label className="admin-order-status">
                  <span className="visually-hidden">Status for order {order.id}</span>
                  <select value={order.status} disabled={updatingId === order.id} onChange={(event) => changeStatus(order.id, event.target.value)}>
                    {ORDER_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="admin-order-body">
                <div>
                  <h3>{order.customer_name}</h3>
                  <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                  <p>{order.shipping_address}<br />{order.shipping_province}, Cambodia</p>
                  {order.customer_notes && <p className="admin-order-notes">Note: {order.customer_notes}</p>}
                </div>
                <div className="admin-order-products">
                  {order.items.map((item, index) => (
                    <p key={`${order.id}-${index}`}>
                      <span>{item.quantity} × {item.product_name}</span>
                      <strong>{formatPrice(item.line_total)}</strong>
                    </p>
                  ))}
                  <div className="admin-order-total">
                    <span>Items subtotal</span>
                    <strong>{formatPrice(order.subtotal)}</strong>
                  </div>
                  <small>Cash on delivery · Delivery fee to confirm</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <i className="bi bi-receipt" aria-hidden="true" />
          <h3>No orders yet</h3>
          <p>Customer orders will appear here.</p>
        </div>
      )}
    </section>
  )
}
