/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session after verifying inventory.
 *
 * Expects JSON body: { items: [{ priceId, productId, quantity }, ...] }
 * Env vars: STRIPE_SECRET_KEY, DOMAIN
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const STRIPE_KEY = env.STRIPE_SECRET_KEY;
  const DOMAIN = env.DOMAIN || 'https://humintelligence.org';

  if (!STRIPE_KEY) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Support legacy single-item format AND new cart format
  let items;
  if (data.items && Array.isArray(data.items)) {
    items = data.items;
  } else if (data.priceId && data.productId) {
    items = [{ priceId: data.priceId, productId: data.productId, quantity: data.quantity || 1 }];
  } else {
    return jsonResponse({ error: 'items array is required' }, 400);
  }

  if (items.length === 0) {
    return jsonResponse({ error: 'Cart is empty' }, 400);
  }

  // ── Shipping rate IDs ──
  const SHIPPING_US   = 'shr_1T6nrmE3DWgyVvjlWV227UEc';  // $10 flat US
  const SHIPPING_INTL = 'shr_1T6nrsE3DWgyVvjlmOq4A3ch';  // $20 flat International
  const SHIPPING_FREE = 'shr_1T6nrxE3DWgyVvjll4ERVMhQ';  // Free shipping (orders $50+)

  // ── Check inventory for every item ──
  let orderTotal = 0; // in cents

  for (const item of items) {
    if (!item.priceId || !item.productId) {
      return jsonResponse({ error: 'Each item needs priceId and productId' }, 400);
    }

    const productRes = await fetch(
      `https://api.stripe.com/v1/products/${encodeURIComponent(item.productId)}`,
      { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
    );
    const product = await productRes.json();

    if (product.error) {
      return jsonResponse({ error: product.error.message }, 400);
    }

    const inventory = parseInt(product.metadata?.inventory ?? '0', 10);
    const qty = item.quantity || 1;

    if (inventory < qty) {
      const name = product.name || item.productId;
      return jsonResponse(
        { error: 'out_of_stock', message: `"${name}" — only ${inventory} left in stock` },
        400
      );
    }

    // Fetch price to accumulate order total
    const priceRes = await fetch(
      `https://api.stripe.com/v1/prices/${encodeURIComponent(item.priceId)}`,
      { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
    );
    const priceObj = await priceRes.json();
    orderTotal += (priceObj.unit_amount || 0) * qty;
  }

  // ── Create Checkout Session ──
  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');

  // Add all line items
  items.forEach((item, i) => {
    params.append(`line_items[${i}][price]`, item.priceId);
    params.append(`line_items[${i}][quantity]`, String(item.quantity || 1));
  });

  params.append('mode', 'payment');
  params.append('success_url', `${DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${DOMAIN}/shop.html`);

  // Store item info in metadata (first 500 chars to stay within Stripe limits)
  const metaItems = items.map(i => `${i.productId}:${i.quantity}`).join(',');
  params.append('metadata[items]', metaItems.slice(0, 500));

  // ── Shipping address collection ──
  const allowedCountries = [
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'JP',
    'SE', 'NO', 'DK', 'FI', 'IE', 'NZ', 'AT', 'CH', 'BE', 'PT'
  ];
  allowedCountries.forEach((c) => {
    params.append('shipping_address_collection[allowed_countries][]', c);
  });

  // ── Shipping options — free for orders >= $50 ──
  if (orderTotal >= 5000) {
    params.append('shipping_options[0][shipping_rate]', SHIPPING_FREE);
  } else {
    params.append('shipping_options[0][shipping_rate]', SHIPPING_US);
    params.append('shipping_options[1][shipping_rate]', SHIPPING_INTL);
  }

  const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await sessionRes.json();

  if (session.error) {
    return jsonResponse({ error: session.error.message }, 400);
  }

  return jsonResponse({ url: session.url });
}

/* ── Helpers ── */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
