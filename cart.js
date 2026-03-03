/* ─── Cart (localStorage) ───
   Shared cart utilities.  Include on every page after nav.js:
   <script src="cart.js" defer></script>
   (or <script src="../cart.js" defer></script> from subdirs)
*/
const HI_CART = (function () {
  const KEY = 'hi_cart';

  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function _write(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    _dispatchUpdate(cart);
  }
  function _dispatchUpdate(cart) {
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
  }

  /** Add an item (or increment qty if same priceId already in cart) */
  function add(item) {
    // item: { priceId, productId, name, color, size, print, price, qty, image }
    const cart = _read();
    const existing = cart.find(i => i.priceId === item.priceId);
    if (existing) {
      existing.qty += (item.qty || 1);
    } else {
      cart.push({ ...item, qty: item.qty || 1 });
    }
    _write(cart);
    return cart;
  }

  /** Update qty for a specific priceId. If qty <= 0, removes the item. */
  function updateQty(priceId, qty) {
    let cart = _read();
    if (qty <= 0) {
      cart = cart.filter(i => i.priceId !== priceId);
    } else {
      const item = cart.find(i => i.priceId === priceId);
      if (item) item.qty = qty;
    }
    _write(cart);
    return cart;
  }

  /** Remove an item entirely */
  function remove(priceId) {
    return updateQty(priceId, 0);
  }

  /** Get current cart array */
  function get() { return _read(); }

  /** Total number of items (sum of qty) */
  function count() {
    return _read().reduce((s, i) => s + i.qty, 0);
  }

  /** Subtotal in dollars */
  function subtotal() {
    return _read().reduce((s, i) => s + i.price * i.qty, 0);
  }

  /** Empty the cart */
  function clear() { _write([]); }

  return { add, updateQty, remove, get, count, subtotal, clear };
})();

/* ─── Badge updater ───
   Listens for cart-updated events and updates the nav badge.
   Runs once on load to set initial count.
*/
(function () {
  function updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const n = HI_CART.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  function updateCheckoutBtn() {
    const btn = document.getElementById('checkout-btn');
    if (!btn) return;
    btn.style.display = HI_CART.count() > 0 ? 'inline-block' : 'none';
  }

  window.addEventListener('cart-updated', () => { updateBadge(); updateCheckoutBtn(); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { updateBadge(); updateCheckoutBtn(); });
  } else {
    updateBadge();
    updateCheckoutBtn();
  }
})();
