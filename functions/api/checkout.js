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
  params.append('shipping_address_collection[allowed_countries][]', 'US');
  params.append('shipping_address_collection[allowed_countries][]', 'CA');

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
