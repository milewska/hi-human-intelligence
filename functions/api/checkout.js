/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session after verifying inventory.
 *
 * Expects JSON body: { priceId, productId, quantity }
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

  const { priceId, productId, quantity = 1 } = data;

  if (!priceId || !productId) {
    return jsonResponse({ error: 'priceId and productId are required' }, 400);
  }

  // ── Shipping rate IDs ──
  const SHIPPING_US   = 'shr_1T6nrmE3DWgyVvjlWV227UEc';  // $10 flat US
  const SHIPPING_INTL = 'shr_1T6nrsE3DWgyVvjlmOq4A3ch';  // $20 flat International
  const SHIPPING_FREE = 'shr_1T6nrxE3DWgyVvjll4ERVMhQ';  // Free shipping (orders $50+)

  // ── Check inventory ──
  const productRes = await fetch(
    `https://api.stripe.com/v1/products/${encodeURIComponent(productId)}`,
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
  );
  const product = await productRes.json();

  if (product.error) {
    return jsonResponse({ error: product.error.message }, 400);
  }

  const inventory = parseInt(product.metadata?.inventory ?? '0', 10);

  if (inventory < quantity) {
    return jsonResponse(
      { error: 'out_of_stock', message: `Only ${inventory} left in stock` },
      400
    );
  }

  // ── Create Checkout Session ──
  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', String(quantity));
  params.append('mode', 'payment');
  params.append('success_url', `${DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${DOMAIN}/shop.html`);
  params.append('metadata[product_id]', productId);
  params.append('metadata[quantity]', String(quantity));
  // ── Shipping address collection — open to more countries ──
  const allowedCountries = [
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'JP',
    'SE', 'NO', 'DK', 'FI', 'IE', 'NZ', 'AT', 'CH', 'BE', 'PT'
  ];
  allowedCountries.forEach((c) => {
    params.append('shipping_address_collection[allowed_countries][]', c);
  });

  // ── Shipping options — free shipping for orders over $50 ──
  // Fetch price to determine order total
  const priceRes = await fetch(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`,
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
  );
  const priceObj = await priceRes.json();
  const unitAmount = priceObj.unit_amount || 0;
  const orderTotal = unitAmount * quantity; // in cents

  if (orderTotal >= 5000) {
    // Order >= $50: offer only free shipping
    params.append('shipping_options[0][shipping_rate]', SHIPPING_FREE);
  } else {
    // Under $50: offer US + International paid rates
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
