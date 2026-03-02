/**
 * POST /webhook
 * Stripe webhook handler — decrements inventory on successful checkout.
 *
 * Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional but recommended)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const STRIPE_KEY = env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET || '';

  const payload = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';

  let event;

  // ── Verify signature if webhook secret is set ──
  if (WEBHOOK_SECRET) {
    const verified = await verifyStripeSignature(payload, sigHeader, WEBHOOK_SECRET);
    if (!verified) {
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }
  }

  try {
    event = JSON.parse(payload);
  } catch {
    return jsonResponse({ error: 'Invalid payload' }, 400);
  }

  // ── Handle checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const productId = session.metadata?.product_id;
    const quantity = parseInt(session.metadata?.quantity || '1', 10);

    if (productId) {
      try {
        // Fetch current inventory
        const productRes = await fetch(
          `https://api.stripe.com/v1/products/${encodeURIComponent(productId)}`,
          { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
        );
        const product = await productRes.json();
        const currentInventory = parseInt(product.metadata?.inventory ?? '0', 10);
        const newInventory = Math.max(0, currentInventory - quantity);

        // Update inventory
        const updateParams = new URLSearchParams();
        updateParams.append('metadata[inventory]', String(newInventory));

        await fetch(
          `https://api.stripe.com/v1/products/${encodeURIComponent(productId)}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${STRIPE_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: updateParams.toString(),
          }
        );

        console.log(`Inventory updated: ${product.name} | ${currentInventory} → ${newInventory}`);
      } catch (err) {
        console.error(`Error updating inventory for ${productId}:`, err);
      }
    }
  }

  return jsonResponse({ received: true });
}

/* ── Stripe Signature Verification (Web Crypto API) ── */
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    for (const item of sigHeader.split(',')) {
      const [key, ...rest] = item.split('=');
      parts[key.trim()] = rest.join('=');
    }

    const timestamp = parts['t'];
    const signature = parts['v1'];

    if (!timestamp || !signature) return false;

    // Reject if timestamp is more than 5 minutes old
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signedPayload)
    );

    const expectedSig = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSig === signature;
  } catch {
    return false;
  }
}

/* ── Helpers ── */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
